# Artifact identity, readiness, reuse and retention

## Contents

1. Evidence entities
2. Commit and consumption
3. Reuse and invalidation
4. Checkpoints and analysis
5. Complete retention

## 1. Evidence entities

For server directory roles, location mappings and GitHub reconciliation, use
[storage alignment](storage-layout.md). For item-granular DAG expansion and
framework-owned I/O, use [artifact concurrency](artifact-concurrency.md) and the
selected [ClearML integration](clearml-integration.md). This document owns
artifact semantics.

Use project-native records when they encode these relationships. These are
logical fields, not a mandatory database, naming scheme or new JSON ABI.

| Entity | Required meaning |
| --- | --- |
| Study revision | Scientific contract, expected membership, amendments and parent revision |
| Condition | Scientific factor values, input/split identity and independent replicate/seed |
| Operation recipe | Code/dependency closure, effective parameters, input/output contracts, semantic environment and randomness |
| Execution | Unique physical attempt; intended recipe, exact input versions, provider job reference, allocation, retry/resume parent and producer generation |
| Artifact version | Producer execution, content digest/size, schema, logical role, partition/item coverage, exact consumed parents, validator and commit receipt |
| Collection version | Immutable list or Merkle manifest of exact artifact versions and membership; open/closed coverage assertion |
| Observation | Identity-bound timestamped progress, resource, validation, error or terminal evidence; unavailable measurement with reason |
| Invalidation | Immutable cause, scope, affected artifact/recipe IDs, descendant closure and replacement links |
| Study closure | Accepted outputs/analyses, coverage, scientific verdict, execution accounting, retention index and validity revision |

Record source commit/tree plus complete dirty snapshot if used, not just a hash
of an unavailable patch. Capture declared transitive code/config/data/model
dependencies; if dependency closure is uncertain, widen conservatively or disable
reuse. Inputs supplied by mutable APIs need actual response/version evidence and
the declared repeatability limitation. Store secrets outside provenance records.

An artifact record must also distinguish its stable logical output key from its
accepted immutable version and physical producer. The logical key may contain
dataset revision, item/frame/entity ID, condition, operation, iteration and named
output port. The version binds recipe version/digest and exact immutable
input artifact references to payload identity and validation. Execution and
node-attempt IDs identify a physical producer/retry only; they are not cache keys
or scientific output identities. A stable manifest locator maps the logical key
to an accepted version and exact parents. It must not be a mutable path, `latest`
view or directory glob.

There is one computation DAG, not a required stage hierarchy. Each node accepts
its declared inputs and returns declared outputs; immutable artifact versions are
the graph edges. Existing native `stage` fields or group labels can remain as
optional metadata; map them to nodes without requiring a stage hierarchy, a second
artifact ledger or a stage-wide barrier unless an actual coupled operation needs
one.

For a data-dependent expansion, persist a decision and membership receipt that
binds the expansion recipe, exact discovery input versions, generated keys,
membership state and producing execution. Subsequent scheduling replays that
receipt; it does not rerun costly or stochastic discovery merely to reconstruct
the graph. Before the receipt exists, represent only the declared template and
known members, not a false fully static DAG.

## 2. Commit and consumption

Artifact physical states are staging, committed or incomplete. Scientific use
states are unvalidated, valid or revoked. An artifact can remain durably committed
while revoked; preservation and scientific acceptance are different decisions.

ClearML Task completion, an enqueued background artifact upload and Ray ObjectRef
availability do not establish this commit. ClearML ordinary artifact names may
be overwritten; use immutable physical attempt identities and accepted manifests.
Wait for upload success, verify the declared retained destination and publish the
commit before exposing the reference. Tracker updates and object writes are not
one cross-service transaction: use the native commit as the authority and repair
missing tracker associations idempotently without repeating scientific effects.
Native task cache matches must still pass complete recipe/parent validation.

