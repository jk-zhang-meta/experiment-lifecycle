# Measured concurrency and performance control

## Contents

- [Scope and ownership](#scope-and-ownership)
- [Performance contract](#performance-contract)
- [Two dev gates](#two-dev-gates)
- [Find and test the bottleneck](#find-and-test-the-bottleneck)
- [Bounded feedback policy](#bounded-feedback-policy)
- [Retention and completion](#retention-and-completion)
- [Worked example and evidence](#worked-example-and-evidence)

## Scope and ownership

Use this contract before scaling expensive experiments or diagnosing material
waiting and throughput problems. Ordinary short tests need no tuning campaign.
Optimize time to the requested verified result under scientific, resource and
retention constraints. GPU utilization is supporting telemetry, not the objective.
No policy guarantees a global optimum across an unmeasured configuration space.

The agent defines the study, admissible knobs, budgets and evidence interpretation.
The existing executor applies allocations, queue limits and a declared feedback
policy without requiring an LLM decision for each batch. The agent handles new
failure modes, semantic changes and resource changes outside existing authority.
Do not implement another scheduler to satisfy this document. If native adaptation
is absent, use a measured fixed configuration and explicitly report that any
adaptation is manual. Fixed settings may run unattended when the lifecycle's
independent monitor and stop mechanism are proven; otherwise use bounded attended
intervals. Missing autoscaling does not itself mean missing safe monitoring.

## Performance contract

Before an expensive scale-up, persist the following in the existing run plan or
equivalent machine-readable native records. Do not create duplicate state files.
Bind the plan revision, execution and observation schema to every tuning decision.

| Field | Required decision/evidence |
| --- | --- |
| Objective | Required output scope, first verified result time, total completion time, cost ceiling; primary objective and tie-breaker |
| Stage map | Inputs, output commit/validator, partition or full-barrier dependency, resource owner, allowed overlap |
| Workload | Exact dev membership, category and size mix, model/config paths, cold/warm cache policy |
| Measurements | Per-stage setup/service/wait/commit time, useful output count, queue age/bytes, resource peaks, failures and observation freshness |
| Knobs | Explicit candidates/ranges, semantic classification, pilot starting point and selected configuration |
| Budgets | Aggregate compute/memory/I/O/storage; tuning time/cost/trials, bounded retries and deadline |
| Controller | Native owner, sample interval, observation window, minimum useful gain, stable-window count, cooldown, low/high watermarks, hard stop criteria |
| Recovery | Last proven configuration, safe change boundary, cancellation/drain deadline and evidence references |

Choose concrete thresholds from the workload and pilot; no universal worker count,
percentage dev size or utilization threshold is acceptable. Missing safety
thresholds block dependent scaling. Missing performance confidence favors the
smaller proven configuration and must not block unrelated useful work.

If throughput/latency itself is the scientific outcome, load, concurrency,
cache state, batching and controller policy are benchmark conditions. Freeze
them or declare controlled conditions before evaluation. Do not adapt to favor
one model's measured result. For other studies, only knobs proven compatible
with the scientific contract may change within one condition.

## Two dev gates

Maintain two distinct readiness decisions, even when they reuse the same examples:

1. Correctness and scientific coverage: use the dev protocol's category, group,
   interaction and rare-case coverage, isolation and validity requirements.
2. Performance and capacity: cover input/output size tails, variable lengths,
   expensive execution branches, model startup, writes/checkpointing and concurrent
   stage peaks. Measure the actual overlapped pipeline, not only isolated stages.

Use a distribution-matched workload for expected throughput and tagged stress
cases for capacity bounds. Report both; do not infer population throughput from
an all-tail sample or safety from an average-only sample. If output length is
unknown, declare an authorized bound or conservative forecast and watch actual
growth. Reprofile when schema, model, shape mix or relevant resources change.

Record startup and compilation separately, but include them in full-run forecasts.
Compare candidates using the same work identities, comparable resource allocation,
cache state and warm-up protocol. Use framework timing that accounts for
asynchronous device work; timing enqueue calls alone is not compute latency.
Repeat or interleave only enough matched windows to assess observed variability
within the tuning budget. Record interference and exclude a contaminated timing
window by a declared rule, retaining the evidence rather than cherry-picking.

## Find and test the bottleneck

Start with a valid conservative end-to-end baseline or compatible prior evidence.
For each stage, separate time waiting for dependencies, allocation, data, execution,
validation and durable commit. Count time-to-first-output, steady-state throughput
and final drain independently. Only compare stage capacities after normalizing
their units, fan-out and workload mix. Shared CPU/I/O/device contention means
isolated rates cannot simply predict aggregate pipeline throughput.

Investigate the observed limiting stage before raising worker counts:

- Remove artificial whole-stage barriers where validated partitions suffice.
  Keep global normalization, fitting and order-sensitive state behind real barriers.
- Reuse valid preprocessing/model inputs and avoid needless model reloads. Keep
  workers resident only within allocated memory; reset RNG, mutable model state,
  request state and buffers between executions. Weight sharing does not imply
  mutable-state sharing across conditions or seeds.
- Tune loader workers, thread pools, pinned memory, prefetch and transfers only
  when measurement implicates that path. Count nested BLAS/OpenMP threads and
  dataloader children in aggregate CPU/RAM budgets.
- Tune microbatch, length buckets, stage concurrency and placement within the
  allowed semantic contract. Preserve stable output IDs, required membership and
  stochastic/order semantics. Size-aware scheduling must not starve rare long
  jobs; record a bounded aging or fairness policy.
- Tune partition size against dispatch/serialization/validation/commit overhead,
  downstream release latency, failure-detection latency, peak bytes and retry
  cost. Neither one huge shard nor one task per sample is a universal default.
- Use native allocation and queue mechanisms for independent rows and GPU gangs.
  Speculative duplicate attempts are off by default. If explicitly allowed,
  charge their cost, fence accepted output and preserve loser evidence; never
  treat a duplicate stochastic attempt as an interchangeable result without a
  declared acceptance rule.

Change one diagnosed parameter at a time unless an explicit bounded candidate
design tests an interaction. Record candidate, matched baseline, effect, noise,
resource headroom and why it was accepted/rejected. Measure useful validated
outputs at the declared pipeline boundary, not kernel speed alone.

Stop exploring when the budget/deadline is reached, no candidate exceeds the
declared useful-gain threshold above uncertainty, or plausible remaining savings
do not justify additional tuning and switching cost. Keep the best valid measured
configuration; describe the explored region and unresolved bottleneck. Do not
claim maximum performance from one passing pilot.

## Bounded feedback policy

Map this decision order into the existing executor's supported controls. Each
action emits old/new settings, reason, observation window and plan/execution IDs.

| Observation | Required action |
| --- | --- |
| Integrity fault, hard budget breach or monitor freshness deadline exceeded | Stop affected admission and apply the lifecycle's bounded stop/revocation policy immediately; never wait for a tuning window |
| Queue exceeds byte/age high watermark or sustained memory/I/O pressure | Throttle the producing stage; drain within safe capacity; diagnose the consuming bottleneck |
| Queues below low watermark, stable resource headroom, useful demand remains | Consider one preauthorized step on the limiting stage only after the declared stable-window count and cooldown |
| Trial gains exceed minimum useful gain and observed uncertainty; all gates hold | Accept at a safe task/checkpoint boundary and record the new policy revision |
| Gain absent, end-to-end latency worsens, or resource contention rises | Reject trial and return to the last valid configuration at a safe boundary |
| Task mix changes, tails dominate or measurement becomes incomparable | Hold growth, reprofile within remaining budget, then keep or revise measured settings |

Specify a lower resume threshold than the throttle threshold, minimum dwell time,
and bounded upward steps to avoid oscillation. The stable-window rule applies to
optimization, never to emergency stopping. Reducing admission may drain existing
valid work; it does not instantly reduce resident memory. Bound the drain and
account for transition peaks and allocations until release is confirmed.

Do not change training topology/batch/order or other semantic factors under this
feedback rule unless the study expressly defines them as an allowed policy.
If current capacity cannot support the last proven configuration, pause; do not
blindly restore settings measured under different resource availability.

## Retention and completion

Queue occupancy and retained storage are separate budgets. Consuming a partition
can release queue capacity while its retained artifact still occupies durable
storage. Reserve prospective output, temporary writes, retry/checkpoint and
monitor bytes; pause rather than erase evidence when capacity is inadequate.

At closure, attach a compact performance report to the existing result index:

- workload scope, baseline/selected settings and retained tuning evidence;
- time to first verified result, setup, steady-state and drain time, total elapsed
  time, required coverage and per-stratum/size throughput where informative;
- unique newly computed validated outputs per measured time versus cache/reuse
  completions separately; current validity after revocation;
- per-stage waiting/queue age, limiting resource, measured idle reasons and unknowns;
- compute/cost spent in failures, retries, speculative duplicates, setup and
  tuning, with measured versus estimated attribution and no double-counting;
- retained intermediates, reused artifacts, remaining stragglers and why required
  coverage is complete or incomplete; unresolved performance opportunities.

Fast easy rows alone cannot establish full-workload throughput. Exclusions and
failures remain in denominators and scientific accounting. Overlapping stage times
are not additive wall time; device busy fractions are not billed GPU-hours.
An optimization pass is not a new scientific completion gate or permission to
stop a requested study after a good pilot.

## Worked example and evidence

Illustrative only: preparation takes 2 s/partition, GPU generation 8 s, scoring
4 s and validated commit 1 s on independent resources. Ten equal partitions
take 150 s if all stages are serial. With sufficient capacity and independent
validated handoffs, an idealized pipeline takes 15 + 9 × 8 = 87 s. This excludes
contention and scheduling overhead and is not a measured speedup. If scoring
instead takes 12 s, it becomes the bottleneck; adding generation workers builds
a queue. More scoring capacity is justified only if the end-to-end pilot proves
it helps within aggregate limits.

The control contract above is a design requirement, not an implemented adaptive
runner. The bundled GPU helper only validates plans and inventories devices.
Backend admission, feedback, freshness, cancellation and restore must be tested
before claiming runtime enforcement or a performance improvement.

The [PyTorch Performance Tuning Guide](https://docs.pytorch.org/tutorials/recipes/recipes/tuning_guide.html)
supports workload-specific tuning of asynchronous data loading, pinned memory,
threading and avoiding unnecessary device synchronization. These are candidate
mechanisms, not universal settings; semantic compatibility and end-to-end gains
must be verified for the project. The admission/controller/report requirements
here are our synthesis, not a claim that PyTorch supplies this entire lifecycle.
