# Executable artifact concurrency

Use one code-derived graph with computation-only nodes and framework-owned
I/O/routing, independent of backend. Retain a compliant existing executor;
for new integrations use the [ClearML-first selection](framework-selection.md).
See [ClearML integration](clearml-integration.md) for management/execution wiring.
The older local asyncio code is a tested behavioral fixture, not the project runtime.

## Contents

- Required pipeline map and handoff
- Fine-grained boundaries and dynamic expansion
- Template, item instances and central dispatch
- Three different concurrency controls
- Top-down capacity and throughput selection
- API failure policy
- Python reference and backend choice
- Acceptance and limits

## Required pipeline map and handoff

Before parallel execution, trace the actual producer/consumer code and persist
one input-to-output computation DAG. A node is an independently executable
callable with declared named inputs and outputs. An edge binds a producer output
port's exact artifact version to a consumer input port. Scope artifacts by stable
dataset/item/frame/entity/operation/iteration/output-port identities where relevant,
plus condition, seed and recipe. Bind **all** required parents. Attach callable/
source location, recipe identity, semantic validators, resource profile and output
bounds to the node contract. Render the
declared graph as an editable `.drawio` artifact. A generated graph is a view of
the supplied contract; it is not proof of automatic code dependency discovery.
Verify it against real code, including hidden files, shared fitted state and API
inputs. Fail readiness if those dependencies cannot be bound.

For independently complete outputs, the mandatory default is **per-artifact durable handoff**:

1. Execute the producer using only the declared exact parent versions.
2. Close and validate the output payload; durably commit payload and manifest.
3. Immediately release that artifact's successor edges to the executor's ready pool.
4. Dispatch ready work whenever all its resource and quota gates permit it.

`s2(item A)` must not wait for `s1(item B)` or for a dataset/shard/stage-wide
`gather`. `s3(A)` can run while `s1(B)` is still running. A flush at program exit,
an in-memory Future, a log line, a partially written JSONL line or a directory
listing does not satisfy the artifact commit. Inference microbatches may compute
several items together, but must commit and release each independent completed
item at that boundary; they do not justify waiting for the rest of the dataset.
If per-item file overhead is material, use an append/transaction/object-store
mechanism with separately committed item records and immediate readable receipts.

Separate two predicates: **dependency-ready** means all exact parents are valid
and committed; **dispatchable** additionally means resources, quota, storage and
monitoring permit admission. An artifact does not itself execute: its producer
task executes to create it. This distinction must remain visible in code.

A keyed join waits for its own keys only. A true global fit, normalization,
distributed checkpoint or final full-coverage summary has an explicit barrier
with declared membership. Do not invent global barriers to simplify loops.
The lifecycle's revocation, identity, generation and retention rules still apply.
Bind every node attempt and output to the existing trial execution and storage
namespace in [storage alignment](storage-layout.md); framework caches and worker
scratch are not an alternative retained experiment folder.

## Fine-grained boundaries and dynamic expansion

There is no required stage layer. Trace the code from declared inputs to final
outputs until expensive/reusable independently valid results have explicit
ports. Prefer image detections, batched measurement receipts, entity geometry,
verification proposals and per-iteration decisions over a single perceive/refine/
reason task. A function call graph alone does not establish these dependencies.

Keep three granularities separate:

- **Artifact identity:** independently addressable, validated evidence units.
- **Task execution:** a callable may fuse cheap transforms or atomically produce
  a coupled output bundle; a completed bundle releases all its declared ports.
- **API microbatch:** one request can produce many records. Preserve service
  batching and scientific coupling; do not repeat one shared request per object.

Prefer fine logical boundaries first, then measure dispatch/storage cost before
fusing independent work. A mere directory/file per scalar is not the objective.
For independent outputs produced at different times, split producers or use a
verified native incremental commit facility: returning a dict only when the
whole function ends cannot release its early keys. Multi-output bundle atomicity
is appropriate only when those outputs share a genuine completion boundary.

Declare the graph in project code/config next to its producing code. Each node
binding specifies callable/source revision, typed named inputs, output roles and
schemas, validator identity, complete recipe closure, logical scope, resource
requirements, retry/replay rule and side effects/session owner. Ordinary functions
need not register themselves or import an execution framework. The integration module submits
them through the adapter; the native executor owns actual readiness/dispatch.

