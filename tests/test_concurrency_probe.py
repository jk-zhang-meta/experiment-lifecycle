import asyncio
import unittest

from concurrency_probe import Measurement, probe_concurrency


class ConcurrencyProbeTests(unittest.IsolatedAsyncioTestCase):
    async def test_starts_at_ceiling_and_selects_faster_lower_concurrency(self):
        seen = []

        async def measure(concurrency):
            seen.append(concurrency)
            elapsed = {8: 4, 4: 1, 2: 2, 1: 2}[concurrency]
            return Measurement("w", 100, elapsed, 100, capacity_ok=True)

        result = await probe_concurrency(8, measure, max_trials=4, deadline_seconds=1)
        self.assertEqual(seen, [8, 4, 2, 1])
        self.assertEqual(result.selected, 4)
        self.assertEqual(result.coverage, tuple(seen))

    async def test_capacity_failure_backoffs_and_is_recorded(self):
        async def measure(concurrency):
            if concurrency > 2:
                return Measurement("w", 0, 1, 10, capacity_ok=False, error="overloaded")
            return Measurement("w", 10, 1 if concurrency == 2 else 2, 10, capacity_ok=True)

        result = await probe_concurrency(8, measure, max_trials=4, deadline_seconds=1)
        self.assertEqual(result.selected, 2)
        self.assertFalse(result.observations[0].measurement.capacity_ok)

    async def test_trial_budget_is_bounded(self):
        seen = []

        async def measure(concurrency):
            seen.append(concurrency)
            return Measurement("w", 1, 1, 1, capacity_ok=True)

        result = await probe_concurrency(32, measure, max_trials=2, deadline_seconds=1)
        self.assertEqual(seen, [32, 16])
        self.assertEqual(result.reason, "trial_budget_exhausted")

    async def test_mismatched_workload_is_rejected(self):
        async def measure(concurrency):
            return Measurement(str(concurrency), 1, 1, 1, capacity_ok=True)

        with self.assertRaises(ValueError):
            await probe_concurrency(2, measure, max_trials=2, deadline_seconds=1)

    async def test_deadline_returns_partial_observations(self):
        async def measure(concurrency):
            await asyncio.sleep(.05)
            return Measurement("w", 1, 1, 1, capacity_ok=True)

        result = await probe_concurrency(4, measure, max_trials=4, deadline_seconds=.01)
        self.assertIsNone(result.selected)
        self.assertEqual(result.reason, "deadline_exceeded")

    async def test_incomplete_candidate_is_recorded_but_cannot_win(self):
        async def measure(concurrency):
            if concurrency == 4:
                return Measurement("w", 3, 1, 4, capacity_ok=True)
            return Measurement("w", 4, 1, 4, capacity_ok=True)

        result = await probe_concurrency(4, measure, max_trials=2, deadline_seconds=1)
        self.assertEqual(result.selected, 2)
        self.assertIsNone(result.observations[0].throughput)

    async def test_unknown_capacity_is_not_valid(self):
        async def measure(concurrency):
            return Measurement("w", 4, 1, 4, capacity_ok=None)

        result = await probe_concurrency(2, measure, max_trials=2, deadline_seconds=1)
        self.assertIsNone(result.selected)
        self.assertEqual(result.reason, "no_valid_useful_measurement")

    async def test_callback_timeout_is_propagated(self):
        async def measure(concurrency):
            raise TimeoutError("provider timeout")

        with self.assertRaisesRegex(TimeoutError, "provider timeout"):
            await probe_concurrency(2, measure, max_trials=2, deadline_seconds=1)

    async def test_near_tie_does_not_chain_against_actual_maximum(self):
        throughputs = {8: 100, 4: 98, 2: 96, 1: 95}

        async def measure(concurrency):
            return Measurement("w", 100, 100 / throughputs[concurrency], 100,
                                capacity_ok=True)

        result = await probe_concurrency(8, measure, max_trials=4, deadline_seconds=1)
        self.assertEqual(result.selected, 4)


if __name__ == "__main__":
    unittest.main()
