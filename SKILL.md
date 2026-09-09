---
name: experiment-lifecycle
description: Plan and verify software tests, representative dev validation, and full scientific experiments in one lifecycle. Use for unit/integration/end-to-end checks, dataset sampling, model loading, GPU capacity and scheduling, benchmarks, training, evaluation, ablations, sweeps, monitored parallel runs, recovery, reusable intermediates, and complete evidence retention. Scale evidence to engineering versus scientific claims; dev success never substitutes for formal completion. Do not use for literature-only work.
---

# Experiment lifecycle

Own the scientific lifecycle from question to retained evidence. Optimize useful
verified progress per scarce resource while completing the user's full research
contract. A first verified dev result is a milestone, never a substitute for
the required full experiment. Retain intermediate, failed, superseded, and final
research evidence; reduce duplicate bookkeeping, not evidence coverage.

This Skill specifies behavior and evidence. The project executor enforces
scheduling, monitoring and cancellation; the artifact store owns durable bytes.
It does not install a scheduler, grant compute access, or make a prose instruction
into an unattended watchdog. Use existing project facilities when they satisfy
the contracts; filenames and tracking products are not scientific guarantees.

## Read what the task needs

- Before experiment design or dev selection: [study protocol](references/dev-validation.md).
- Before producing, consuming, reusing, recovering, or retaining artifacts:
  [artifact contract](references/lifecycle.md).
- Before parallel, expensive, detached, or long execution:
  [execution and monitoring](references/lifecycle.md).
- Before model loading, GPU capacity probing, placement or GPU scheduling:
  [GPU execution](references/gpu-execution.md).
- For current helper support and deployment boundaries:
  [compatibility and migration](README.md).
- For rationale and source limits: [research basis](references/research-basis.md).
- For Skill/adaptor validation: [acceptance cases](references/evaluation.md).

Use available canonical-state, resource-guard, runtime-hygiene
and project verification facilities only for applicable surfaces. Keep one
scientific lifecycle owner. A graph coordinator may manage durable dependencies;
it must not impose a second completion rule or schedule individual GPU work in
competition with the project's executor.

GPU planning is part of this Skill, not another lifecycle. Bind the explicit
device/model allowlists, measure headroom and useful throughput, and admit only
ready work within aggregate budgets. Capacity probes cannot silently change
scientific factors. Preserve a terminal status and evidence for every required
model/configuration/seed row; idle hardware does not expand authorization.

## Choose the validation lane

Use this one Skill as the testing and experiment entrypoint. For an ordinary
software test, identify the behavior/change, use the project's existing test
runner and smallest relevant unit/integration/end-to-end checks, retain exact
command/code identity, result and useful failure evidence, and stop when that
engineering oracle is met. Do not manufacture scientific hypotheses, dataset
splits, research manifests or GPU runs for ordinary tests. Respect applicable
UI isolation and resource controls.

For dataset-based development or scientific claims, follow the lifecycle below.
An engineering pass establishes implementation evidence only. A dev pass
establishes the declared coverage/readiness gate only. A formal empirical claim
requires the full scientific contract. Use targeted test-first/debugging methods
when requested or needed, without creating another lifecycle owner.

## 1. Establish the study and execution contract

Resolve from the request and project evidence:

- question, falsifiable hypothesis, estimand/comparison, baseline, conditions,
  metrics, uncertainty method, required repetitions and input membership;
- exploratory versus confirmatory use, dev/tuning/final-evaluation boundaries,
  missingness/exclusion rules and scientific stopping criteria;
- code and dependency snapshot, effective config, data/model identities,
  randomness and any hardware/execution factors that can change results;
- resource allowlist/allocation, aggregate budgets, storage capacity and retention;
- stage inputs/outputs, validators, monitoring owner, stop scope and latency;
- expected full-study completion evidence and recoverable artifact locations.

Infer routine implementation details from evidence. Ask only about missing
scientific choices, authorization, or material guarantees. Do not force the user
to supply machine-readable metadata the agent can collect. Record unknowns
explicitly; a missing critical guarantee blocks the dependent launch only.

Freeze a study revision before formal computation. Each stage has a declared
dependency closure and input contract. Use independent partition edges when
valid, keyed joins where needed, and full barriers only for actual global
dependencies. Record all required outputs, not just final metrics.

## 2. Develop on representative subsets

Inventory the exact dataset revision/split and all task categories before selection.
Read the dev protocol's population, quota, grouping and readiness requirements.
Select a versioned dev set covering task strata, rare/boundary cases and resource
extremes. Separate a distribution-matched core from tagged coverage/stress additions;
report per-stratum counts, proportions, missing cells and sampling limitations. Preserve membership, selection code, seed, rationale and limitations.
Reuse the real code path and artifact/monitoring mechanisms at dev scale.

Check correctness, scientific sanity, resource demand, artifact commit/restore,
failure detection and bounded cancellation. Expand the dev set after uncovered
failure modes; preserve earlier revisions and executions. Never quietly redefine
the held-out evaluation set or tune against its outcomes.