The producer writes exclusively under its execution/generation and node-attempt
staging prefix. Nodes are computation only: they receive framework-resolved
named inputs and return named outputs. The framework/store layer resolves exact
refs, loads inputs, validates output, writes bytes, commits manifests and routes
successors; node code does not discover predecessor folders, glob raw outputs or
commit an unrelated consumer's state.

After completing a logical partition or checkpoint it closes the files, verifies
bytes/schema/coverage/domain checks, and commits an immutable manifest binding
all members. A complete committed partition is independent of the still-running
producer only if its contract declares that no future producer action changes
its semantics. Otherwise use a barrier.

On a suitable local filesystem, use same-filesystem atomic publication and the
required file/directory durability operations. On object storage, use immutable
object versions and a conditional manifest commit supported by that store; do
not assume rename or directory-list atomicity. Cross-host handoff requires bytes
visible and verifiable at the declared destination. A notification is a hint to
read authoritative records, never a substitute for them.

Consumer eligibility requires all of:

1. Exact required parents satisfy the edge contract: partition, keyed join,
   committed checkpoint, or complete collection/barrier.
2. Manifest and payload identities/schema/coverage match; integrity and declared
   semantic validators pass; the producer generation is accepted.
3. Parents and transitive dependencies have no current revocation.
4. The consumer records the exact input versions and a retention pin/hold covers
   their use; aggregate resource and queue admission succeeds.

Analysis enumerates only exact artifact versions from the accepted collection;
never glob staging/retry directories or aggregate every file found under a run
root. Selection follows the declared fence scope: valid independent partitions
may come from different attempts, while a coupled checkpoint must remain one
consistent generation. Preserve excluded retry bytes without counting them.
Shared outputs are reused only through their exact accepted manifest refs and
retention pins; no retry may treat another attempt's staging path as input. Final
analysis/closure uses an explicit collection fan-in with declared membership.

Recheck validity before accepting the consumer output. Native transactions,
conditional writes or fencing tokens must close the race between this check
and acceptance; a later invalidation still propagates to already accepted
descendants. If the backend cannot provide this, serialize the bounded acceptance
operation through its existing single writer. Do not claim race safety from a
check followed by an unrelated write.

For each logical recipe/condition/partition result, accept only one authorized
generation using native compare-and-set, unique constraints or serialized commit.
Retries retain separate bytes. Late workers with stale generation/fencing tokens
cannot win after replacement. Duplicate events are idempotent; ordering follows
generation/identity, not wall clock. Preserve conflicting outputs for diagnosis.

Declare the fence scope: one independent partition, a checkpoint bundle, or a
coupled collection. Replacement advances that scope atomically. Previously
accepted independent partitions may survive another partition's retry after
validity checks; a distributed checkpoint or globally coupled output must use
one consistent generation/state boundary. A whole-job retry does not implicitly
revoke all independent partitions, nor permit mixing coupled checkpoint shards.

Required records must remain reconstructable after a coordinator restart: fetch
authoritative acceptance/revocation and provider state before resuming dispatch.
No mutable `latest` alias may substitute for exact inputs. Views may be mutable
only as rebuildable pointers to immutable evidence, not as provenance authority.

## 3. Reuse and invalidation

A computation reuse key covers actual parent content identities, operation code and
transitive dependencies, effective parameters, data/model revisions, preprocessing,
output schema, semantic environment/hardware, and stochastic/replicate semantics.
Full-study identity remains attached as provenance but is not an indiscriminate
cache key forcing unrelated GPU recomputation after a plotting change.

A matching key is only a candidate. Verify bytes are retained and accessible,
coverage is exact, validation is applicable, no revocation applies, and reuse is
scientifically permitted. Validator changes require revalidation; a scientific
definition change may also require a new study/analysis revision. Never reuse
because a path exists or its modification time looks recent.

Examples:

