# Project integration and launch readiness

Use for research-project initialization/onboarding, experiment-related code/config
changes, project-fit assessments, integration changes and launch-readiness claims.
Map existing facilities to the lifecycle contract; do not require a new platform,
parallel ledger or wrapper when the project already supplies the guarantee.

## Initialize or onboard a research project

With the project's contract workflow, record a compact binding in existing
architecture/config documentation, linked from its root instructions. Create only
missing pieces needed by the authorized work; do not impose a new directory tree.

| Stable binding | Project evidence |
| --- | --- |
| Configuration | Entrypoint and precedence for defaults, recipes, CLI/environment and tracker overrides; command/path that reports final effective values. |
| Computation | Callable inputs/named outputs, validators, randomness and mutable-session ownership; declared external effects and retry boundaries. |
| Artifacts | Store/catalog interface, schemas, accepted-version references, staging/output isolation and commit/recovery owner. |
| Management/execution | Exact GitHub repository and native study mapping; selected tracker, executor and quota authority, or explicitly unbound status. |
| Verification | Proportional offline checks and the separately authorized real execution entrypoint; what each result proves. |

Root instructions hold stable boundaries and links. Versioned study recipes hold
model/data revisions, seeds and scientific factors; execution records hold actual
allocations, endpoints, resolved settings, attempts and receipts. Keep credentials
and private locators in their authorized private bindings, not root instructions.
Computations should not initialize trackers or create Issues; use the reviewed
execution boundary for tracking and artifact I/O. Preserve necessary explicit
state/tool effects rather than pretending every function is pure.

No chosen backend or credentials is an honest unbound status, not a reason to
provision a service. Authorized domain-code work and offline engineering checks
may continue while dependent launch readiness remains unresolved. Do not create
an Issue/Task per function or per ordinary edit. Connect actual research studies
to the existing [GitHub workflow](github-workflow.md) before dependent execution.

## Assess research-code change impact

Trace actual behavior, not the label "refactor" or "performance-only". Record
applicable impacts in the existing change/PR or study record; use a draft if
external writes are not authorized. A new change ledger is unnecessary.

| Change | Required decision before accepting dependent results |
| --- | --- |
| Behavior-preserving internal edit | Relevant engineering checks; no automatic new scientific trial or tracker Task. |
| Data processing, prompt/model settings, randomness | Assess condition/recipe and comparison changes; revise applicable identity and invalidate affected outputs. |
| Ports, schema, serialization, cache key or dependency | Check consumers and commit/reuse compatibility; invalidate only proven affected descendants, never trust filename or item ID alone. |
| Batching, ordering, precision, concurrency, retries or state ownership | Assess scientific equivalence as well as aggregate resources and side effects; unknown equivalence is not a transparent infrastructure change. |
| Scorer, metric or analysis | Preserve valid raw outputs; recompute affected analysis for comparable arms and reassess dependent conclusions. |
| Tracking or launch wrapper | Trace effective settings and physical-attempt associations; reporting repair must not repeat computation. |

State what can be reused, what needs a new version/recomputation, and what remains
unverified. Engineering tests do not accept a scientific conclusion. A source-only
request ends with static evidence and the deferred runtime checks, not a probe.

Keep ordinary PR checks separate from expensive scientific dispatch. CI can check
config/schema, declared node contracts, small offline fixtures and the requested
engineering behavior. Real experiment jobs require the frozen study, exact source
and normal execution authority; a PR event or successful unit test does not grant
that authority. Preserve required experiment trials when setting cancellation or
queue policies, and retain scientific bytes outside expiring CI artifacts.

## Evidence before capability claims

Pin the reviewed Skill source and project commit/tree or immutable dirty-source
snapshot. Distinguish these from the installed Skill and deployed worker source.
Do not switch or clean a user's working tree to perform an assessment.

For each relevant capability, record the following in an existing project review
or execution record. These are separate evidence dimensions, not a numeric score:

| Dimension | Evidence to retain |
| --- | --- |
| Specified | Applicable requirement and declared scope. |
| Bound | Concrete caller, implementation and configuration that enforce it; name missing bindings. |
| Statically checked | Exact source and inspected path, invariants and unresolved branches. |
| Runtime verified | Exact deployed revision, scenario, terminal receipt and observed guarantee; otherwise unverified. |

Cover only relevant capabilities: recipe/source identity, tracking, dependency
handoff, storage validation/commit, recovery, quota/resource admission and
comparison. An installed dependency, decorator example, Protocol, directory or
dashboard is not evidence of a working binding. End-of-batch JSONL output does
not establish per-item durable handoff. Static inspection cannot prove atomicity,
recovery, stop latency or maximum throughput. Existing runtime evidence applies
only to its verified configuration and scope.

Honor code-only or no-execution requests: identify missing checks without running
imports, fixtures, launchers, services or experiments. Missing runtime evidence
limits the claim; it does not expand authority. Report separately what needs a
reusable Skill correction and what needs project code/configuration. Assessment
alone does not authorize either edit.

## Resolve the effective experiment contract

Before dependent execution, bind the selected study/campaign revision and recipe
to the actual execution path, using existing manifests or native fields:

- applicable project instructions, scoped amendments and selected recipe identity;
- actual worker source/dependency snapshot, expanded config and CLI/environment
  overrides (including tracker/remote overrides), data/model identities and
  result-affecting serving settings;
- exact input collection/parent versions, comparison arm, replicate and physical
  attempt identities, output namespace and required validators;
- branch/fallback conditions, input modality, permitted tool effects and failure
  accounting, including which settings may adapt without changing the science.

Resolve conflicts by instruction authority and explicit scope/supersession, not
file timestamp or a universal assumption that every newer recipe replaces every
older one. Historical launchers may remain valid for their original recipes.
Trace scientific options through launcher parsing, defaults and forwarding to
the consuming computation, including reconstructed state. A recipe file or flag
name alone does not prove use. Preserve the resolved values and source references;
if a material mismatch remains, block that launch and continue independent work.
Never silently change fallback, precision, token limits or sample membership to
make a run launch or improve throughput. Check deployed effective values when
execution is authorized; static tracing is not proof of a live deployment.

## Concurrent branches and shared resources

Keep Git branch, scientific condition, DAG branch, replicate and retry identities
distinct. Config-only trials need not create Git branches. Follow
[collaboration](collaboration.md) for source ownership and
[storage alignment](storage-layout.md) for private output/staging namespaces.
Shared inputs must be exact accepted immutable versions. Bind paired stochastic
parents by content/lineage, not item IDs alone; a retry is not a new replicate.
Use [dependency-scoped reuse](lifecycle.md) when upstream code or inputs change.

Trace every API path, including tools, fallback, judging and nested SDK retries,
to its real quota scope. Across processes/branches, verify one shared admission
authority or explicit partitions whose total fits the quota. Per-worker limits,
local adaptive controllers and independent worktrees do not establish aggregate
API/GPU/resource limits. Record the owner, scope, competing allocations and retry
budget in the existing execution binding; do not add a second scheduler. Follow
[artifact concurrency](artifact-concurrency.md) for admission and bounded retries.

Before claiming automated parallel execution ready, identify concrete bindings
for independent output commits, mutable-session ownership, resource admission,
attempt reconciliation and tracking. Missing bindings remain project integration
work; neither prose compliance nor a successful SDK installation fills them.
