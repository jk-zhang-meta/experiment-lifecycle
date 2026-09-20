import asyncio
import unittest

from api_governor import ApiError, ApiGovernor


class Clock:
    def __init__(self): self.now = 0.0
    def __call__(self): return self.now
    async def sleep(self, seconds):
        await asyncio.sleep(0)
        self.now += seconds


class ApiGovernorTests(unittest.IsolatedAsyncioTestCase):
    async def test_max_slots(self):
        gate = asyncio.Event(); running = 0; peak = 0
        governor = ApiGovernor(2, rpm=20, tpm=1000)
        async def op():
            nonlocal running, peak
            running += 1; peak = max(peak, running)
            await gate.wait(); running -= 1
        tasks = [asyncio.create_task(governor.run(op, input_tokens=1, max_output_tokens=1)) for _ in range(4)]
        await asyncio.sleep(0.01); self.assertEqual(peak, 2)
        gate.set(); await asyncio.gather(*tasks)

    async def test_sliding_rpm_and_tpm_reservations(self):
        clock = Clock(); governor = ApiGovernor(5, rpm=2, tpm=5, clock=clock, sleep=clock.sleep)
        async def op(): return "ok"
        await governor.run(op, input_tokens=2, max_output_tokens=0)
        await governor.run(op, input_tokens=2, max_output_tokens=0)
        await governor.run(op, input_tokens=1, max_output_tokens=0)
        self.assertEqual(clock.now, 60.0)
        self.assertEqual(governor.snapshot()["reserved_requests"], 1)

    async def test_retry_classification_and_replay_safety(self):
        governor = ApiGovernor(1, rpm=10, tpm=100, max_attempts=2)
        calls = 0
        async def transient():
            nonlocal calls; calls += 1; raise ApiError(500)
        with self.assertRaises(ApiError):
            await governor.run(transient, input_tokens=1, max_output_tokens=1)
        self.assertEqual(calls, 1)
        async def permanent(): raise ApiError(400)
        with self.assertRaises(ApiError):
            await governor.run(permanent, input_tokens=1, max_output_tokens=1, replay_safe=True)

    async def test_retry_is_bounded_and_429_cools_down_once_then_recovers(self):
        clock = Clock(); governor = ApiGovernor(4, rpm=20, tpm=100, max_attempts=2, recovery_successes=1,
                                                 clock=clock, sleep=clock.sleep, random_fn=lambda: 0)
        attempts = 0
        async def overloaded():
            nonlocal attempts; attempts += 1; raise ApiError(429, retry_after=2)
        with self.assertRaises(ApiError):
            await governor.run(overloaded, input_tokens=1, max_output_tokens=1, replay_safe=True)
        self.assertEqual(attempts, 2); self.assertEqual(governor.snapshot()["allowed_concurrency"], 1)
        async def ok(): return 1
        await governor.run(ok, input_tokens=1, max_output_tokens=1)
        self.assertEqual(governor.snapshot()["allowed_concurrency"], 2)

    async def test_concurrent_429_wave_decreases_once(self):
        clock = Clock(); governor = ApiGovernor(4, rpm=20, tpm=100, max_attempts=2, recovery_successes=99,
                                                 clock=clock, sleep=clock.sleep, random_fn=lambda: 0)
        ready = 0; release = asyncio.Event(); attempts = [0, 0]
        async def op(index):
            nonlocal ready
            attempts[index] += 1
            if attempts[index] == 1:
                ready += 1
                if ready == 2: release.set()
                await release.wait()
                raise ApiError(429, retry_after=2)
            return index
        self.assertEqual(await asyncio.gather(*(governor.run(lambda i=i: op(i), input_tokens=1,
                                                              max_output_tokens=1, replay_safe=True)
                                                for i in range(2))), [0, 1])
        self.assertEqual(governor.snapshot()["allowed_concurrency"], 2)

    async def test_cancellation_releases_slot(self):
        governor = ApiGovernor(1, rpm=10, tpm=100)
        started = asyncio.Event()
        async def stuck():
            started.set(); await asyncio.Event().wait()
        task = asyncio.create_task(governor.run(stuck, input_tokens=1, max_output_tokens=1))
        await started.wait(); task.cancel()
        with self.assertRaises(asyncio.CancelledError): await task
        self.assertEqual(governor.snapshot()["in_flight"], 0)

    async def test_slot_wait_honors_overall_deadline(self):
        governor = ApiGovernor(1, rpm=10, tpm=100)
        entered = asyncio.Event(); hold = asyncio.Event()
        async def stuck():
            entered.set(); await hold.wait()
        first = asyncio.create_task(governor.run(stuck, input_tokens=1, max_output_tokens=1))
        await entered.wait()
        with self.assertRaises(TimeoutError):
            await governor.run(lambda: asyncio.sleep(0), input_tokens=1, max_output_tokens=1, deadline=0.02)
        first.cancel()
        with self.assertRaises(asyncio.CancelledError): await first

    async def test_terminal_429_and_503_share_cooldown_with_safe_metadata(self):
        clock = Clock(); events = []
        governor = ApiGovernor(4, rpm=20, tpm=100, clock=clock, sleep=clock.sleep)
        async def too_many(): raise ApiError(429, retry_after=2)
        with self.assertRaises(ApiError):
            await governor.run(too_many, input_tokens=1, max_output_tokens=1, on_event=events.append)
        overload = events[0]
        self.assertEqual((overload["kind"], overload["old_limit"], overload["new_limit"],
                          overload["cooldown_reason"]), ("overload", 4, 2, "retry_after"))
        async def unavailable(): raise ApiError(503, retry_after=3)
        with self.assertRaises(ApiError):
            await governor.run(unavailable, input_tokens=1, max_output_tokens=1)
        self.assertEqual(governor.snapshot()["allowed_concurrency"], 2)
        self.assertEqual(governor.snapshot()["cooldown_until"], 5.0)

    def test_explicit_zero_recovery_successes_is_invalid(self):
        with self.assertRaises(ValueError):
            ApiGovernor(1, rpm=1, tpm=1, recovery_successes=0)


if __name__ == "__main__":
    unittest.main()