Project adaptation is real engineering work: wrap existing pure functions without
changing their algorithms; extract nested monolithic steps when intermediate
results are otherwise hidden; replace implicit file handoffs and shared mutation
with declared ports/state ownership. Merely wrapping three CLI programs does not
expose their internal parallelism. Preserve existing semantics, evidence and
fallback rules; scope project refactoring separately from editing this Skill.

For runtime discovery, commit the decision and exact child membership before
expansion. Derive stable child identities from parent decision version plus
frame/entity/iteration/port; retain that membership in existing execution evidence.
Use native futures/as-completed processing so one discovery result can expand
while another is running. Bound outstanding discovery, task metadata and bytes;
drain completed work before admitting more without imposing fixed waves.
On restart, replay committed membership and exact accepted parents, not a fresh
stochastic discovery call or a directory glob. Expansion is project graph logic,
not another task/resource scheduler.

An iterative dependency is `state[t] -> request[t] -> receipt[t] -> decision[t]
-> state[t+1]`; instantiate the next bounded iteration only when required. Other
items/branches can proceed meanwhile. Keep live simulator/model sessions with an
explicit native owner; task-level extraction needs serializable state, proven
replay/checkpoints or native session affinity. Do not ship a mutable live manager
arbitrarily between workers or speculatively parallelize dependent generations.

Shared mutable edits must become isolated proposals followed by a deterministic,
identity-bound merge before parallelization. Cross-view normalization, coupled
camera pose estimation and checkpoint generations retain their real join scope.
Changing operation order, RNG consumption or fallback selection is a scientific
change unless equivalence is demonstrated.

## Template, item instances and central dispatch

First derive the complete project dependency graph from code; a repeated linear
pipeline is only one special case. Separate task functions from their port
bindings: a computation accepts named inputs and returns named outputs without
looking up predecessor node IDs or calling successors. The framework resolves
ports, loads committed input versions, validates/persists outputs and dispatches
eligible work. The local fixture's key-to-path callback map is a lower-level
artifact interface, not the final computation-only project API.

One computation node can produce several named artifacts. The authoritative
graph connects computation ports; an artifact-only visualization is an optional
projection of that same contract, not a second graph to maintain. Model
branches, joins, shared preparation, optional outputs and genuine global barriers;
declare runtime expansion when membership is unknown until execution. Do not
pretend an arbitrary data-dependent loop has a fully known static DAG.

For repeated independent work, define that subgraph once. Instantiate it per stable input identity;
each instance has its own artifact states and lineage, not a private scheduler.
Use `(dataset revision, item ID, condition, seed, recipe version, operation,
frame/entity when relevant, iteration, output port)` to
distinguish logical outputs; execution/attempt IDs identify physical retries.
The reference's human-readable `Node.key` identifies the item/stage while
`recipe` and parent identities bind the remaining immutable scientific factors.

One project executor owns the run's ready pool and allocations. It releases
producer tasks across all instances when their parents commit, then dispatches
to available compatible workers. A worker need not own an item's whole pipeline:
CPU prepares item B while GPU processes A and scoring handles C. The controller
passes stable IDs, exact parent artifact references and an execution identity;
completion reports the committed artifact identity. Worker pull queues and
scheduler push dispatch are both valid implementations of this ownership.

Dataset ordering is a priority/fairness policy, not an implicit dependency.
Round-robin or weighted fair admission lets multiple datasets progress; explicit
priority can favor a required result without excluding other required members.
Output arrival order is not input membership: reconcile by stable IDs, and sort
only for consumers whose scientific contract requires order. Shared global fits
or final aggregation introduce explicit cross-instance edges/barriers.

The local reference materializes these instances into one finite artifact DAG
and uses coroutine tasks as workers. It does not launch one process or scheduler
per item. For very large/streaming populations, use bounded native task discovery
and a persisted input cursor in the project's existing executor; the finite
reference is not an unbounded stream implementation.

## Three different concurrency controls

| Control | Unit | Decision |
| --- | --- | --- |
| Partition/microbatch size | Items per execution/commit boundary | Measure overhead, semantics, tail memory and downstream release latency |
| In-flight artifact work | Ready producer tasks across all datasets | Fill resource-feasible slots continuously; bound pending metadata and bytes |
| API concurrency and rate | Requests for a real provider quota scope | Shared in-flight ceiling plus request/time and token/time limits |