Use the first trustworthy dev result to decide the next step. Before scaling,
require an adequate dev coverage report, working evidence path and stop mechanism,
and a measured resource forecast with uncertainty. A canary prefix of the formal
run may validate scale behavior while monitoring remains active throughout.
Dev and formal runs share lineage, not an assumed scientific equivalence.

## 3. Assign identity at the right level

Keep study revision, condition, stage recipe, physical execution and artifact
version distinguishable. Native identifiers may encode these without separate
files for every concept. Preserve full source history while allowing unchanged
stage outputs to be reused across new downstream recipes.

Scientific input/code/config/protocol/randomness changes create a new relevant
condition or recipe and study amendment when interpretation changes. Identical
infrastructure retries create fresh executions with parent links. Unknown
equivalence is not a retry. A cached stochastic sample is not a new replicate.

Before submission, persist intent and a provider idempotency key when supported.
Immediately bind the returned job identity. Attach terminal/resource receipts
when available; do not freeze future telemetry into the launch record. Lost
submission replies require provider reconciliation before any resubmission.

## 4. Pipeline committed artifacts under resource limits

A consumer becomes eligible when its exact required artifact versions are
committed, validated, available, compatible and not revoked, and its resource
admission succeeds. It need not await unrelated producer partitions.

Write into execution-private staging; validate and durably commit each complete
partition/checkpoint before announcing readiness. Growing files, log messages,
mtime and queue notifications are not readiness evidence. Record exact input
versions on every consumer and the selected producer generation.

Overlap CPU preparation, GPU computation and CPU analysis where dependencies
permit. Reserve aggregate CPU/RAM/VRAM/I/O/storage and limit in-flight tasks and
buffered bytes. Apply backpressure at a declared high-water mark; resume below
the low-water mark. Protect validator/monitor capacity. Favor useful completion
and draining bottlenecks rather than utilization at any cost.

Never parallelize across a scientific barrier: global fitting, normalization,
order-sensitive state or a final all-input comparison needs the specified closed
input set. A live aggregate is provisional and records its denominator/version.

## 5. Monitor the full run and stop on bounded evidence

Inspect both operational signals and scientific artifacts throughout formal
execution: structured errors/progress, missing/duplicate IDs, shapes, finite
metrics, domain invariants, sampled semantic quality, resource pressure and
committed-output lag. Logs supplement output validation; neither replaces it.

Before detaching, prove a native monitor can enforce the declared thresholds
and stop owned jobs within its timeout budget. Measure observation freshness.
Missing monitoring beyond the declared deadline halts admission. Without a
working unattended mechanism, keep execution attended and bounded.

On a trigger: stop new affected dispatch, persist the reason/evidence, cancel
or drain exact owned tasks according to the failure policy, and confirm terminal
state. Integrity faults immediately block affected artifact consumption and
invalidate descendants. Unknown impact expands the pause conservatively.
Checkpoint/drain grace must be bounded; never preserve data by running invalid
work indefinitely. Unknown cancellation remains unresolved resource exposure.

## 6. Recover and reuse without hiding failures

Preserve all executions, partial artifacts and diagnoses. Classify infrastructure,
resource, implementation, data, scientific and observation failures separately.
Retry only within the authorized class/count/cost budget. A low metric is not
an infrastructure failure.

Reuse an artifact only after checking its stage dependency fingerprint, bytes,
validation contract, input coverage, stochastic semantics, retention/access and
current invalidation state. An analysis bug need not rerun valid GPU inference;
a tokenizer bug invalidates all dependent predictions, scores and conclusions.
If affected scope is unproven, do not claim selective reuse is safe.

Resume from a committed compatible checkpoint with the project's required model,
optimizer, scheduler, RNG, sampler and distributed state. Link the parent
execution and checkpoint. A changed batch/order/topology may change science.
Recheck consumers against revocation at dispatch and before accepting output.

## 7. Close results, analysis and retention separately

Artifact readiness, stage completion and study completion are separate claims.
Full completion requires exact required coverage, authoritative accepted task
outcomes, validated outputs, valid lineage, completed analysis and retained
evidence. Accounting for a failed row does not make it scientifically complete.

Commit raw outputs first. Run analyses against immutable input collections, then
commit analysis outputs. Final study closure references both; no output index
may depend on an analysis record that must first read that same final index.
Pair comparisons by stable IDs and preserve required denominators and uncertainty.

Report dev-ready, running, stopping, blocked, failed/incomplete, or completed
with the exact scope. A verified partition from a failed overall run can remain
usable if its independent validity is proven. Retain negative results and
explicit exclusions. Later invalidation retracts current conclusions without
erasing their historical reports.

Preserve the declared full evidence set in verified durable storage, including
intermediates. Costly/research artifacts are not disposable caches. If storage
is insufficient, backpressure or stop and resolve capacity; never silently
delete, sample away, or keep only the best checkpoint. Verify retention and
restore evidence, then report what is retained, where, and any remaining gaps.
