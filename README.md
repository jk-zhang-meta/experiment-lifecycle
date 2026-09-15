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
- Dataset-based dev uses the exact population and taxonomy, stratified proportions,
  mandatory category/group/interaction coverage, leakage checks and a reproducible
  membership manifest. A dev pass authorizes only its declared next step.
- Formal experiments preserve the full planned coverage and all research evidence,
  including failures, intermediates, retries, analyses and final results.

Read [SKILL.md](SKILL.md) for the entrypoint, [dev validation](references/dev-validation.md)
for sampling and readiness (including a MindCube example), and the
[lifecycle contract](references/lifecycle.md) for artifact commits, pipelining,
backpressure, continuous monitoring, stopping, invalidation, reuse and retention.
Read [GPU execution](references/gpu-execution.md) before model loading, capacity
probes or GPU scheduling; its helper is `scripts/gpu-plan.mjs`.
Read [performance control](references/performance-control.md) before expensive
scale-up: separate correctness and capacity dev, measure the whole pipeline,
declare bounded native feedback, and report bottlenecks and wasted compute.
This is an execution contract; this repository does not implement an autoscaler
or claim measured speedups without a project workload and backend validation.
[Acceptance scenarios](references/evaluation.md) and [primary-source rationale](references/research-basis.md)
are maintained in this same repository. No second Skill repository is required.

## Protocol versus bundled helper

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
separation. GitHub is required; no additional tracking server, mutable `latest`
identity or hidden telemetry upload is required. Product capabilities motivate
the design but do not prove scientific validity or measured productivity gains.

## Safety invariant

A symlink saves space but does not enforce read-only access. The executor must provide a read-only bind/container mount, ACL, or isolated identity and record evidence in the execution receipt. The helper verifies link target identity and digest; it does not pretend to enforce OS write isolation.