| Change | Reuse decision |
| --- | --- |
| Plot style or scorer bug only | Reuse valid raw predictions; rerun affected analysis/scoring, including baseline |
| Tokenizer/model/input preprocessing changed | Rerun dependent inference and descendants; retain independent upstream bytes if proven |
| GPU node loss with identical inputs/recipe | New execution; consume accepted independent partitions or compatible checkpoint |
| New seed/replicate | New stochastic sample required; old cache is not another observation |
| Different batching/order/precision/topology | Explicit equivalence assessment; unknown means new recipe/condition |
| Same key, different digests | Conflict; do not pick newest or fastest; inspect nondeterminism and intended replicate model |
| Cached output from a failed overall run | Reuse only if partition-level validity and independence from the failure are established |

On discovering a fault, record a revocation with the narrowest proven scope.
Find consumers by actual input lineage, block new affected dispatch, cancel or
quarantine affected running work, and invalidate completed descendants and any
report using them. If exact edges or affected scope are unavailable, broaden
the block instead of claiming unaffectedness. Independent branches may continue
only if their validity, monitoring and resource authorization remain intact.

Revoked bytes and old reports remain preserved. A correction creates replacement
versions linked to the cause. Revalidation never silently resurrects an artifact;
it records a new assessment and authorized acceptance. Reports already released
require a visible retraction/correction under destination authority.

## 4. Checkpoints and analysis

An inference output, a model checkpoint for evaluation and a checkpoint for exact
training resume have different contracts. Resume may require weights, optimizer,
scheduler, gradient scaler, RNGs, sampler/data cursor, accumulated gradients and
distributed rank/shard state at one consistent boundary. Capture only applicable
state, explicitly identifying unavailable state and weakened reproducibility.
Verify restore, including the next step where practical, before promising recovery.

Asynchronous checkpoint upload is not readiness. Commit after all required
members are durably present; a partial checkpoint remains diagnostic evidence.
Downstream evaluation can consume a committed checkpoint while training continues
if it binds that exact model version and preserves selection/evaluation boundaries.

Use separate raw-output collection commits, analysis execution/outputs and final
study closure. Incremental analysis binds each immutable prefix/version and labels
coverage provisional. Non-associative or order-dependent computations need the
declared order/reduction method; partition means cannot be averaged unweighted
when partition sizes differ. Rebuild after invalidation unless an exact reversible
aggregate mechanism is verified. Final acceptance uses the full required set.

## 5. Complete retention

Before expensive work, enumerate the evidence inventory: design and amendments,
dev selection, source snapshots, effective configs/environment, input/model
versions, commands/submission/terminal records, raw logs and structured events,
resource traces, intermediate datasets/predictions, scheduled checkpoints,
per-item results, failed partials, diagnoses, reuse/revocation decisions,
analysis code/tables/figures and final reports. Record expected formats, cadence,
storage, estimated volume, owner, verification and access/privacy constraints.

Preserve all produced research intermediates and declared evidence by default.
No implicit age expiry, best-checkpoint-only retention, log downsampling or
automatic garbage collection. Do not classify them as disposable merely because
they can theoretically be recomputed. Generic cleaner defaults must not override
this contract. Explicitly protect them as retained evidence/non-rebuildable or
use a store outside automatic cleanup authority with equivalent protection.

Deduplication and lossless compression are allowed when recoverability and
provenance are maintained. A persistent immutable URI plus verified bytes may
avoid repeated copies; a hash or expiring URL without retained payload is not an
archive. Every consumer pins needed artifact versions. Before moving evidence,
verify destination bytes and references; release the source only under the
authorized retention policy. No deletion is authorized by this Skill.

Full retention means the declared experimental record and all generated research
artifacts, not every transient tensor or secret. Record any intentionally omitted
internal state before launch and its scientific/recovery effect; never silently
drop existing intermediates. If the requested capture is infeasible, resolve the
storage/capture contract before that launch. Bound temporary buffers and reserve
space for logs, terminal receipts and safe shutdown. At capacity, stop or migrate
to authorized verified storage rather than discard evidence.

Archive closure includes an exact inventory with counts/bytes/digests, durable
locations, unresolved retention gaps and a restore check appropriate to the
format. Verify manifests and referenced-object availability; restore representative
large/complex artifacts and checkpoint state. Sampling a restore is not proof
every byte was restored; report its scope. Retention remains protected after
study closure until the user explicitly changes the retention contract.

