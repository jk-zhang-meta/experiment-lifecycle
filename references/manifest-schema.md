# Experiment lifecycle manifest schema

This is the portable envelope used by `scripts/experiment.mjs`. Project
validators may add scientific fields, but they must not remove the identity or
integrity fields below. Paths in manifests are private metadata; output paths
are always relative to the execution directory.

## Input spec (`experiment-spec.json`)

The agent creates this file in host-local runtime storage, validates it, and
passes it to `experiment.mjs init`. It is a plan, not a permission grant.

```json
{
  "schemaVersion": 1,
  "experiment": {
    "id": "adand-ablation",
    "projectId": "my-project",
    "question": "Does the candidate improve metric M over baseline B?",
    "hypothesis": "The candidate improves M without violating constraint C.",
    "feature": "candidate-normalization",
    "baseline": "baseline-v1",
    "candidate": "candidate-v2",
    "design": {"metric": "M", "stopping": "fixed evaluation set"},
    "owner": "researcher"
  },
  "source": {
    "root": "/path/to/git/checkout",
    "scope": ["src/train.py", "configs/ablation.yaml"],
    "changeClass": "feature",
    "dirtyPatch": null
  },
  "entrypoint": {
    "path": "src/train.py",
    "symbol": "main",
    "argv": ["--config", "configs/ablation.yaml"],
    "workingDirectory": "."
  },
  "configs": [{"path": "configs/ablation.yaml", "role": "effective-config"}],
  "data": [{
    "id": "dataset-name",
    "revision": "2026-09-01",
    "digest": "sha256:<64 hex characters>",
    "manifestDigest": "sha256:<64 hex characters>",
    "schemaDigest": "sha256:<64 hex characters>",
    "split": {"name": "validation", "digest": "sha256:<64 hex characters>"},
    "selection": {"digest": "sha256:<64 hex characters>"},
    "preprocess": [{"id": "normalize", "codeDigest": "sha256:<64 hex characters>", "configDigest": "sha256:<64 hex characters>", "outputDigest": "sha256:<64 hex characters>", "derivedFrom": ["raw"]}],
    "path": "/data/dataset-manifest.json"
  }],
  "models": [{
    "id": "model-name",
    "revision": "model-revision",
    "digest": "sha256:<64 hex characters>"
  }],
  "protocol": {
    "id": "protocol-v3",
    "version": "3",
    "path": "docs/protocol.md"
  },
  "randomness": {
    "seeds": [1, 2, 3],
    "determinism": "framework deterministic mode; document known exceptions"
  },
  "environment": {
    "files": ["requirements.lock", "environment.yml"],
    "containerImage": "registry.example/image@sha256:<64 hex characters>",
    "toolchain": {"python": "3.12.x", "framework": "version"},
    "semantic": true
  },
  "factors": {"variant": "candidate", "alpha": 0.5},
  "matrix": {
    "axes": {"model": ["model-a", "model-b"], "seed": [1, 2], "alpha": [0.0, 0.5]}
  },
  "analysis": {
    "id": "analysis-v1",
    "code": "analysis/metrics.py@commit",
    "statistics": "mean and 95% interval"
  },
  "compute": {
    "hardwareIsScientificFactor": false,
    "executor": {"kind": "slurm", "target": "cluster-a", "queue": "gpu"},
    "gpuAllowlist": ["GPU-UUID"],
    "modelAllowlist": ["model-name@model-revision"],
    "partitioning": {
      "mode": "sharded",
      "itemManifestDigest": "sha256:<64 hex characters>",
      "expectedItems": 210,
      "shardCount": 2,
      "assignment": "balanced-contiguous",
      "resultItemIdField": "itemId"
    },
    "resourceBudget": {
      "cpuCores": 8, "memoryBytes": 68719476736,
      "readBytes": 107374182400, "writeBytes": 10737418240,
      "wallSeconds": 3600, "maxConcurrency": 1,
      "gpuMemoryHeadroomBytes": 2147483648,
      "maxTemperatureC": 85
    }
  },
  "oracle": {
    "id": "metric-m-v1",
    "version": "1",
    "validator": "project-owned validator; run separately",
    "requiredOutputs": [
      {"path": "outputs/metrics.jsonl", "role": "metrics"},
      {"path": "outputs/summary.json", "role": "summary"}
    ],
    "checks": ["schema", "complete-shards", "finite-metrics", "baseline-comparison"]
  }
}
```

Required values are `experiment.id`, `experiment.projectId`, `question`,
`hypothesis`, `source.root`, `source.changeClass`, `entrypoint.path`, a
non-empty `argv` array, at least one data/model/config/protocol/environment
identity as applicable to the project, `randomness.seeds`, an executor,
`analysis` (with an id/code/method or explicit `notApplicable` reason),
`oracle.id`, and at least one required output. If a category is genuinely not
applicable, write an explicit `not-applicable` reason in the spec; a blank value
is not an answer.

