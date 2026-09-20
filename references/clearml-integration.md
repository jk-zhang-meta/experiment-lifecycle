# ClearML management with one project executor

Read this with [the artifact lifecycle](lifecycle.md), [storage alignment](storage-layout.md),
[artifact concurrency](artifact-concurrency.md), and [framework selection](framework-selection.md).
It is an integration reference, not an installation, launch command, scheduler, store,
or migration. Reuse the mature project artifact store; this reference does not pin MinIO
or another storage product.
Apply [project readiness](project-readiness.md) before claiming these bindings
exist: the store Protocol and illustrative SDK calls below specify seams, not
an implemented project store, distributed quota service or recovery controller.

## Ownership and identity

Keep one authority per fact. Bind the same immutable study/trial/execution and storage
identities through each system; do not create a ClearML-only results tree or mirror ledger.

| Fact | Authority | Binding required before execution |
| --- | --- | --- |
| Goal, hypothesis, review, milestones and code-change plan | GitHub | Immutable repository ID, issue/milestone references, source commit/tree and study revision. |
| Comparison views, measurements and convenience artifact indexes | ClearML Task/project | Project/task IDs and only redacted durable-store locators or immutable commit/index IDs. |
| Physical submission, allocation, retry, cancellation and terminal attempt state | Selected native executor | Provider job ID plus the native `execution_id`, parent/retry link and `node_attempt_id`. |
| Accepted bytes, lineage, validation, fencing, retention and revocation | Project-owned artifact store | Storage namespace/binding, immutable version/manifest IDs, staging prefix and commit receipt. |

GitHub plans are not execution state; ClearML measurements and indexes are not scientific
acceptance; executor status is not durable artifact evidence; and a storage path is not an
accepted version. The storage binding and private location mapping follow
[storage alignment](storage-layout.md); validation, commit, replay and consumption follow
[the lifecycle contract](lifecycle.md).

Use ClearML Pipeline components when the computation DAG is known at submission time and
component overhead fits. Use Ray Core when graph expansion is data-dependent or a resident
model needs to stay with a single executor. Select one executor for a computation DAG. A
ClearML Pipeline can manage the known-DAG case; it does not automatically create or record
every Ray node in a Ray-managed DAG.

In either mode, application functions are domain computations with declared domain-value
inputs and named domain-value outputs. Any API or tool side effect needs declared replay and
recovery rules. Functions do not load paths, write artifacts, commit manifests, schedule
successors, or make tracking decisions. The project store and
`retained_node.execute_node` fence the attempt, load accepted refs, validate and atomically
commit the output bundle.

Before invoking `execute_node`, allocate the complete `NodeAttempt` contract in
`scripts/retained_node.py`: study/trial/execution and parent IDs, node-attempt ID,
logical key, recipe/validator IDs, unique output ports, storage binding, staging
key and output bundle. Every input leaf is an `ArtifactRef`; nested dict/list/tuple
containers are supported, raw leaves are rejected. Outputs must be a dictionary
with exactly the declared ports. Coupled ports commit together; independent early
outputs need separate completion boundaries.

The helper delegates identity validation to the store. Its `record_started` must reject incomplete/empty preallocated
identity fields and an empty or non-unique output-port contract before granting the fence.

| Store method | Required responsibility |
| --- | --- |
| `load_accepted(ref)` | Load the exact validated, available, non-revoked artifact version. |
| `record_started(attempt)` | Validate and exclusively fence the attempt before computation. |
| `record_failed(attempt, failure)` | Retain sanitized failure and partial-output/log associations. |
| `validate_and_commit_bundle(attempt, outputs, lineage)` | Validate exact parents and named outputs, atomically publish the bundle, retain success and return accepted references. |

## Illustrative bindings — not executed

The following project placeholders must be pinned to the reviewed source, exact native store
binding, ClearML project/task identity, and native execution identity before use. The
functions and store factory must be top-level members of a reviewed project package deployed
to the ClearML agent/Ray runtime; neither system should be expected to serialize arbitrary
closures or make local modules importable. These are not runnable setup code and do not
install or start ClearML or Ray.

