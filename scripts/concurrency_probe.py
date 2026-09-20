"""Bounded, measured concurrency selection for a caller-owned workload."""

from __future__ import annotations

import asyncio
import inspect
import math
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Measurement:
    """One complete workload measurement, including retry and commit time."""

    workload_id: str
    validated_outputs: int
    elapsed_seconds: float
    required_outputs: int
    capacity_ok: bool | None = None
    error: str | None = None


@dataclass(frozen=True)
class Observation:
    concurrency: int
    measurement: Measurement
    throughput: float | None


@dataclass(frozen=True)
class ProbeResult:
    selected: int | None
    observations: tuple[Observation, ...]
    reason: str
    coverage: tuple[int, ...]


def _validate_measurement(measurement: Measurement, workload_id: str | None,
                          required_outputs: int | None) -> tuple[str, int]:
    if not isinstance(measurement, Measurement):
        raise TypeError("measure must return a Measurement")
    if not isinstance(measurement.workload_id, str) or not measurement.workload_id:
        raise ValueError("measurement workload_id must be a non-empty string")
    if workload_id is not None and measurement.workload_id != workload_id:
        raise ValueError("measurements have mismatched workload identities")
    if (isinstance(measurement.validated_outputs, bool)
            or not isinstance(measurement.validated_outputs, int)
            or measurement.validated_outputs < 0):
        raise ValueError("validated_outputs must be a non-negative integer")
    if (isinstance(measurement.required_outputs, bool)
            or not isinstance(measurement.required_outputs, int)
            or measurement.required_outputs < 0):
        raise ValueError("required_outputs must be a non-negative integer")
    if required_outputs is not None and measurement.required_outputs != required_outputs:
        raise ValueError("measurements have mismatched required output counts")
    if (isinstance(measurement.elapsed_seconds, bool)
            or not isinstance(measurement.elapsed_seconds, (int, float))
            or not math.isfinite(measurement.elapsed_seconds)
            or measurement.elapsed_seconds <= 0):
        raise ValueError("elapsed_seconds must be finite and positive")
    if measurement.capacity_ok is not None and not isinstance(measurement.capacity_ok, bool):
        raise ValueError("capacity_ok must be true, false, or None")
    if measurement.error is not None and not isinstance(measurement.error, str):
        raise ValueError("error must be a string or None")
    return measurement.workload_id, measurement.required_outputs


def _candidates(ceiling: int) -> list[int]:
    values: list[int] = []
    current = ceiling
    while True:
        values.append(current)
        if current == 1:
            return values
        current = max(1, current // 2)


async def probe_concurrency(
    ceiling: int,
    measure: Callable[[int], Measurement | Awaitable[Measurement]],
    *,
    max_trials: int,
    deadline_seconds: float,
    minimum_gain: float = 0.03,
) -> ProbeResult:
    """Measure bounded candidates and choose the fastest valid useful result.

    ``ceiling`` must already account for all caller-owned resource and API
    budgets.  This search samples only a descending halving sequence; it does
    not assume throughput is monotonic and makes no global-optimum claim.
    """
    if isinstance(ceiling, bool) or not isinstance(ceiling, int) or ceiling < 1:
        raise ValueError("ceiling must be a positive integer")
    if not callable(measure):
        raise TypeError("measure must be callable")
    if isinstance(max_trials, bool) or not isinstance(max_trials, int) or max_trials < 1:
        raise ValueError("max_trials must be a positive integer")
    if (isinstance(deadline_seconds, bool) or not isinstance(deadline_seconds, (int, float))
            or not math.isfinite(deadline_seconds) or deadline_seconds <= 0):
        raise ValueError("deadline_seconds must be finite and positive")
    if (isinstance(minimum_gain, bool) or not isinstance(minimum_gain, (int, float))
            or not math.isfinite(minimum_gain) or minimum_gain < 0):
        raise ValueError("minimum_gain must be finite and non-negative")

    observations: list[Observation] = []
    workload_id: str | None = None
    required_outputs: int | None = None
    selected: int | None = None
    best_throughput = -1.0
    timed_out = False
    timeout_scope = asyncio.timeout(float(deadline_seconds))
    try:
        async with timeout_scope:
            for concurrency in _candidates(ceiling)[:max_trials]:
                value: Any = measure(concurrency)
                if not inspect.isawaitable(value):
                    raise TypeError("measure must be an async callable")
                measurement = await value
                workload_id, required_outputs = _validate_measurement(
                    measurement, workload_id, required_outputs)
                useful = (measurement.validated_outputs == measurement.required_outputs
                          and measurement.capacity_ok is True and measurement.error is None
                          and measurement.required_outputs > 0)
                throughput = (measurement.validated_outputs / measurement.elapsed_seconds
                              if useful else None)
                observation = Observation(concurrency, measurement, throughput)
                observations.append(observation)
                if throughput is None:
                    continue
                if selected is None:
                    selected, best_throughput = concurrency, throughput
                    continue
                gain = throughput / best_throughput - 1.0
                if gain > float(minimum_gain):
                    selected, best_throughput = concurrency, throughput
                elif gain >= -float(minimum_gain) and concurrency < selected:
                    selected = concurrency
    except TimeoutError:
        if timeout_scope.expired():
            timed_out = True
        else:
            raise

    coverage = tuple(item.concurrency for item in observations)
    if selected is None:
        reason = "deadline_exceeded" if timed_out else "no_valid_useful_measurement"
    elif timed_out:
        reason = "deadline_exceeded_partial_search"
    elif len(observations) >= min(max_trials, len(_candidates(ceiling))):
        reason = "trial_budget_exhausted" if max_trials < len(_candidates(ceiling)) else "search_complete"
    else:
        reason = "search_complete"
    return ProbeResult(selected, tuple(observations), reason, coverage)