`source.changeClass` is a declaration, not an inference. Valid values are
`feature`, `bugfix`, `refactor`, `reproduction`, `config`, `data`, `model`,
`environment`, `protocol`, `benchmark`, and `unknown`.

## Canonical identity projection

The helper stores the complete validated spec in `RUN.json`, but computes the
semantic fingerprint from a path-normalized projection containing only:

```text
experiment.question + hypothesis + feature/baseline/candidate/design
source commit/tree/patch/scope/changeClass
entrypoint path + symbol + argv
config file digests and declared values
data/model immutable IDs, revisions, and digests
protocol identity and digest
semantic environment lock/image/toolchain identities (when `environment.semantic`
is true; full observed environment remains in `RUN.json`)
randomness and scientific factors
compute hardware identity only when hardwareIsScientificFactor=true
oracle identity and required output schema
analysis method/code identity
```

It excludes timestamps, hostnames, job IDs, process IDs, queue names, temporary
paths, observed utilization, and scheduler retries. Thus:

| Change | Identity result |
|---|---|
| code/config/data/model/protocol/semantic environment/seed/factor/oracle change | new `semanticAttemptId` |
| only node failure, pre-emption, or executor retry with equal fingerprint | new `executionId`, same attempt |
| unknown or unmeasured difference | new attempt; never assume retry |
| different GPU type when hardware is a declared scientific factor | new attempt |
| low-priority scheduling, cache location, or resource cap change only | same attempt, new execution; record execution difference |

Compilation, lint, and ordinary unit/integration tests are optional engineering
evidence. They are not part of the semantic fingerprint unless their toolchain
or dependency identity changes the scientific environment. If retained, put a
small `noise: true` validation receipt in `receipts/`; never use a test log as a
required result or as proof that an experiment passed its oracle.

The source scope is canonicalized by path before hashing, so reordering the
same set of scoped files does not create a spurious attempt. The full
`changeSet` records one row per dimension with `beforeDigest`,
`afterDigest`, `changed`, and `classification`. A classification is never
silently guessed from a textual diff.

When `matrix` is present, each axis is sorted canonically and the Cartesian
product is recorded in immutable `MATRIX.json`. Each row has a stable
`conditionId`; the matrix digest is part of semantic identity. Sealing requires
an execution-local closure report naming the same matrix and one terminal status
for every condition, so expected rows cannot silently disappear.

`environment.semantic: false` is an explicit declaration that the listed
environment details are execution evidence rather than a scientific factor;
the complete observed environment is still retained in `RUN.json` for audit.

`compute.partitioning` is required for multi-worker execution. The controller
creates an immutable `SHARD-PLAN.json`; each shard owns a disjoint item-ID list
and an output prefix containing its worker-attempt ID. `record-shard` creates a
receipt naming the exact plan, item slice, endpoint/device allocation and output
digest. `verify-shards` emits `SHARD-CLOSURE.json`, and `seal` requires that
closure before a sharded run can become a `VerifiedResult`. The project merger,
not workers, writes the final group result after closure.

## `RUN.json`

`RUN.json` is write-once. Its `recordDigest` is SHA-256 over canonical JSON
with `recordDigest` omitted. Important fields:

```json
{
  "schemaVersion": 1,
  "kind": "pac-experiment-run",
  "experimentId": "...",
  "semanticAttemptId": "sa-...",
  "executionId": "ex-...",
  "runId": "...",
  "attemptRecordDigest": "sha256:...",
  "runManifestDigest": "sha256:...",
  "semantic": {"fingerprint": "sha256:...", "changeSet": {}},
  "source": {"commit": "...", "treeOid": "...", "treeDigest": "sha256:...", "scope": []},
  "entrypoint": {"path": "...", "argv": [], "argvDigest": "sha256:..."},
  "inputs": {"configs": [], "data": [], "models": [], "protocol": {}, "environment": {}},
  "randomness": {},
  "executorRequest": {},
  "runtime": {"executionRoot": ".", "outputRoot": "outputs", "checkpointRoot": "checkpoints"},
  "oracle": {},
  "createdAt": "..."
}
```

`runManifestDigest` is the digest used by all downstream records. It is not a
mutable status field. The helper writes to a temporary file, fsyncs it, renames
it, and refuses to overwrite an existing record.

