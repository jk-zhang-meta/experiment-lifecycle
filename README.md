# Experiment Lifecycle

One Skill for engineering tests, representative dev validation and full scientific
experiments. The first-verified-result strategy is integrated into development;
it is no longer a separate lifecycle dependency or a full-study completion rule.
GPU model loading, capacity probes and admission are also integrated here;
`gpu-experiment` is no longer a separate Skill dependency.

## Use the right evidence scope

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
force duplicate JSON records, a tracking service or another scheduler.

The helper does not yet implement all integrated runtime guarantees. In
particular, bind fixes receipt digests once, seal creates the output index needed
by record-analysis, and there is no demonstrated native watchdog or general
artifact-revocation dispatcher in this package. Do not represent these as newly
implemented capabilities. For full pipelining, late receipts and safe acceptance,
map the contract to verified native project facilities; if a required guarantee
is missing, use the existing safe bounded/attended path and report the gap.

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

The design combines content-addressed reuse and protected link workflows inspired by DVC, run/input lineage inspired by MLflow and W&B Artifacts, explicit resource/artifact separation from Sacred, and source-digest run records found in experiment tooling. It intentionally has no required tracking server, cloud account, mutable `latest` alias, or hidden telemetry upload.

## Safety invariant

A symlink saves space but does not enforce read-only access. The executor must provide a read-only bind/container mount, ACL, or isolated identity and record evidence in the execution receipt. The helper verifies link target identity and digest; it does not pretend to enforce OS write isolation.
