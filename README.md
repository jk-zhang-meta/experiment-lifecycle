# Experiment Lifecycle

Portable identity, evidence, and immutable-input conventions for reproducible experiments.

The bundled `scripts/reuse.mjs` creates and verifies read-only input symlinks. It never follows links for outputs and never makes a shared source writable. A symlink is only a space-saving reference; the executor must provide a read-only mount/ACL when write prevention is required.

```sh
node scripts/reuse.mjs link-artifact /immutable/data inputs/data /run/exp
node scripts/reuse.mjs verify-reuse inputs/data artifact.json /run/exp
```

## Design lineage

The design combines content-addressed reuse and protected link workflows inspired by DVC, run/input lineage inspired by MLflow and W&B Artifacts, explicit resource/artifact separation from Sacred, and source-digest run records found in experiment tooling. It intentionally has no required tracking server, cloud account, mutable `latest` alias, or hidden telemetry upload.

## Safety invariant

A symlink saves space but does not enforce read-only access. The executor must provide a read-only bind/container mount, ACL, or isolated identity and record evidence in the execution receipt. The helper verifies link target identity and digest; it does not pretend to enforce OS write isolation.
