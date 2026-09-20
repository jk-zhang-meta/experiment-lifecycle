# Experiment Lifecycle

One required entrypoint for GitHub-managed repository research: goals, milestones,
studies, trial batches, problems, decisions and verified archive closure. GitHub
is required for the research lane; existing executors and artifact stores own
runtime work and durable evidence. Engineering tests and capacity-only checks
retain proportional lightweight lanes.

The first-verified-result strategy is integrated into development;
it is no longer a separate lifecycle dependency or a full-study completion rule.
GPU model loading, capacity probes and admission are also integrated here;
`gpu-experiment` is no longer a separate Skill dependency.

## Use the right evidence scope

- Repository research requires a verified GitHub binding and linked goal,
  milestone acceptance and experiment records before launch. Read
  [research management](references/research-management.md),
  [GitHub workflow](references/github-workflow.md) and the applicable
  [record templates](references/research-records.md). Milestones have evidence
  criteria; trial volume and GitHub closed-Issue percentage do not prove progress.
- Multi-person/agent work follows the [collaboration contract](references/collaboration.md):
  scoped ownership, exclusive native task claims, isolated writes, revision-bound
  reviews, explicit handoff/takeover and contribution records. GitHub assignees
  do not lock tasks; multiple agents using one account are not multiple human
  approvals. Configure native enforcement only within repository authority.
- Ordinary unit/integration/end-to-end checks use the project's test runner and
  an engineering oracle; no scientific manifest is required merely to run a test.
- Dataset-based dev distinguishes risk-based engineering coverage from statistical
  screening and population estimation. Use exact dataset identity, relevant
  strata/groups/interactions and reproducible membership; omit an underpowered
  effect screen without waiving engineering readiness or formal coverage.
- Formal experiments preserve the full planned coverage and all research evidence,
  including failures, intermediates, retries, analyses and final results.

For research-project initialization and code/config changes, use
[project readiness](references/project-readiness.md): bind configuration,
computation, artifacts and tracking early, then assess change impact. Reuse the
project's architecture/recipes/records; setup does not authorize a service or
experiment launch. Separate specified, bound, statically checked and runtime-
verified capabilities, including canonical versus installed Skill versions.

Read [SKILL.md](SKILL.md) for the entrypoint, [dev validation](references/dev-validation.md)
for sampling and readiness (including a MindCube example), and the
[lifecycle contract](references/lifecycle.md) for artifact commits, pipelining,
backpressure, continuous monitoring, stopping, invalidation, reuse and retention.
Read [GPU execution](references/gpu-execution.md) before model loading, capacity
probes or GPU scheduling; its helper is `scripts/gpu-plan.mjs`.
Read [performance control](references/performance-control.md) before expensive
scale-up: separate correctness and capacity dev, measure the whole pipeline,
declare bounded native feedback, and report bottlenecks and wasted compute.
The [executable concurrency reference](references/artifact-concurrency.md) adds
fine-grained artifact handoff, explicit dynamic expansion, resource admission,
shared API quotas/retries and bounded top-down concurrency probes. The contract
binds existing experiment staging, outputs, logs and retained references; it
does not create a parallel results tree. [Framework selection](references/framework-selection.md)
sets ClearML as the first-choice management platform for new integrations, with
native Pipeline, Ray Core or file-workflow execution selected by project needs.
Compliant existing platforms remain supported; there is no mandatory migration.
It does not implement a distributed autoscaler or claim measured speedups.
[Acceptance scenarios](references/evaluation.md) and [primary-source rationale](references/research-basis.md)
are maintained in this same repository. No second Skill repository is required.

## Protocol versus bundled helper

The [ClearML integration](references/clearml-integration.md) defines study/trial/
attempt mappings, native Pipeline and Ray execution ownership, committed-output
handoff and explicit tracking gaps. Hydra configuration composition and Optuna
search are optional integrations, not competing launchers. Use an existing
durable filesystem/S3-compatible store; MinIO is not a required dependency.
ClearML records do not replace GitHub research decisions or scientific closure.