# Execution and monitoring

## Contents

1. Native execution contract
2. Parallelism and admission
3. Continuous observation
4. Stop, invalidate and recover

## Native execution contract

Select the project's current supervisor/workflow engine and artifact store.
Before expensive or detached execution, identify actual mechanisms for submission,
stable job discovery, bounded admission, resource accounting, artifact commit,
monitoring, cancellation, recovery and retention. Map native evidence to the
contract. Unsupported guarantees are gaps, not implemented features of this Skill.

The host agent designs/inspects and makes scientific decisions. The native engine
owns task scheduling, retries and durable execution state. The resource manager
owns allocations and hard limits. A native/project supervisor owns continuous
checks and fail-closed admission. Do not create a PAC-wide scheduler, polling
daemon or mirrored job database. A small project adapter may bridge a real gap
only when implementation is in scope and its behavior is verified.

## Parallelism that respects science and scarce resources

Use the mandatory per-artifact handoff and adapter contract in
[artifact concurrency](artifact-concurrency.md). Trace the real code into one
versioned computation DAG: each node accepts named inputs and returns named
outputs; each edge binds an exact committed artifact version to an input port.
An artifact-only drawing is an optional projection, not a second authoritative
graph. A validated durable output commit releases its consumers immediately.
Do not delay release until other items, a shard, a dataset
or an unrelated operation completes. Dispatch still requires resource, quota, storage and
monitoring admission; dependency readiness is not an allocation.

Use the smallest useful independently committable unit: a frame/entity result,
tool receipt, iteration decision, partition, or genuinely coupled checkpoint.
Too-small execution tasks can waste setup/I/O;
too-large units delay error detection, downstream release and recovery. Measure
the tradeoff on dev, including checkpoint/write/validation overhead and tail risk.
Computation batching must not become an artificial whole-dataset commit barrier.
Where several independent items share a write container, expose separately
committed readable item records as soon as each bounded write completes.

For each edge declare one of:

| Edge | Readiness condition |
| --- | --- |
| Partition | Exact partition artifact committed and validated |
| Keyed join | Required inputs for the same stable key/version available |
| Checkpoint | Consistent committed model/checkpoint version ready for its purpose |
| Barrier | Full declared membership closes and global validation passes |

Partition order may be arbitrary only when scientific semantics permit it.
Global fitted transformations must be fixed before partitions using them;
cross-validation folds retain their own fitting boundaries. Distributed training
collectives are not independent partitions merely because multiple GPUs
are present. Separate train/evaluation allocations if they cannot safely coexist.

Illustrative equal-duration timeline (not a performance estimate):

| Slot | CPU preparation | GPU inference | CPU scoring |
| --- | --- | --- | --- |
| 1 | P1 | — | — |
| 2 | P2 | P1 | — |
| 3 | P3 | P2 | P1 |
| 4 | P4 | P3 | P2 |

Each handoff in this example requires a validated commit; final aggregation
still waits for full required coverage. Real operation lengths and shared CPU/I/O
contention determine whether overlap saves time.

Budget aggregate CPU/RAM/VRAM, accelerator allocation, task count, pending queue,
buffer bytes, durable storage, I/O/network and GPU-hours/cost. Account for model
replication, validation, transfer and checkpoint traffic. Scheduler resource hints
are not hard memory enforcement. Honor hardware allowlists and actual allocations.

Declare high/low watermarks for transient queues and maximum in-flight work.
At the high mark stop upstream admission; let valid downstream work drain;
resume below the low mark. Durable retained storage has a separate capacity
gate: scoring a prediction drains a queue but does not free its retained bytes,
and can increase storage use. Resume a capacity-blocked producer only after
verified additional capacity or authorized migration actually restores space.
Reserve worst-case remaining writes of already admitted work, prospective work,
control/validator capacity and shutdown evidence before admitting another task.
Prefer bottleneck/critical-path work and avoid starving checks to make GPU
utilization look good. Allow concurrency to change only within the authorized
budget and without silently altering scientific semantics. Storage pressure is
backpressure: stop new admission, preserve logs and failed/incomplete evidence,
and resume only after verified capacity or authorized migration. It never permits
deleting retained artifacts to make space.