Make all authorized datasets eligible together; discover large input collections
through bounded native queues. Do not execute fixed groups of datasets and wait
for the slowest member before admitting the next group. Dataset count alone is
not a memory model. Independent ready work uses released capacity immediately.
Interleave datasets at admission and use downstream priority plus aging/fairness
to avoid producer queues burying consumers or starving long/rare items.

An API limit belongs to the actual account/project/model/endpoint quota scope,
not to each shard. Ten shards each constructing an independent limit of 20 must
not create 200 requests against a shared limit of 20. Request concurrency, RPM,
TPM and connection pools are separate constraints. Reserve input plus an enforced
maximum output-token bound; adapt headers/quota grouping to the actual provider.
Other processes sharing that quota need the same native distributed limiter or
explicitly partitioned quotas. A process-local governor cannot enforce their use.

## Top-down capacity and throughput selection

Eliminate arbitrary choices such as “start with two datasets.” First establish
the **maximum admissible ceiling**, using measured tail/overlap resource demand
and available allocations after reserves. For homogeneous tasks:

`ceiling = min(ready demand, provider cap, floor(available resource / task peak) for each resource)`.

Use aggregate resource vectors and actual device placement for heterogeneous
tasks and multi-GPU gangs. Do not divide host-wide free VRAM across unrelated
devices. RPM/TPM need time-based admission, not just another worker-count cap.
Unknown peaks require a bounded profiling run; do not launch all `n` blindly to
discover an OOM limit. Where independent resources permit it, all `n` may run.

Start a **bounded, matched end-to-end pilot at that admissible ceiling**, then
compare lower candidates top-down. Record exact workloads, successful validated
outputs, total elapsed time including retry/commit/drain, resource peaks and
failure accounting. The reference probe explores a descending halving sequence
with a fixed trial budget; it selects the best measured useful throughput, with a
declared near-tie rule. Budget and time limits stop exploration deterministically.
This is not binary search for a global throughput optimum: throughput need not
be monotonic, particularly when APIs throttle or stage contention changes.

After selection, fill the selected envelope continuously. Native controllers
can adjust preauthorized knobs using measured feedback. API overload causes a
shared cooldown and multiplicative decrease; stable successes permit additive
recovery to the authorized ceiling. This is congestion control, not proof of
optimal throughput. Reprofile a changed workload/resource scope. If load or
concurrency is itself the benchmark variable, freeze it as a scientific condition
instead of adapting it to improve a model's score.

The objective is the shortest time to **all required validated results** under
budgets, not the largest number of processes or attempts. Keep retry cost and
the long tail in the denominator. No static framework can promise the global
maximum for unknown task times, interference and changing provider capacity.

## API failure policy

| Outcome | Action |
| --- | --- |
| 429 / declared overload | Apply quota-scoped cooldown, honor Retry-After, decrease admission; retry only eligible requests |
| 408, timeout, selected 5xx, transport transient | Bounded backoff with jitter when replay is safe; honor provider cooldown; retain attempts |
| Authentication/authorization/bad request | Surface failure immediately; do not repeatedly spend quota on the same request |
| Unknown remote outcome / non-idempotent action | Reconcile by provider request identity or stop; a timeout does not prove nothing happened |
| Retry/deadline/budget exhausted | Record incomplete required output and fail/pause the affected scope; never silently drop it |

Disable nested SDK retries or include them explicitly in one attempt owner.
Free HTTP request slots before waiting to retry; do not hold a connection while
sleeping. Reservations account for retries and must not reset merely because a
response failed. Never retry indefinitely. Reusing the same idempotency key must
follow the provider's actual semantics; stochastic requests can otherwise create
different scientific results. Map raw HTTP status, Retry-After seconds or date,
and transport failures into the adapter's explicit error contract.

## Python reference and backend choice

The bundled reference uses Python 3.11+ standard-library `asyncio` and
`graphlib.TopologicalSorter`, with local POSIX file locking and fsync/rename.
There are no installation dependencies or implicit external calls:

- `scripts/artifact_dag.py`: artifact nodes, exact parent binding, per-item atomic
  commit, restart validation, bounded live tasks/resource vectors, immediate
  successor release and exact declared graph export.
- `scripts/api_governor.py`: one shared async quota scope, RPM/TPM reservation,
  concurrent request limit, classified bounded retries and overload recovery.
- `scripts/concurrency_probe.py`: bounded top-down candidate measurement and
  selection, independent of any particular API or experiment.