`scripts/retained_node.py` is the shared computation-only load/fence/validate/commit
seam used by the illustrative ClearML/Ray bindings. The store
implementation remains project-owned. It provides no scheduler, tracking service,
distributed quota system or automatic recovery across service failures.

The shared helper extraction and ClearML/Ray wiring are **not runtime-validated**;
only static checks/review are in scope for this revision. No ready-to-run generic
ClearML-to-Ray per-node tracking bridge is claimed. Monolithic steps and hidden
file/state dependencies need scoped project refactoring. Earlier Dagster/Dask
project subgraph pilots are retained historical evidence, not validation of
the shared helper or current bindings. Static review does
not establish production durability, restoration or throughput.

The Python reference in `scripts/artifact_dag.py`, `scripts/api_governor.py` and
`scripts/concurrency_probe.py` is separate from the legacy v1 recording helper.
It runs attended single-host cooperative async work on trusted local POSIX
storage. It commits each validated item before releasing successors, persists
identity-bound manifests and can revalidate/reuse them after restart. It does
not implement independent monitoring, hard GPU/process cancellation, distributed
quota enforcement, live revocation or full scientific closure. Existing project
executors remain authoritative; do not layer a second scheduler over them.

`scripts/pipeline_demo.py --output <local-runtime>/demo` runs an offline synthetic
example and emits an editable artifact DAG, retained intermediates and events.
No real API/GPU work or third-party installation is required. See the
[reference contract](references/artifact-concurrency.md) for integration and limits.

The existing [manifest schema](references/manifest-schema.md) and
`scripts/experiment.mjs` retain their v1 record format. Successful sealing now
requires every frozen matrix row to be completed and includes transitive shard
evidence. New shard closures carry an explicit plan path; regenerate old
closures before sealing. The helper accepts only clean, committed source
snapshots and refuses `dirtyPatch` as unproven source identity.
The integrated protocol can use equivalent project-native records; it does not
force duplicate JSON records, an additional experiment-tracking service or
another scheduler. GitHub collaboration records are required for research.

The v1 run format remains unchanged. Bind its run/attempt/output IDs to GitHub
through the project's existing study record or a small versioned manifest in
the experiment Issue. Old COMPLETE.json files do not prove milestone acceptance
or the new GitHub contract. Do not silently upgrade historical records.

The helper does not yet implement all integrated runtime guarantees. In
particular, bind fixes receipt digests once, seal creates the output index needed
by record-analysis, and there is no demonstrated native watchdog or general
artifact-revocation dispatcher in this package. Do not represent these as newly
implemented capabilities. For full pipelining, late receipts and safe acceptance,
map the contract to verified native project facilities; if a required guarantee
is missing, use the existing safe bounded/attended path and report the gap.

The GitHub workflow is an operational protocol with record templates and a
read-only repository/source helper. This package does not install Actions,
automatically create Issues or sync comments, dispatch GPU jobs, enforce global
Skill routing, or implement an unattended GitHub controller. Use native GitHub
operations under exact-target authority and verify project adapters before
claiming these effects are automated.

Do not fabricate final telemetry at launch or mutate immutable v1 records. A
project using the old helper can preserve early provider binding in its native
record and bind the helper after final receipts exist. Native raw-output
collections and analysis records avoid circular final-index dependencies. Such
mappings must preserve exact execution identity and all evidence. Old v1
COMPLETE.json records do not automatically prove new monitoring, revocation or
retention guarantees. Existing historical evidence remains unchanged.

The protocol owns scientific and testing decisions; existing executors own
resource allocation, scheduling and cancellation. A Skill file cannot monitor
a detached job. Backend guarantees must be tested before unattended execution.

## Verification and integration

