"""A conservative, in-process governor for one API quota scope.

Create one instance for each actual account/endpoint quota scope and share it
between all dataset workers.  SDK-level retry loops must be disabled: retries
here reserve their full token cost and are only safe for replayable requests.
"""

from __future__ import annotations

import asyncio
import math
import random
import time
from collections import deque
from collections.abc import Awaitable, Callable
from typing import Any


class ApiError(Exception):
    """An API response failure with enough information for governor retrying."""

    def __init__(self, status: int, retry_after: float | None = None,
                 retryable: bool | None = None) -> None:
        super().__init__(f"API request failed with status {status}")
        self.status = status
        self.retry_after = retry_after
        self.retryable = retryable

    @property
    def is_retryable(self) -> bool:
        if self.retryable is not None:
            return self.retryable
        return self.status in {408, 429, 500, 502, 503, 504}


class ApiGovernor:
    """Single-event-loop sliding-window RPM/TPM limiter with bounded retries.

    ``deadline`` in :meth:`run` is a positive number of seconds for the whole
    operation, including admission and retry waits.  Token counts are reserved
    conservatively as ``input_tokens + max_output_tokens`` and never refunded.
    """

    _WINDOW = 60.0

    def __init__(
        self,
        max_concurrency: int,
        *,
        rpm: int,
        tpm: int,
        request_timeout: float = 30.0,
        max_attempts: int = 3,
        recovery_successes: int | None = None,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
        random_fn: Callable[[], float] = random.random,
    ) -> None:
        self.max_concurrency = self._positive_int("max_concurrency", max_concurrency)
        self.rpm = self._positive_int("rpm", rpm)
        self.tpm = self._positive_int("tpm", tpm)
        self.request_timeout = self._positive_float("request_timeout", request_timeout)
        self.max_attempts = self._positive_int("max_attempts", max_attempts)
        self.recovery_successes = self._positive_int(
            "recovery_successes", self.max_concurrency if recovery_successes is None else recovery_successes)
        self._clock, self._sleep, self._random = clock, sleep, random_fn
        self._events: deque[tuple[float, int]] = deque()  # bounded by rpm
        self._tokens = 0
        self._in_flight = 0
        self._allowed = self.max_concurrency
        self._cooldown_until = 0.0
        self._cooldown_generation = 0
        self._decreased_generation = -1
        self._stable_successes = 0
        self._condition = asyncio.Condition()

    @staticmethod
    def _positive_int(name: str, value: int) -> int:
        if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
            raise ValueError(f"{name} must be a positive integer")
        return value

    @staticmethod
    def _positive_float(name: str, value: float) -> float:
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
            raise ValueError(f"{name} must be finite and positive")
        return float(value)

    @staticmethod
    def _token_count(input_tokens: int, max_output_tokens: int) -> int:
        if any(isinstance(v, bool) or not isinstance(v, int) or v < 0
               for v in (input_tokens, max_output_tokens)):
            raise ValueError("token counts must be non-negative integers")
        return input_tokens + max_output_tokens

    def _expire(self, now: float) -> None:
        while self._events and now - self._events[0][0] >= self._WINDOW:
            _, tokens = self._events.popleft()
            self._tokens -= tokens

    def _admission_wait(self, now: float, tokens: int) -> float | None:
        self._expire(now)
        waits: list[float] = []
        if now < self._cooldown_until:
            waits.append(self._cooldown_until - now)
        if len(self._events) >= self.rpm:
            waits.append(self._WINDOW - (now - self._events[0][0]))
        if self._tokens + tokens > self.tpm:
            future_tokens = self._tokens
            for timestamp, reserved in self._events:
                if future_tokens + tokens <= self.tpm:
                    break
                future_tokens -= reserved
                waits.append(self._WINDOW - (now - timestamp))
        return max(0.0, max(waits)) if waits else None

    async def _acquire(self, tokens: int, deadline: float) -> None:
        while True:
            async with self._condition:
                now = self._clock()
                if now >= deadline:
                    raise TimeoutError("API governor deadline expired before admission")
                wait = self._admission_wait(now, tokens)
                if wait is None and self._in_flight < self._allowed:
                    self._events.append((now, tokens))
                    self._tokens += tokens
                    self._in_flight += 1
                    return
                if wait is None:
                    # Condition.wait releases the lock atomically, avoiding a
                    # missed slot-release notification.
                    try:
                        await asyncio.wait_for(self._condition.wait(), deadline - now)
                    except TimeoutError as exc:
                        raise TimeoutError("API governor deadline expired before admission") from exc
                    continue
            await self._sleep(min(wait, max(0.0, deadline - self._clock())))

    async def _release(self) -> None:
        async with self._condition:
            self._in_flight -= 1
            self._condition.notify_all()

    async def _overloaded(self, error: ApiError) -> dict[str, float | int | str]:
        async with self._condition:
            now = self._clock()
            retry_after = error.retry_after if error.retry_after is not None else 0.0
            if not isinstance(retry_after, (int, float)) or not math.isfinite(retry_after):
                retry_after = 0.0
            retry_after = max(0.0, float(retry_after))
            if now >= self._cooldown_until:
                self._cooldown_generation += 1
                self._stable_successes = 0
            old_limit = self._allowed
            if error.status == 429 and self._decreased_generation != self._cooldown_generation:
                self._allowed = max(1, self._allowed // 2)
                self._decreased_generation = self._cooldown_generation
            # A 429 without Retry-After still creates one shared generation,
            # so a simultaneous overload wave cannot halve repeatedly.
            self._cooldown_until = max(self._cooldown_until, now + max(retry_after, 0.25))
            self._condition.notify_all()
            return {"retry_after": retry_after, "old_limit": old_limit,
                    "new_limit": self._allowed,
                    "cooldown_reason": "retry_after" if retry_after else "overload_backoff"}

    async def _succeeded(self) -> None:
        async with self._condition:
            if self._clock() < self._cooldown_until:
                return
            self._stable_successes += 1
            if self._allowed < self.max_concurrency and self._stable_successes >= self.recovery_successes:
                self._allowed += 1
                self._stable_successes = 0

    @staticmethod
    def _emit(callback: Callable[[dict[str, Any]], Any] | None, **event: Any) -> None:
        if callback is None:
            return
        try:
            callback(dict(event))
        except Exception:
            pass  # observers cannot affect limiter cleanup

    async def run(
        self,
        operation: Callable[[], Awaitable[Any]],
        *,
        input_tokens: int,
        max_output_tokens: int,
        replay_safe: bool = False,
        deadline: float = 120.0,
        on_event: Callable[[dict[str, Any]], Any] | None = None,
    ) -> Any:
        """Run a replay-safe operation with quota admission and bounded retries."""
        tokens = self._token_count(input_tokens, max_output_tokens)
        if tokens > self.tpm:
            raise ValueError("one request reservation exceeds tpm")
        deadline_at = self._clock() + self._positive_float("deadline", deadline)
        for attempt in range(1, self.max_attempts + 1):
            await self._acquire(tokens, deadline_at)
            completed = False
            try:
                remaining = deadline_at - self._clock()
                if remaining <= 0:
                    raise TimeoutError("API governor deadline expired")
                result = await asyncio.wait_for(operation(), min(self.request_timeout, remaining))
            except asyncio.CancelledError:
                raise
            except TimeoutError as exc:
                error = ApiError(408)
                error.__cause__ = exc
            except ApiError as exc:
                error = exc
            else:
                completed = True
            finally:
                await self._release()  # cancellation and retry waits free the request slot
            if completed:
                await self._succeeded()
                self._emit(on_event, kind="success", attempt=attempt)
                return result
            overload = None
            if error.status in {429, 503}:
                overload = await self._overloaded(error)
                self._emit(on_event, kind="overload", attempt=attempt, status=error.status, **overload)
            if not replay_safe or not error.is_retryable or attempt == self.max_attempts:
                self._emit(on_event, kind="failure", attempt=attempt, status=error.status)
                raise error
            retry_after = float(overload["retry_after"]) if overload else 0.0
            jitter = 0.5 + min(1.0, max(0.0, self._random()))
            delay = max(retry_after, min(30.0, 0.25 * (2 ** min(attempt - 1, 7)) * jitter))
            if self._clock() + delay >= deadline_at:
                raise TimeoutError("API governor deadline expired during retry")
            self._emit(on_event, kind="retry", attempt=attempt, status=error.status, delay=delay)
            await self._sleep(delay)
        raise AssertionError("unreachable")

    def snapshot(self) -> dict[str, float | int]:
        """Return bounded operational metadata; no requests or payloads are retained."""
        self._expire(self._clock())
        return {"in_flight": self._in_flight, "allowed_concurrency": self._allowed,
                "reserved_requests": len(self._events), "reserved_tokens": self._tokens,
                "cooldown_until": self._cooldown_until}