## Continuous observation

Create a trigger contract before detaching. For each signal record producer,
scope, expected cadence, freshness timeout, threshold/window, action, recovery
criterion and where the receipt is retained. Set numbers from dev measurements,
resource limits and project requirements; no universal safe polling interval.
The freshness enforcer must survive failure of the observation worker; verify
that failure domain separately. If the supervisor can also disappear, provider
wall-time/lease expiry must bound remaining resource use. A watchdog implemented
only inside the process it watches cannot promise that protection. Use monotonic
elapsed time for local freshness deadlines and reconcile cross-host timestamps.

| Signal | Evidence and response |
| --- | --- |
| Crash/nonzero/provider failure | Exact execution event and bounded diagnostic logs; classify then bounded retry/stop |
| Missing/duplicate IDs, bad shape/schema, NaN/Inf, wrong model/tokenizer | Validator result naming artifact and recipe; block consumption and invalidate impact |
| Plausible but scientifically wrong output | Domain checks and stratified output samples; pause affected scope for diagnosis |
| No progress or stale output | Compare committed item/step progress with phase-aware threshold; logs alone do not prove progress |
| RAM/VRAM/disk/thermal/budget threshold | Measured current/forecast pressure; stop admission, drain or terminate within budget |
| Watcher or status authority stale | Fail-closed admission at freshness deadline; bounded native stop policy |
| Unfavorable scientific metric | Preserve result; only invoke a predeclared scientific stopping/pruning rule |

Bound expected wasted resources with a recorded engineering estimate:
concurrent resource rate multiplied by detection plus cancellation delay, plus
non-preemptible work and bounded drain/checkpoint allowance. The estimate is not
a guarantee until measured. Report measured detection-to-stop latency, repeated
failure rate, invalidated work, useful committed throughput, resource use and
retention coverage. Optimize these jointly, not raw GPU occupancy.

Prefer native callbacks/events and supervise their delivery. Poll exact job
handles only when needed with bounded cadence/backoff. Rotate logs losslessly to
retained storage; retain both raw logs and derived trigger receipts. Persist
identity-bound resource observations while running and final receipts on terminal
state, including failed executions. Missing telemetry is unknown with reason.

## Stop, invalidate and recover

1. Freeze affected admission immediately. For correctness/integrity failures also
   fence new consumption/acceptance of implicated artifacts.
2. Persist trigger evidence, last known execution state, affected lineage scope,
   job identities and time. Unknown impact pauses a conservative superset.
3. Cancel exact owned queued/running tasks or drain independently valid work as
   allowed by the trigger contract. Integrity faults do not get unbounded drain.
4. Save a checkpoint only if safe and within the declared grace/budget. Preserve
   partial writes without committing them. Escalate through the native executor
   after timeout, within existing cancellation authority.
5. Confirm provider terminal state and resource release. A sent cancel request is
   not a stopped job. If authority is unreachable, retain an unresolved incident,
   dispatch nothing affected and report possible continued resource consumption.
6. Append invalidations for affected artifact versions and all consumers/reports;
   preserve bytes. Diagnose, amend scientific recipes when needed, and resume only
   after recovery checks and remaining budget permit it.

Transient node/preemption retries may keep the same recipe with a new execution.
Bound count, aggregate cost and backoff; repeated failures open a circuit that
requires diagnosis. OOM-driven batch/precision changes require scientific review
of equivalence. Wrong data/model/code require new affected recipes. An ambiguous
submission is reconciled/adopted through provider identity, never blindly retried.

When a controller resumes, reconcile provider jobs, accepted generations,
committed artifacts, pending incidents and invalidation records before scheduling.
Stale events cannot override newer accepted state. Retain exactly one selected
execution per logical output unless independent replicates were declared; no
claim of exactly-once computation is needed when acceptance is idempotent.