Run `node --test tests/*.test.mjs` for the bundled helper regression
suite, validate the Skill frontmatter/links, and exercise the behavioral cases.
For the Python reference, run from a non-synchronized local runtime directory:

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=<skill>/scripts python3 -m unittest discover -s <skill>/tests -p 'test_*.py'
```

These tests do not prove live GPU throughput, cancellation latency or storage
atomicity. Before enabling a backend, run its fault-injection and restore checks.
Before PAC activation, validate the exact Profile dependency update and host
projections; never patch the installed Skill store directly.

For the user's required cross-session routing, the canonical Profile/project
instructions must direct repository-based research to this Skill and require
GitHub. A suitable policy is: "For repository-based research planning, execution,
resumption, comparison and closure, load experiment-lifecycle and use its required
GitHub lifecycle; ordinary engineering tests retain its lightweight lane."
Install through PAC with the reviewed dependency revision. Editing this source
or its description alone does not enforce host invocation or update a pinned
installation. Keep this activation separate from project research publication.

## Server evidence and GitHub

[Storage alignment](references/storage-layout.md) defines logical directory roles,
stable study/trial/execution identities, private location mappings, two-way
evidence links, crash recovery and verified migration/restore. Map existing
server layouts and native records instead of moving historical results. This is
an agent protocol; no server initializer, synchronization daemon, automatic
reconciler or storage migration command is installed by this package.

## Read-only GitHub binding helper

From a directory containing this Skill, with Node.js, Git and authenticated `gh`:

```sh
node scripts/github-context.mjs /absolute/source/root owner/repository
```

An optional third argument selects an explicit GitHub host. The helper checks
the exact Git top-level, its HTTPS or `git@host:owner/repo` origin, the API's
repository identity and availability of the actual HEAD commit. It returns
JSON with observation time, repository ID/URL, source commit/tree, diagnostic
dirty/ref state and remote commit availability. It emits no absolute source
path or raw credential-bearing command errors. A mismatch or unavailable API/
commit exits nonzero; it never fetches, pushes or writes GitHub records.

This helper supports the simple single-origin case. SSH aliases, alternate
transports and distinct fork/collaboration repositories need explicit native
inspection under the same contract. Dirty state is reported, not approved for
execution. API commit availability is not an archive/restore guarantee. Inspect
Issue/milestone bindings and permissions separately. Run
`node --test tests/github-context.test.mjs` for isolated CLI fixtures; real GitHub
writeback, cancellation, visibility policies and runner security need separate
project validation.

The CLI supports invocation through a symlinked Skill directory. HTTPS origins
may have one trailing slash. Failed API calls expose only a bounded HTTP status
when available; a 404 does not establish whether the commit is missing or access
is denied. The mocked GitHub CLI fixtures require a POSIX shell; native Windows
execution has not been validated.

Update obsolete first-verified-result and gpu-experiment callers to this Skill in their canonical
configuration source during activation. Preserve exact locked versions until the
reviewed update is installed. A temporary compatibility alias, if required by
old callers, must only route here and contain no independent completion policy.

## Reusing immutable input bytes

The bundled `scripts/reuse.mjs` creates and verifies read-only input symlinks. It never follows links for outputs and never makes a shared source writable. A symlink is only a space-saving reference; the executor must provide a read-only mount/ACL when write prevention is required.

```sh
node scripts/reuse.mjs link-artifact /immutable/data inputs/data /run/exp
node scripts/reuse.mjs verify-reuse inputs/data artifact.json /run/exp
```

## Design lineage

The design combines GitHub Issues/Milestones/PRs for collaborative research,
content-addressed reuse and experiment versioning inspired by DVC, run grouping
and input lineage inspired by MLflow and W&B, and explicit resource/artifact
separation. GitHub is required for research; ClearML is the selected first-choice
management platform for new integrations, not a service required for every test
or an instruction to replace compliant existing platforms. Mutable `latest`
identities and hidden telemetry uploads are not permitted. Product capabilities motivate
the design but do not prove scientific validity or measured productivity gains.

## Safety invariant

A symlink saves space but does not enforce read-only access. The executor must provide a read-only bind/container mount, ACL, or isolated identity and record evidence in the execution receipt. The helper verifies link target identity and digest; it does not pretend to enforce OS write isolation.
