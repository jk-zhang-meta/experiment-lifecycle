---
name: experiment-lifecycle
description: Create, execute, verify, compare, and archive reproducible computational experiments by binding each result to an immutable question, code snapshot, configuration, data/model revision, protocol, environment, randomness, executor, resource receipt, and explicit output index. Use when an agent plans or runs a research experiment, benchmark, ablation, training/evaluation job, hyperparameter sweep, or needs to trace an existing result back to exact code and artifacts. Do not use for literature-only work, ordinary unit tests, or a job submission that explicitly requests only a job ID.
---

# Experiment lifecycle

## Reusing immutable artifacts

Large datasets, models, configurations, checkpoints, and analysis inputs may
be reused through symlinks declared in the experiment spec. Each reuse record
must include an artifact id, immutable revision, SHA-256 digest, source
provenance, destination under `inputs/`, and `access: "read-only"`.

`link-artifact` rejects symlink sources, existing destinations, and destinations
outside the experiment root. `verify-reuse` resolves the link and re-hashes the
target. Shared sources must be in an approved immutable store and must never be
under an active experiment output directory. Deleting an experiment removes
only its links, never the source object.

A symlink alone cannot prevent writes: the executor must enforce a read-only
bind mount, container mount, or equivalent ACL/identity boundary and record the
method in the execution receipt. If that evidence is unavailable, the run may
be prepared but cannot claim read-only enforcement. Copying is an allowed
fallback only when the copy is independently hashed and never writes back.

Reuse paths are inputs; outputs, checkpoints, logs, and receipts remain
exclusive regular files under the current execution. Input digest drift at
launch or seal fails verification. Artifact content, revision, schema, split,
or preprocessing changes create a new semantic attempt; changing only a link
path or materialization method creates a new execution or requires revalidation.

Use this Skill as the experiment identity and evidence layer. It does not grant
SSH, scheduler, GPU, deletion, publication, or production authority. Compose it
with `canonical-state`, `first-verified-result`, `resource-guard`,
`runtime-hygiene`, `gpu-experiment`, and `verified-operations` when those
surfaces apply.

## The non-negotiable model

Keep these identities separate:

```text
experiment (scientific question)
  -> semantic attempt (what changed scientifically)
      -> execution (where/how this attempt was physically run)
          -> outputs and receipts
```

Use the bundled `references/manifest-schema.md` for the exact fields and
the `scripts/experiment.mjs` helper for deterministic record creation and
verification. The helper is intentionally shell-free and has no network or
tracking-service dependency.

- A code/config/data/model/protocol/environment/seed/factor/oracle change is a
  new semantic attempt.
- A node failure, pre-emption, or infrastructure retry with an identical
  semantic fingerprint is a new execution of the same attempt.
- If equality is uncertain, create a new attempt. Never reuse `latest` or pick
  a result by modification time.
- Record change classes explicitly (`feature`, `bugfix`, `refactor`, `config`,
  `data`, `model`, `environment`, `protocol`, `benchmark`, `reproduction`, or
  `unknown`); do not infer a scientific class from a diff summary.

## Intake: ask only for missing decision-bearing facts

Before launch, resolve the canonical project root and create a host-local spec
under `~/.agent-work`. Ask a focused question if any of these is missing or
ambiguous:

1. What question, feature/function being evaluated, falsifiable hypothesis,
   baseline/candidate comparison, metrics, validity bounds, and stopping rule
   does the run answer?
2. Which repository/commit/tree and relevant files are the source? Is the tree
   clean, or where is the complete approved dirty patch snapshot?
3. Which exact config, data split/preprocessing, model revision, protocol, and
   dependency/environment identities are effective?
4. Which seeds, factor values, number of runs, and required output rows/shards
   are expected?
5. Which executor/job identity, output/checkpoint roots, and CPU/RAM/I/O/
   network/GPU budgets are authorized? Is hardware a scientific factor?
6. Which project validator will produce a report naming this manifest digest,
   what makes a row complete and a metric valid, and which analysis code/method
   will interpret the result?

The manifest is the join key for the whole research story: the entrypoint
path/symbol and argv identify the code path; config/data/model/protocol and
environment digests identify what it means; factors and seeds identify the
experimental condition; the output index and analysis artifact identify what
was produced and how it was interpreted. If the analysis method or research
question changes, create a new semantic attempt even when the training code
is unchanged.

