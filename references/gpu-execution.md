# GPU execution within the experiment lifecycle

## Contents

- [Contract and inventory](#contract-and-inventory)
- [Capacity and scientific meaning](#capacity-and-scientific-meaning)
- [Admission and pipelining](#admission-and-pipelining)
- [Monitoring, recovery and closure](#monitoring-recovery-and-closure)
- [Bundled plan helper](#bundled-plan-helper)

GPU work uses the same dev, execution, artifact, recovery and completion rules
as the rest of this Skill. This reference absorbs the former `gpu-experiment`
capability. It does not introduce another scheduler, identity or completion gate.
For expensive scale-up, apply [performance control](performance-control.md):
matched capacity pilots, bounded tuning and feedback, and end-to-end reporting.

## Contract and inventory

Before loading weights, resolve the exact user/project device allocation and
model/revision set. Record stable UUIDs or provider partition identities, the
authoritative executor, permitted compute and cost, data revision/input membership,
loading configuration, metrics, stopping criteria, and evidence locations.
Resolve model aliases against the project set; do not enumerate caches or public
models to expand the request. An unavailable selected model remains an explicit
blocked/excluded row; an idle unlisted GPU remains outside the allocation.

Inventory only authorized devices using provider-native telemetry. Record current
health, free/total VRAM, utilization, active allocations, partitions, framework,
driver/runtime, host memory and I/O capacity. Verify physical versus container
device numbering. A visibility variable, stale receipt or successful plan parse
is not a lease. Validate GPU and model revisions against actual provider state.
Missing telemetry is `unobservable`, never a fabricated zero or proof of idleness.
Unsupported MIG/visibility mapping requires the provider's adapter before launch.
The bundled NVIDIA helper supports physical device queries and UUID visibility
masks. Numeric CUDA ordinals and MIG mapping require an external adapter; it
does not prove complete device health or active-process coverage.

## Capacity and scientific meaning

Separate a capacity probe from a scientific comparison. Probes answer what fits
and meets the declared throughput, latency and quality constraints. Scientific
rows compare frozen conditions. Neither permits undeclared scientific changes.

1. Estimate weight, optimizer, activation, KV-cache and runtime overhead from
   metadata or framework-native dry runs where available. Retain assumptions.
2. Run a minimal real load on representative inputs, followed by dev cases
   covering relevant shape/context/resource tails. One average input cannot
   establish full-run capacity. Reuse compatible pilot evidence when its
   dependencies and covered execution paths match; do not repeat identical loads
   for every seed solely to satisfy a bookkeeping rule.
3. Begin with the project configuration. If authorized, explore lower precision
   or quantization, multi-device placement, explicit CPU offload, then disk
   offload. Bound each probe's time, retries and memory. Reserve per-device
   headroom; default to the larger of 10% VRAM and 512 MiB unless the project
   declares another justified limit. Account for other admitted work and transient
   peaks. The helper validates numbers; the executor enforces the reserve.
4. After loading works, step or binary-search batch/context/concurrency within
   the authorized range. Measure useful throughput, latency percentiles, peak
   allocated/reserved VRAM, CPU/RAM, I/O and quality. Save the actual device map;
   automatic placement is not evidence that it used every selected device.
5. Choose the configuration that meets the workload oracle and resource budget.
   Maximum feasible capacity and maximum useful throughput can differ. Do not
   use every GPU merely because it is available; measure communication/offload
   costs and retain the comparison.

Precision, quantization, optimizer, gradient checkpointing, effective batch,
sample order, parallel topology and numerical kernels may change the result.
Classify them under the study's semantic contract. Amend the affected recipe
when they do; do not silently treat an OOM-driven change as an identical retry.
Preserve failed probes and their configurations in the evidence chain.

## Admission and pipelining

Build the required model/revision × condition × seed matrix with explicit
dataset/input membership before full execution. Project runners may expand
additional axes; the bundled helper's model × seed rows are only a minimum.
Declare which smoke/dev evidence covers each execution path, and separately
prove readiness for uncovered models, shapes or configurations.

Use the project's native scheduler. A ready artifact edge makes work eligible;
dispatch also requires an atomic provider allocation or lease for all involved
devices and aggregate CPU/RAM/I/O/storage. Account for multi-GPU gangs as one
admission unit. Per-device concurrency counts alone cannot prevent aggregate
memory oversubscription or races with other sessions.

Pipeline CPU preparation, GPU generation and downstream scoring on immutable,
validated partitions under the shared lifecycle contract. Bound prefetch,
queues, in-flight work and retained bytes; protect monitor/validator capacity.
Increase concurrency only after a pilot shows useful improvement within limits.
Apply fairness or stage quotas when one matrix or producer would starve another
ready stage. Respect scientific barriers and result isolation.

Observe avoidable idle gaps and distinguish dependency waits, input staging,
backpressure, unavailable capacity and no authorized ready work. Tune measured
bottlenecks; never add duplicate work or expand the allowlist to inflate a
utilization graph. Do not create an agent-owned scheduler alongside the provider.

## Monitoring, recovery and closure

Use the same continuous log AND artifact monitoring as full scientific runs.
Add device health, memory pressure, thermal/power limits, throughput and offload
contention. Low utilization alone is a diagnostic signal; pause admission when
it coincides with unsafe pressure, and diagnose the limiting stage before adding
workers. Before unattended work, demonstrate that the native monitor can stop
owned GPU jobs within the declared deadline even if the launcher fails.

On OOM, disappearing devices, integrity faults or exceeded budgets, stop affected
admission, retain evidence, and cancel or drain within the declared grace period.
Confirm provider terminal state and released allocations before replacement work.
Unknown cancellation leaves unresolved resource exposure. Never silently replace
a missing GPU or retry the same failed workload without a justified change.

Resume only compatible committed checkpoints, including optimizer, scheduler,
RNG, sampler and distributed state where required. A scorer fix may reuse valid
generation; a tokenizer/model-input fix invalidates dependent generation and
analysis. Couple recovery scope to real state dependencies, not device count.

For every required row, retain exact model/config/code/data identity, device map,
allocation and plan reference, time-series resource evidence, throughput/latency,
quality, logs, intermediates, raw results, retries, exclusions and terminal state.
Secrets never belong in telemetry; private scientific inputs and outputs remain
in authorized evidence storage. Do not discard scientific evidence merely to
keep resource receipts small. Report missing observability explicitly.

A completed row requires authoritative terminal success and exact validated
outputs. Full-study completion also requires all declared rows, comparisons and
retention checks. Recording a failed/excluded row is necessary accounting but
does not satisfy missing required scientific coverage.

## Bundled plan helper

`scripts/gpu-plan.mjs` validates a project-owned schemaVersion 1 plan, expands
model × seed rows, and offers a bounded NVIDIA allowlist inventory. Use an
absolute trusted Node executable and an absolute regular plan file:

```sh
<absolute-node> <experiment-lifecycle>/scripts/gpu-plan.mjs validate <absolute-plan.json>
<absolute-node> <experiment-lifecycle>/scripts/gpu-plan.mjs matrix <absolute-plan.json>
<absolute-node> <experiment-lifecycle>/scripts/gpu-plan.mjs inventory <absolute-plan.json>
```

Plans require `mode` (`capacity-probe` or `scientific`), concrete `gpuAllowlist`,
`modelAllowlist` entries with `id` and `revision`, `reservePercent`, `reserveMiB`,
and `scheduling` with `maxConcurrentPerGpu`,
`queuePolicy: "fill-ready-authorized-rows"`, and `allowProviderParallelism`.
`resourceProfile` is `bounded`, `expensive` or `build`. Scientific plans require
`experiment.dataset` (`id`, `revision`), `seeds`, `metrics`, `protocolDigest`;
also record `inputSlice` and `environmentDigest` when applicable. The parent
lifecycle must bind exact input membership and immutable source identities.

The helper checks syntax and emits `planDigest`; it cannot prove that a revision
is immutable, a metric is scientifically valid, or a GPU is exclusively reserved.
It does not load models, enforce memory/visibility in children, schedule rows,
collect ongoing telemetry or implement cancellation. `fullRunRequired` in its
legacy matrix describes the requested row workload; a pure capacity probe does
not authorize a full scientific evaluation. Native adapters must implement the
remaining contracts and attach the plan reference to execution evidence.

Inventory separates `allowlistSatisfied` (identity/visibility), `capacityReady`
(usable memory observations), and `telemetryComplete`. Per-device
`telemetryIssues` names missing/invalid fields; missing optional signals remain
`unobservable` even when memory observations are usable. CLI status 3 means the
inventory cannot establish capacity readiness; status 0 still does not prove
a lease, thermal safety, full telemetry coverage or permission to launch.

After moving the helper, installations with executable path/content pins must
refresh those pins through their normal reviewed installer. Do not bypass a
command guard because the old `gpu-experiment` path was previously admitted.
If the host supports a general guarded interpreter route, use that documented
route instead: verify a private staged copy against the installed source, select
its registered root and budgets, and invoke `scripts/gpu-plan.mjs` relative to
that root with an absolute plan path. A successful guarded validate/matrix call
does not validate live inventory or GPU execution.