- `scripts/pipeline_demo.py`: an offline three-dataset example with a slow item,
  an injected 429, all intermediate commits and a final coverage barrier.

Run the demo in non-synchronized local storage:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 <skill>/scripts/pipeline_demo.py --output <local-runtime>/demo
```

It emits `pipeline.drawio`, exact attempt/commit evidence, events and a synthetic
summary. Re-running with the same immutable recipe/input identities revalidates
and reuses commits. Change the recipe when code/config/model/input/seed changes;
the helper cannot infer the transitive scientific closure from a Python function.
Never put credentials in identities, node keys, events or DAG labels.

For new research integrations, apply the [ClearML-first selection](framework-selection.md)
and [management/execution binding](clearml-integration.md). Use native Pipeline
components for suitable known graphs, Ray Core for dynamic Python/session work,
or the selected file-workflow engine; each graph has one execution owner.
`scripts/retained_node.py` supplies the shared computation/load/commit boundary,
not a ClearML server, store, API gateway or distributed recovery implementation.
Project bindings remain required; illustrative SDK wiring is not runtime validation.

Bind the selected executor to the native artifact store; do not wrap `DagRunner`
inside its workers as a second scheduler.
`Node` callbacks and the local `ApiGovernor` are only the standalone fixture API.
Its governor is process-local: constructing one per worker or ClearML component multiplies quotas
and is prohibited for a shared provider scope. Use a verified shared service or
an existing request gateway; explicitly partition quotas only when enforceable.
API adapters enforce the same output-token bound reserved with the controller.
Pass full input membership to the final barrier.

Where a project already has an executor, map these contracts onto it instead of
running a second scheduler. Additional backend mechanisms reviewed against
official docs on 2026-09-20 (selection policy is in framework-selection.md):

| Backend | Useful native mechanism | Additional contract still required |
| --- | --- | --- |
| ClearML Pipeline | Function components, output-artifact dependencies, native Task records | Exact immutable commits, suitable per-node overhead, dynamic expansion verification, shared quotas |
| Ray Core | ObjectRef dependencies and logical CPU/GPU resources | Durable item commit, quota scope, physical resource limits, provider reconciliation |
| Snakemake | File dependencies, per-checkpoint DAG expansion, executor resources | Exact artifact validation/identity, shared API quotas and pinned executor semantics |

These are reuse options, not a claim that the reference implements every backend.
Prefer a compliant installed project executor; use the local reference
as an attended single-host async/API behavioral fixture. Framework replacement
and cluster deployment are separate, explicitly scoped operations.

## Acceptance and limits

The minimum executable oracle includes slow-peer independence, exact join
readiness, no release after validator failure/partial writes, shared aggregate
resource/API limits, cancellation cleanup, bounded retries, corruption rejection,
recipe-sensitive restart reuse and all-input final coverage. Test an actual
adapter with its storage/provider before claiming the same guarantees there.

The reference is deliberately bounded: a finite declared DAG, one cooperative
event loop and one owner of a trusted local artifact root. Payloads are bounded
bytes, and commit/hash/validation are synchronous; large tensors, expensive
validation, millions of nodes and distributed checkpoints need a native backend.
Logical RAM/CPU amounts are admission accounting, not measured hard enforcement.
Disk free-space reservations cover this owner's bounded writes, not unrelated
writers or total retention forecasting. Existing valid evidence is never deleted.
All unexpected node failures fail the local run and cancel cooperative siblings;
unaffected committed artifacts remain eligible for validated restart reuse.

It does not implement an independent watchdog, hard subprocess/GPU termination,
live external revocation, cross-process API coordination, multi-host allocation,
exactly-once API effects or complete study closure. Do not advertise unattended
production readiness or measured speedup from the offline demonstration.

Sources: [Python graphlib](https://docs.python.org/3/library/graphlib.html),
[asyncio tasks](https://docs.python.org/3/library/asyncio-task.html),
[Ray resource limits](https://docs.ray.io/en/latest/ray-core/patterns/limit-running-tasks.html),
[Ray object fault tolerance](https://docs.ray.io/en/latest/ray-core/fault_tolerance/objects.html),
[ClearML components](https://www.clear.ml/docs/latest/docs/pipelines/pipelines_sdk_function_decorators/),
[Snakemake checkpoints](https://snakemake.readthedocs.io/en/latest/snakefiles/rules.html#data-dependent-conditional-execution).
