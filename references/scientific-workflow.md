# Scientific workflow

Read this reference in full for dataset-based development or scientific claims.
The engineering-test and capacity-only lanes are defined in [SKILL.md](../SKILL.md).
The applicable supporting contracts are linked directly from that entrypoint;
this workflow does not replace their artifact, dev, GPU or performance guarantees.

## Contents

1. [Establish the study and execution contract](#1-establish-the-study-and-execution-contract)
2. [Develop on representative subsets](#2-develop-on-representative-subsets)
3. [Assign identity at the right level](#3-assign-identity-at-the-right-level)
4. [Pipeline committed artifacts under resource limits](#4-pipeline-committed-artifacts-under-resource-limits)
5. [Monitor the full run and stop on bounded evidence](#5-monitor-the-full-run-and-stop-on-bounded-evidence)
6. [Recover and reuse without hiding failures](#6-recover-and-reuse-without-hiding-failures)
7. [Close results, analysis and retention separately](#7-close-results-analysis-and-retention-separately)

Own the scientific lifecycle from question to retained evidence. Optimize useful
verified progress per scarce resource while completing the user's full research
contract. A first verified dev result is a milestone, never a substitute for
the required full experiment. Retain intermediate, failed, superseded, and final
research evidence; reduce duplicate bookkeeping, not evidence coverage.

Bind each study revision to its GitHub goal, milestone acceptance record and
experiment Issue under [research management](research-management.md) and
[GitHub workflow](github-workflow.md). A milestone may need many studies and
trial batches; do not equate one successful run with milestone acceptance.
Use the current decision and unresolved evidence gaps to select the next bounded
batch. Reconcile defects, changed protocols and earlier decisions before resume.

GPU planning is part of this Skill, not another lifecycle. Bind the explicit
device/model allowlists, measure headroom and useful throughput, and admit only
ready work within aggregate budgets. Capacity probes cannot silently change
scientific factors. Preserve a terminal status and evidence for every required
model/configuration/seed row; idle hardware does not expand authorization.

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

Before expensive scale-up, distinguish correctness readiness from performance
and concurrent-capacity readiness. Persist a measured stage map, authorized
tuning ranges, aggregate limits, observation windows, backpressure thresholds,
and a bounded tuning budget using the performance-control reference. Compare
matched workload/cache conditions and include startup, validation and final drain.

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

Use a measured fixed configuration or the executor's declared bounded feedback
policy. Do not ask an LLM to decide every batch admission. Adjust the diagnosed
bottleneck, retain tuning evidence, and stop exploration when its remaining
cost outweighs plausible savings. No implicit semantic changes, speculative
duplicates or starvation of costly required rows are allowed for speed.

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
For expensive runs, include the performance report: first-result and full-run
time, useful throughput, bottleneck/wait reasons, tuning decisions, reuse and
failed/repeated compute cost. Mark estimates and unknowns; distinguish a policy
specification from measured improvement and demonstrated executor enforcement.