```python
from clearml.automation.controller import PipelineDecorator
from scripts.retained_node import ArtifactRef, NodeAttempt

@PipelineDecorator.component(return_values=["score_ref"], cache=False,
                             retry_on_failure=0)
def score_component(attempt: NodeAttempt, frame_ref: ArtifactRef,
                    model_ref: ArtifactRef) -> ArtifactRef:
    # These imports resolve from the reviewed project package deployed to this task.
    from reviewed_project.nodes import score
    from reviewed_project.store import project_store_factory
    from scripts.retained_node import execute_node
    accepted = execute_node(project_store_factory, attempt, score,
                            (frame_ref, model_ref))
    return accepted["score"]

@PipelineDecorator.pipeline(name="reviewed-score", project="bound-clearml-project")
def score_pipeline(attempt: NodeAttempt, frame_ref: ArtifactRef,
                   model_ref: ArtifactRef) -> ArtifactRef:
    # The controller supplies bindings to this pipeline context only.
    return score_component(attempt, frame_ref, model_ref)

# The controller invokes score_pipeline with attempts and refs bound to the GitHub
# study revision, ClearML Task/project, executor record, and project storage binding.
```

For each new physical execution, create a new ClearML Task with
`reuse_last_task_id=False` and first persist/verify its explicit Task-ID-to-native-
`execution_id` association. Resume only an explicitly selected Task whose stored association
matches the selected native execution. Task cache/reuse candidates require complete recipe
and exact-parent validation by the project store before any artifact reuse.

For a dynamic or resident-model DAG, use the same retained-node path under Ray Core. This
example passes dependency refs as top-level Ray arguments only; it makes no claim about
automatic resolution of `ObjectRef` values nested in containers.

```python
import ray
from scripts.retained_node import ArtifactRef, NodeAttempt, execute_node

@ray.remote(max_retries=0)               # native controller authorizes retries
def score_node(attempt: NodeAttempt, frame_ref: ArtifactRef,
               model_ref: ArtifactRef) -> dict[str, ArtifactRef]:
    from reviewed_project.nodes import score
    from reviewed_project.store import project_store_factory
    return execute_node(project_store_factory, attempt, score,
                        (frame_ref, model_ref))

# `frame_ref` and `model_ref` are top-level ObjectRef dependencies whose values are
# accepted ArtifactRefs. Allocate/pin `next_attempt` before this submission.
bundle_ref = score_node.remote(next_attempt, frame_ref, model_ref)
```

Ray retries are disabled here because a worker loss or unknown provider result is an
uncertain native attempt. The project controller first reconciles the retained store and
provider record, then allocates a new execution/node-attempt identity with a parent link for
an authorized replay. Store fencing and idempotent/conditional commit remain required even
with retries disabled.

## ClearML artifacts, quotas and recovery

Treat a ClearML Task artifact as a measurement/index copy, not the artifact-store commit.
Repeated uploads under one Task artifact name may replace the visible Task artifact, and
background upload is unsuitable as readiness evidence. After the project store has made and
verified an immutable commit, an integration may upload a uniquely identified manifest/index
with synchronous completion (for example, `wait_on_upload=True`) and verify the returned
ClearML record. Keep the immutable store commit receipt as the authority; do this outside
`execute_node` so the generic helper stays backend-neutral.

If failure reporting to ClearML is interrupted or duplicated, reconcile the existing
Task/execution association and stored terminal record before reporting again. Reporting must
not repeat a stochastic computation, artifact commit, or external effect merely to restore
tracker visibility.

Every worker/process shares the project API quota service or existing distributed admission
bridge. A per-worker governor or generic semaphore does not establish requests-per-minute
control across workers. The selected executor owns dependencies and resource scheduling;
the quota authority admits external calls; ClearML holds its linked measurements/indexes;
and the project store retains recovery evidence.

This reference has not been executed against ClearML, Ray, or a project store. Before
enabling either binding, validate the pinned integration's fencing, immutable commit,
synchronous index upload, uncertain-attempt reconciliation, restore path and shared-quota
admission under the project's lifecycle contract.