Execution-local `ANALYSIS.json` records bind an analysis method and code/config
digests to the exact `output-index.json` digest. Checkpoint records bind a
checkpoint artifact digest, step/epoch, RNG/model/config state supplied by the
project, and an optional parent checkpoint to the same execution. A resume
must be checked by the executor; a changed semantic fingerprint is a new
attempt, not a continuation.

## `EXECUTION.json`

This record is created once after submission, without mutating `RUN.json`:

```json
{
  "schemaVersion": 1,
  "kind": "pac-experiment-execution",
  "executionId": "ex-...",
  "runManifestDigest": "sha256:...",
  "executor": {"kind": "ssh", "target": "A100-2", "jobRef": "job-123"},
  "startedAt": "...",
  "receipts": [
    {"role": "resource", "path": "receipts/resource.json", "sha256": "sha256:..."},
    {"role": "hardware", "path": "receipts/gpu.json", "sha256": "sha256:..."}
  ],
  "recordDigest": "sha256:..."
}
```

The external executor remains authoritative for running/terminal state. A
stable `jobRef` is mandatory before a result can be sealed.

Resource and environment receipts are mandatory for a verified result; a
non-empty GPU allowlist additionally requires hardware telemetry. Missing
measurements are `null` with an `unobservable` reason, never zero. Matrix
closure is indexed as `matrix-closure` during sealing.

## Resource and hardware receipt

The bound receipt is a bounded JSON summary generated by the approved
executor/resource guard. Raw JSONL telemetry may remain in a separately
retained log, but the small summary is what is bound and indexed.
It must use the following semantic fields (additional provider fields are
allowed):

```json
{
  "schemaVersion": 1,
  "runManifestDigest": "sha256:...",
  "executionId": "ex-...",
  "observability": {"tier": "A|B|C", "gpu": "observed|unobservable"},
  "interval": {"startedAt": "...", "endedAt": "...", "wallSeconds": 12.3},
  "cpu": {"seconds": 10.2, "peakRssBytes": 1234, "readBytes": 2, "writeBytes": 3},
  "system": {"psi": {}, "freeBytesBefore": 0, "freeBytesAfter": 0},
  "gpus": [{
    "uuid": "GPU-...", "migId": null, "vendor": "nvidia", "model": "...",
    "samples": 12, "activeSeconds": 11.7, "gpuSeconds": 11.7,
    "utilization": {"meanPercent": 94.2, "p95Percent": 99.0, "maxPercent": 100},
    "memory": {"peakBytes": 123, "reservedBytes": 456},
    "energy": {"joules": null, "source": "unobservable"},
    "temperatureC": {"max": 72, "source": "nvidia-smi"}
  }],
  "concurrency": {"requested": 1, "observedMax": 1},
  "unobserved": ["energy.joules"],
  "phases": {
    "setup": {"startedAt": "...", "endedAt": "...", "durationSeconds": 3.1},
    "compute": {"startedAt": "...", "endedAt": "...", "durationSeconds": 12.3}
  }
}
```

`gpuSeconds` is the integral of the sampling interval (or provider-native
  process accounting when available), not `wallSeconds * numberOfGPUs` unless
that approximation is explicitly labelled. Missing samples, unsupported power
meters, and Windows-side counters are `null` plus an `unobservable` reason.
Receipt files are bound by digest and must declare the exact
`runManifestDigest` and `executionId` they describe; a digest-only receipt
cannot be sealed. They must not contain secrets or raw logs.

Absolute host locations for external datasets/models are retained only as
private execution hints; the semantic projection uses the declared id,
revision, digest, and an optional stable `logicalPath`. Copying an immutable
input to another host therefore does not create a false new attempt.

## `output-index.json` and `COMPLETE.json`

The index contains only explicit relative paths. A directory is represented by
a bounded deterministic tree digest; symlinks and special files are rejected.

```json
{
  "schemaVersion": 1,
  "kind": "pac-experiment-output-index",
  "executionId": "ex-...",
  "runManifestDigest": "sha256:...",
  "entries": [{
    "path": "outputs/metrics.jsonl",
    "role": "metrics",
    "bytes": 123,
    "sha256": "sha256:..."
  }],
  "recordDigest": "sha256:..."
}
```

The project validator writes a report with `status: "pass"`, the same
`runManifestDigest` and `executionId`, the terminal executor state, and its
schema/metric/completeness checks. `seal` verifies that report and then writes
`COMPLETE.json` last. A completion record references the output-index and
validator digests; it is the only state that permits publication.

## Privacy and limits

Manifests contain metadata, not credentials. Do not include environment dumps,
tokens, command stdout, patient-level data, or unrestricted log content. Hash
large inputs through a bounded resource-guarded process or supply an immutable
provider digest. Every digest and path is checked before use; no command in the
helper is executed through a shell.
