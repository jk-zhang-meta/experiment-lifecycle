# Experiment platform and computation DAG selection

Status: approved ClearML-first selection based on official-source review,
2026-09-20; no ClearML/Ray integration or comparative benchmark has been run.
Earlier evidence comprises a bounded offline Python project pilot:
Dagster 1.13.23 and Dask/distributed 2026.8.0 were exercised. These are pilot
versions, not required pins for all projects or a live throughput benchmark.
The retained-node helper and current bindings have not been runtime-validated;
the user deferred further runs. Pilot results do not validate the current code.

Contents: [Decision](#decision), [Component ownership](#component-ownership),
[Division of responsibility](#division-of-responsibility),
[Earlier framework evidence](#framework-evidence),
[Acceptance](#required-proof-before-choosing-a-backend),
[Evidence limits](#current-workspace-evidence-and-remaining-work).

## Decision

The proposed architecture is sound: the agent derives an explicit dependency
contract from the real project, while a deterministic framework owns execution,
input loading, output validation/commit, retries and resource admission. Nodes
contain domain computation and accept/return typed values or typed artifact
handles. Nodes do not name upstream workers, open guessed upstream filenames,
push to downstream workers or choose their own global concurrency.

Use **ClearML as the first-choice management platform for new integrations**.
Keep the node/port/artifact contract backend-neutral and retain a compliant
existing tracker/executor. This preference does not require installing services
for ordinary tests, migrating historical experiments or sending private data to
a hosted service. Bind the authorized deployment and supported versions first.

| Project requirement | Preferred execution choice alongside ClearML | Check before adoption |
| --- | --- | --- |
| Known input membership/dependencies; components large enough to amortize task startup | ClearML native Pipeline components | Per-item wiring, upload/commit boundary, agent capacity and startup cost |
| Dynamic fine-grained Python branches, distributed computations or resident model/session workers | Ray Core | Explicit ClearML node-record bridge, durable restart, resource ownership and shared API quotas |
| File targets, command-line simulations and HPC job graphs | Snakemake | Exact file identity/validation, checkpoint expansion and executor resource semantics |
| Compliant existing project executor | Keep that executor | Map missing guarantees without a second scheduler or forced migration |

Use one executor for the computation DAG. In Ray mode ClearML may launch/observe
the driver, but Ray owns its workers and CPU/GPU admission. Do not schedule each
node independently through both ClearML Agent and Ray against the same allocation.
Known per-item dependencies can be wired without a whole-dataset join; waiting
for one producer's successful commit is not a global barrier. Dynamic discovery
must preserve per-decision expansion/recovery, not silently gather every result.

Read [ClearML integration](clearml-integration.md) for the concrete identity and
I/O seam. This is a selected architecture, not a claim that ClearML plus Ray is
an off-the-shelf durable DAG bridge. An additional graph authoring package is not a
default dependency. No matched throughput evidence establishes a universal winner.

## Component ownership

| Concern | Default owner | Avoid |
| --- | --- | --- |
| Goals, hypotheses, review and acceptance decisions | Existing GitHub/versioned study contract | Replacing scientific acceptance with a tracking UI status |
| Measurements, comparisons and artifact indexes | ClearML, linked to native trial/execution identities | Parallel MLflow/W&B records for the same authoritative fact |
| Dataset versions | ClearML Data finalized IDs, or an existing dataset registry | Mutable latest/name references; mandatory duplicate DVC history |
| Configuration composition | Existing config; Hydra when composition is useful | Independent multirun launcher competing with the trial owner |
| Search/sweeps | ClearML HPO using Optuna when needed | Simultaneous Hydra Sweeper, standalone Optuna and Ray Tune trial creation |
| Node execution | Selected native executor | An LLM or bundled local fixture dispatching around that executor |
| Artifact bytes | Existing retained filesystem or supported S3-compatible store | Ray object store, worker scratch or SDK upload enqueue treated as durable evidence |
| API admission | One actual quota-scoped authority | One limiter per dataset/worker; semaphore slots presented as RPM/TPM |
| Source/environment | Git plus existing dependency lock and suitable container when needed | Installing a new environment stack solely for this Skill |

ClearML natively integrates [Hydra configuration capture](https://www.clear.ml/docs/latest/docs/integrations/hydra/)
and [Optuna-backed HPO](https://www.clear.ml/docs/latest/docs/clearml_sdk/hpo_sdk/).
Finalized [ClearML datasets](https://clear.ml/docs/latest/docs/references/sdk/dataset/)
provide versioned identities; ordinary Task artifacts are not automatically immutable.
Keep an existing DVC workflow when it owns required data history; do not migrate
it solely to match the default. Search is optional, not a prerequisite for a
fixed scientific matrix. Freeze configuration/seed membership under the study
contract; adaptive search cannot silently replace required comparisons.

Select storage by the project's existing authorized durability/retention boundary.
ClearML supports [S3-compatible storage](https://clear.ml/docs/latest/docs/integrations/storage/),
but do not hard-code MinIO as a required product. The official
[MinIO repository](https://github.com/minio/minio) was marked archived when checked
on 2026-09-20; recheck maintenance/support before a new deployment. A fileserver
is sufficient where it meets the contract. Object storage does not replace
ClearML metadata-service backup or the existing artifact acceptance manifest.

[ClearML components](https://www.clear.ml/docs/latest/docs/pipelines/pipelines_sdk_function_decorators/)
can bind function outputs to dependent components. Dynamic behavior and release
cost still need validation against the pinned version. [Ray resources](https://docs.ray.io/en/latest/ray-core/scheduling/resources.html)
are logical admission controls, not measured physical caps or API rate limits.
[Snakemake checkpoints](https://snakemake.readthedocs.io/en/latest/snakefiles/rules.html#data-dependent-conditional-execution)
and [Nextflow processes](https://docs.seqera.io/nextflow/process) support item-specific
progress; neither should be dismissed as requiring a global stage barrier.

## Division of responsibility

| Owner | Responsibility |
| --- | --- |
| Agent during integration | Trace real code, make hidden inputs/state explicit, identify safe task boundaries, generate graph/port bindings and validators, assess semantic independence |
| Graph definition | Named typed inputs/outputs, branch/join rules, item and dataset identities, versions, resources, optional-output behavior, real global barriers |
| Framework I/O layer | Resolve input references, load inputs, validate outputs, durably publish artifacts, return exact identities and maintain lineage |
| Existing executor | Schedule eligible tasks, enforce allocations and queue limits, handle worker state and bounded retry/cancellation |
| Quota controller | Share API concurrency/RPM/TPM limits across all relevant tasks and datasets; classify and bound retries |
| Computation function | Compute outputs from supplied inputs; report domain failures; do not route data or orchestrate other nodes |

Use one input-to-output graph contract: nodes are independently executable
computations with named ports, and edges bind immutable output artifacts to
consumer inputs. One node may produce several artifacts. No stage hierarchy is
required. An artifact-only diagram may be generated as an optional projection.
Support fan-out, fan-in, shared preparation, multiple outputs and dynamic expansion.

A complete DAG cannot reliably be inferred from arbitrary Python by static
reading alone. Files, databases, environment variables, global RNG/model state,
dynamic branches and side effects can hide dependencies. Agent inference must
become explicit executable bindings and be checked against a representative
real path. Dynamic membership needs an expansion contract; loops require bounded
unrolling or a workflow model that supports iteration. A function call graph is
not itself a data-dependency graph.

## Framework evidence

Earlier Dagster/Dask pilots and their limitations are retained in
[the historical evidence below](#current-workspace-evidence-and-remaining-work).
They do not select the current stack. The former Dask-specific adapter and
integration guide have been removed; the backend-neutral retained-node helper
remains. Use [ClearML integration](clearml-integration.md) for current wiring.
Compliant existing executors are handled by the general reuse contract, without
maintaining a separate bundled adapter for each framework.

## Required proof before choosing a backend

Use the same small arbitrary graph for each candidate, not a linear-only demo:

1. Shared preparation feeds two branches with different resources, followed by
   a keyed join, independent per-item work and a true final coverage barrier.
2. One deliberately slow item cannot delay another item's eligible downstream.
3. A node function receives domain inputs and returns outputs; only the I/O layer
   knows storage paths, predecessor bindings and accepted artifact identities.
4. Inject invalid output and a failure between payload write and durable commit.
   Neither can release a consumer. Restart revalidates committed identities.
5. Multiple datasets share one API limiter; an overload wave honors cooldown,
   bounded retries and full required membership without request amplification.
6. Measure end-to-end validated throughput, schedule/commit overhead and peak
   resources under matched inputs. Do not select by worker count or GitHub stars.

Keep adaptation policies outside the node functions. A dependency graph reveals
available parallelism; measured resource budgets and provider quotas determine
admission. No candidate's documentation proves automatic globally optimal
concurrency for an unknown experiment.

## Current workspace evidence and remaining work

The draft local fixture passes 32 Python checks, and the 26 existing Node helper
tests passed before subsequent Python-only corrections. A synthetic 12-item
example committed 37 artifacts and demonstrated fast-item s3 before slow-item s1.
These are engineering checks, not real API/GPU performance measurements.

Independent review found two local-reference defects: fractional reservation
residue and accepting a visible artifact after failed directory fsync. Both have
targeted regression tests and corrections; follow-up review is recorded in the
private task ledger. This reinforces the decision to reuse a mature execution
engine rather than grow an unbounded custom scheduler.

Framework suitability requires project-owned evidence: check when mapped
consumers actually start, whether dynamic dependencies preserve committed-output
gates, and whether retries/recovery retain exact identities. A generator yield,
isolated subgraph or mocked service does not prove complete pipeline support.
Keep private project investigations and their detailed results outside this
generic package.

No supported end-to-end project run, arbitrary-code DAG extraction, API
saturation, physical GPU enforcement, distributed recovery or maximum throughput
is established by the local fixture. Fresh output roots and service substitutes
cannot validate a reusable production store.

The retained-node helper delegates persistence to a project store protocol;
it has static review only. Fresh-session skill behavior and host activation are
separate checks. Do not silently install the draft or call it a released
production concurrency framework.