Do not ask ceremonial confirmation for information already present in a trusted
project contract or explicit request. Do not silently fill an unknown with a
default that changes the scientific interpretation.

For sweeps or factorial studies, declare `spec.matrix.axes`. `init` sorts the
axes canonically, derives stable `conditionId` values, and writes an immutable
attempt-level `MATRIX.json`. Sealing then requires `--matrix-report` containing
exactly one terminal status per condition (`completed`, `failed`, `blocked`, or
`excluded-with-reason`), preventing partial or duplicated grids from appearing
complete.

## Storage and initialization

Keep the clean Git checkout (including `.git`, source, docs, and small configs)
in its declared canonical location. Put the spec, run metadata, logs,
checkpoints, caches, and generated outputs in a registered host-local runtime or
the remote executor's local work root. Never build or emit intermediates under
OneDrive/CloudStorage. Register a new runtime directory with `runtime-hygiene`
before substantive work.

Create the four-layer tree with:

```sh
node <this-skill>/scripts/experiment.mjs init \
  --spec <runtime>/experiment-spec.json --runtime-root <runtime-root>
```

`init` writes write-once `EXPERIMENT.json`, `ATTEMPT.json`, and `RUN.json`.
It captures Git commit/tree and scoped file digests, validates immutable input
identities, computes the semantic fingerprint and IDs, records an execution
plan (including expected duration/resource budget), and refuses unsafe paths,
dirty sources without a complete patch, missing required fields, or overwrites.
Use `--retry-of <RUN.json>` only for a proven identical semantic spec; it creates
a fresh execution directory and preserves the parent execution link.

The returned paths and `runManifestDigest` are the only launch contract. Copy
the manifest digest into command metadata, metric rows, logs, checkpoints, and
resource receipts. Do not edit `RUN.json` after initialization.

For multi-GPU or multi-endpoint work, never let workers read the full input
manifest or write a shared result path. Declare `compute.partitioning` with an
immutable item-manifest digest and shard count, then run:

```sh
node <this-skill>/scripts/experiment.mjs plan-shards --run RUN.json \
  --items <items.json> --out SHARD-PLAN.json
```

Each worker receives only its assigned item slice and writes under its exclusive
`shards/<shard-id>/attempts/<worker-attempt-id>/` directory. It records endpoint,
GPU/device IDs, item count and output digest with `record-shard`; the controller
must run `verify-shards` and pass its `SHARD-CLOSURE.json` to `seal` as
`--shard-report`. The closure rejects missing/duplicate input ownership, shared
output paths, stale outputs, and non-successful shard attempts. A single merge
step, after closure, creates the group-level result; retries get a new worker
attempt directory and never append to a prior file.

Record recovery and analysis evidence with the bundled helper so they remain
bound to the exact execution:

```sh
node <this-skill>/scripts/experiment.mjs record-checkpoint --run RUN.json \
  --out checkpoints/step-100.json --artifact checkpoints/step-100.pt \
  --checkpoint-id step-100 --step 100
node <this-skill>/scripts/experiment.mjs record-analysis --run RUN.json \
  --out outputs/ANALYSIS.json --output-index output-index.json \
  --analysis-id metrics-v1 --method "bootstrap 95% CI" \
  --code-digest sha256:<64-hex> --config-digest sha256:<64-hex>
```

Checkpoint records bind artifact digests, step and optional parent checkpoint;
analysis records bind the exact output-index digest, analysis code/config and
environment. A resume is valid only when the project executor also confirms
the parent execution and semantic fingerprint; otherwise initialize a new
attempt. If a `compute.resourceForecast` is supplied, it is retained as
execution metadata (method, history, confidence, and observed-vs-forecast
error) and never changes semantic identity.

## Execute and bind evidence

Run the project's real entrypoint from the WSL/remote stage through the normal
executor. Use `resource-guard` for local or build-like commands and
`gpu-experiment` for an allowlisted model/GPU matrix; those Skills control
resources, while this Skill records the evidence. A useful GPU is not merely an
idle visible device: record UUID/MIG, model, driver/CUDA, visible process,
active/gpu seconds, utilization distribution, VRAM peak, power/energy and
temperature when observable. Record CPU seconds, peak RSS, read/write bytes,
PSI, wall/queue/setup/compute/postprocess durations, concurrency, throughput,
and cost/energy estimates when available. Missing telemetry is `null` plus an
`unobservable` reason, never zero.

After submission, bind the stable provider reference without mutating the run:

```sh
node <this-skill>/scripts/experiment.mjs bind \
  --run <...>/RUN.json --job-ref <provider-job-id> \
  --executor-kind <local|ssh|slurm|k8s|...> --executor-target <target> \
  --receipt resource=<.../resource.json> --receipt hardware=<.../gpu.json>
```

The command writes one immutable `EXECUTION.json`; receipt JSON must name the
same `runManifestDigest` and `executionId` (a digest alone is insufficient),
and a path cannot be bound under two roles. Every sealed run requires resource
and environment receipts; a non-empty GPU allowlist additionally requires a
hardware receipt. Unobservable measurements are `null` plus an explanation,
never a fabricated zero. The external scheduler remains the
authority for queued/running/terminal status. Preserve failed attempts and
partial evidence; do not blind-resubmit an ambiguous submission.

Compilation and ordinary unit/integration tests are agent-owned engineering
checks, not scientific attempts. Run them when they reduce execution risk, but
do not create a new semantic attempt or make them required outputs merely
because they ran. If a check is useful for audit or explains a result, write a
small JSON receipt under `receipts/` (role `validation`, with `noise: true` and
`artifactClass: "evidence"`) and bind it like any other receipt. A failed check
must never create `COMPLETE.json` or be presented as an experimental result.
Toolchain/lock changes that can alter the science belong in `environment` and
therefore do create a new attempt.

## Seal and verify

The project-owned validator must run after authoritative terminal success and
write a small JSON report such as:

```json
{
  "schemaVersion": 1,
  "status": "pass",
  "runManifestDigest": "sha256:...",
  "executionId": "ex-...",
  "terminalState": "succeeded",
  "checks": {"schema": "pass", "rows": "pass", "finite": "pass"},
  "summary": {"rows": 12, "wallSeconds": 3600, "throughput": 2.4}
}
```

Then seal only through the exact run path:

```sh
node <this-skill>/scripts/experiment.mjs seal \
  --run <...>/RUN.json --oracle-report <...>/oracle.json [--shard-report <...>/SHARD-CLOSURE.json]
node <this-skill>/scripts/experiment.mjs verify-run \
  --run <...>/RUN.json
```

`seal` explicitly hashes every required output from the spec, verifies the
execution binding and oracle identity, writes `output-index.json`, and writes
`COMPLETE.json` last and atomically. Only the state

```text
authoritative terminal success
 + exact-attempt oracle pass
 + matching manifest/execution/output digests
 = VerifiedResult
```

is publishable. Otherwise report `ActiveRun`, `FailedRun`, or `BlockedRun` with
the exact missing evidence. A successful process exit alone is not a result.

Compare two records when a result seems mismatched:

```sh
node <this-skill>/scripts/experiment.mjs compare \
  --left <old>/RUN.json --right <new>/RUN.json
```

The report identifies which dimension changed (code, config, data, model,
protocol, environment, randomness, factor, oracle, or execution-only) and gives
the correct new-attempt/retry recommendation.

When a run tree is moved between hosts, `verify-source --source-root <absolute
checkout>` may point at the corresponding checkout path. It still requires the
recorded commit, tree, status, dirty-patch, and every scoped-file digest to
match; this option is a path mapping, not a way to substitute a different
source.

## Publish and retain

After `verify-run` passes, use the existing
`runtime-hygiene/scripts/artifact-publish.mjs` with an explicit artifact list;
never copy a build tree or use a glob. Record the resulting destination and
manifest digest with a small `PUBLICATION.json` receipt. Keep `RUN.json`,
`ATTEMPT.json`, `COMPLETE.json`, oracle/resource receipts, and failed-run
summaries; let `runtime-hygiene` quarantine only registered rebuildable
intermediates after lease/closure checks. Unknown directories and published
finals are inventory-only.

## Boundaries and tests

Do not add a PAC-wide queue, polling daemon, mutable latest alias, unrestricted
filesystem scan, hidden telemetry upload, or automatic scientific retry. Do
not claim bit-identical results across different hardware unless the project
oracle proves it; report statistical reproducibility and variance instead.

For changes to this Skill, run its tests and the Profile validator. The test
fixture must cover: distinct dimension changes, identical-semantic retry,
dirty-source rejection, manifest tampering, output omission/duplication,
oracle mismatch, atomic completion ordering, resource/GPU receipt gaps, and
publication/cleanup preserving the provenance chain.
