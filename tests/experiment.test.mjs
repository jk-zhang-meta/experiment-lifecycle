import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = join(fileURLToPath(new URL("..", import.meta.url)), "scripts", "experiment.mjs");

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function cli(args, expected = 0) {
  try {
    const output = execFileSync(process.execPath, [script, ...args], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 8 * 1024 * 1024,
    });
    assert.equal(expected, 0, `expected CLI failure but it succeeded: ${output}`);
    return output ? JSON.parse(output) : null;
  } catch (error) {
    if (expected === 0) throw error;
    assert.equal(error.status, expected, `unexpected CLI exit: ${error.stderr || error.message}`);
    return JSON.parse(String(error.stderr || "{}"));
  }
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "pac-experiment-test-"));
  const source = join(root, "source");
  const runtime = join(root, "runtime");
  const data = join(root, "dataset-manifest.json");
  mkdirSync(join(source, "src"), { recursive: true });
  mkdirSync(join(source, "configs"), { recursive: true });
  mkdirSync(join(source, "docs"), { recursive: true });
  writeFileSync(join(source, "src", "train.py"), "print('train')\n");
  writeFileSync(join(source, "configs", "base.json"), '{"lr":0.001}\n');
  writeFileSync(join(source, "docs", "protocol.md"), "protocol-v1\n");
  writeFileSync(join(source, "requirements.lock"), "python==3.12.1\n");
  writeFileSync(data, '{"dataset":"tiny","revision":"r1"}\n');
  git(source, ["init", "--quiet"]);
  git(source, ["config", "user.email", "pac-test@example.invalid"]);
  git(source, ["config", "user.name", "PAC test"]);
  git(source, ["add", "src/train.py", "configs/base.json", "docs/protocol.md", "requirements.lock"]);
  git(source, ["commit", "--quiet", "-m", "fixture"]);
  const specPath = join(root, "experiment-spec.json");
  const spec = {
    schemaVersion: 1,
    experiment: {
      id: "trace-demo", projectId: "pac-test", question: "Does the candidate improve M?",
      hypothesis: "The candidate improves M", feature: "candidate-normalization",
      baseline: "baseline-v1", candidate: "candidate-v2", design: { metric: "M", stopping: "one pass" },
    },
    source: {
      root: source, scope: ["src/train.py", "configs/base.json", "docs/protocol.md", "requirements.lock"],
      changeClass: "feature",
    },
    entrypoint: { path: "src/train.py", symbol: "main", argv: ["--config", "configs/base.json"] },
    configs: [{ path: "configs/base.json", role: "effective-config" }],
    data: [{ id: "tiny", revision: "r1", path: data }],
    models: [{ id: "toy", revision: "r1", digest: sha256("toy-model-r1") }],
    protocol: { id: "protocol", version: "1", path: "docs/protocol.md" },
    randomness: { seeds: [7, 11], determinism: "fixed seeds" },
    environment: { files: ["requirements.lock"], toolchain: { python: "3.12.1" }, semantic: true },
    factors: { variant: "candidate", alpha: 0.5 },
    analysis: { id: "analysis-v1", code: "metrics.py@r1", statistics: "mean" },
    compute: {
      executor: { kind: "local", target: "test-host" },
      resourceBudget: { cpuCores: 1, memoryBytes: 256 * 1024 * 1024, maxConcurrency: 1 },
      gpuAllowlist: [], modelAllowlist: [], expected: { wallSeconds: 30, gpuHours: 0 },
    },
    oracle: {
      id: "oracle", version: "1", requiredOutputs: [
        { path: "outputs/metrics.json", role: "metrics" },
        { path: "outputs/analysis.json", role: "analysis" },
      ], checks: ["schema", "finite"],
    },
  };
  writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
  return { root, source, runtime, data, specPath, spec };
}

function runDir(runPath) { return join(runPath, ".."); }

function prepareRun(fx) {
  const init = cli(["init", "--spec", fx.specPath, "--runtime-root", fx.runtime]);
  const runPath = init.run;
  const run = JSON.parse(readFileSync(runPath, "utf8"));
  const dir = runDir(runPath);
  const receiptPath = join(dir, "receipts", "resource.json");
  const environmentReceiptPath = join(dir, "receipts", "environment.json");
  writeFileSync(receiptPath, `${JSON.stringify({
    schemaVersion: 1, runManifestDigest: run.runManifestDigest, executionId: run.executionId,
    observability: { tier: "C", gpu: "unobservable" },
    interval: { startedAt: "2026-01-01T00:00:00Z", endedAt: "2026-01-01T00:00:01Z", wallSeconds: 1 },
    cpu: { seconds: 0.1, peakRssBytes: 1000, readBytes: 1, writeBytes: 1 },
    gpus: [], unobserved: ["gpu", "energy"],
  }, null, 2)}\n`);
  writeFileSync(environmentReceiptPath, `${JSON.stringify({
    schemaVersion: 1, runManifestDigest: run.runManifestDigest, executionId: run.executionId,
    observed: { platform: "linux", arch: "x64", toolchain: { python: "3.12.1" } },
    unobservable: ["driver", "cuda", "container"],
  }, null, 2)}\n`);
  cli(["bind", "--run", runPath, "--job-ref", `job-${run.executionId}`,
    "--executor-kind", "local", "--executor-target", "test-host",
    "--receipt", `resource=${receiptPath}`, "--receipt", `environment=${environmentReceiptPath}`]);
  writeFileSync(join(dir, "outputs", "metrics.json"), '{"metric":0.9}\n');
  writeFileSync(join(dir, "outputs", "analysis.json"), '{"delta":0.1}\n');
  const oraclePath = join(dir, "oracle.json");
  writeFileSync(oraclePath, `${JSON.stringify({
    schemaVersion: 1, status: "pass", runManifestDigest: run.runManifestDigest,
    executionId: run.executionId, terminalState: "succeeded", checks: { schema: "pass" },
    summary: { metric: 0.9 },
  }, null, 2)}\n`);
  return { init, runPath, run, dir, receiptPath, environmentReceiptPath, oraclePath };
}

test("init binds research intent, code/config and relative runtime layout", () => {
  const fx = fixture();
  try {
    const init = cli(["init", "--spec", fx.specPath, "--runtime-root", fx.runtime]);
    const run = JSON.parse(readFileSync(init.run, "utf8"));
    assert.match(init.semanticAttemptId, /^sa-/u);
    assert.equal(run.runtime.executionRoot, ".");
    assert.equal(run.runtime.outputRoot, "outputs");
    assert.equal(run.semantic.entrypoint.symbol, "main");
    assert.equal(run.semantic.researchIntent.feature, "candidate-normalization");
    assert.equal(run.semantic.analysis.id, "analysis-v1");
    assert.match(run.source.treeOid, /^[0-9a-f]{40}$/u);
    assert.equal(cli(["verify-run", "--run", init.run]).state, "ActiveRun");
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

test("matrix expansion is immutable, complete, and order-stable", () => {
  const fx = fixture();
  try {
    fx.spec.matrix = { axes: { model: ["toy-b", "toy-a"], precision: ["fp32", "bf16"] } };
    writeFileSync(fx.specPath, `${JSON.stringify(fx.spec, null, 2)}\n`);
    const first = cli(["init", "--spec", fx.specPath, "--runtime-root", fx.runtime]);
    const firstRun = JSON.parse(readFileSync(first.run, "utf8"));
    const matrixPath = join(runDir(first.run), "..", "..", "MATRIX.json");
    const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
    assert.equal(matrix.expectedCount, 8);
    assert.equal(new Set(matrix.rows.map((row) => row.conditionId)).size, 8);
    fx.spec.matrix.axes.model.reverse();
    fx.spec.matrix.axes.precision.reverse();
    writeFileSync(fx.specPath, `${JSON.stringify(fx.spec, null, 2)}\n`);
    const reordered = cli(["init", "--spec", fx.specPath, "--runtime-root", fx.runtime, "--retry-of", first.run]);
    assert.equal(reordered.semanticAttemptId, first.semanticAttemptId);
    assert.equal(JSON.parse(readFileSync(reordered.run, "utf8")).semantic.matrix.matrixDigest, firstRun.semantic.matrix.matrixDigest);
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

test("matrix sealing requires and indexes a complete closure report", () => {
  const fx = fixture();
  try {
    fx.spec.matrix = { axes: { model: ["toy-a", "toy-b"] } };
    writeFileSync(fx.specPath, `${JSON.stringify(fx.spec, null, 2)}\n`);
    const prepared = prepareRun(fx);
    const matrixPath = join(runDir(prepared.runPath), "..", "..", "MATRIX.json");
    const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
    const incomplete = join(prepared.dir, "matrix-incomplete.json");
    writeFileSync(incomplete, JSON.stringify({ runManifestDigest: prepared.run.runManifestDigest, executionId: prepared.run.executionId, matrixDigest: matrix.matrixDigest, rows: [] }));
    const rejected = cli(["seal", "--run", prepared.runPath, "--oracle-report", prepared.oraclePath, "--matrix-report", incomplete], 2);
    assert.equal(rejected.error.code, "MATRIX_INCOMPLETE");
    const closure = join(prepared.dir, "matrix.json");
    writeFileSync(closure, JSON.stringify({
      schemaVersion: 1, runManifestDigest: prepared.run.runManifestDigest, executionId: prepared.run.executionId,
      matrixDigest: matrix.matrixDigest, rows: matrix.rows.map((row) => ({ conditionId: row.conditionId, status: "completed" })),
    }));
    const sealed = cli(["seal", "--run", prepared.runPath, "--oracle-report", prepared.oraclePath, "--matrix-report", closure]);
    assert.equal(sealed.status, "VerifiedResult");
    const index = JSON.parse(readFileSync(join(prepared.dir, "output-index.json"), "utf8"));
    assert.equal(index.entries.filter((entry) => entry.role === "matrix-closure").length, 1);
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

test("shard plan and closure reject shared outputs and duplicated input ownership", () => {
  const fx = fixture();
  try {
    const items = Array.from({ length: 6 }, (_, index) => `sample-${index}`);
    const itemsPath = join(fx.root, "items.json");
    const itemsPayload = `${JSON.stringify(items)}\n`;
    writeFileSync(itemsPath, itemsPayload);
    fx.spec.compute.partitioning = {
      mode: "sharded", itemManifestDigest: sha256(itemsPayload), expectedItems: items.length,
      shardCount: 2, assignment: "balanced-contiguous", resultItemIdField: "itemId",
    };
    writeFileSync(fx.specPath, `${JSON.stringify(fx.spec, null, 2)}\n`);
    const init = cli(["init", "--spec", fx.specPath, "--runtime-root", fx.runtime]);
    const run = JSON.parse(readFileSync(init.run, "utf8")); const dir = runDir(init.run);
    const planPath = join(dir, "SHARD-PLAN.json"); const plan = cli(["plan-shards", "--run", init.run, "--items", itemsPath, "--out", planPath]);
    assert.equal(plan.shardCount, 2);
    const receiptPaths = [];
    for (const shard of JSON.parse(readFileSync(planPath, "utf8")).shards) {
      const shardDir = join(dir, shard.outputPrefix, "worker-1"); mkdirSync(shardDir, { recursive: true });
      const itemPath = join(shardDir, "items.json"); writeFileSync(itemPath, `${JSON.stringify(shard.itemIds)}\n`);
      const outputPath = join(shardDir, "results.jsonl"); writeFileSync(outputPath, shard.itemIds.map((id) => JSON.stringify({ itemId: id })).join("\n") + "\n");
      const receiptPath = join(shardDir, "RECEIPT.json");
      cli(["record-shard", "--run", init.run, "--plan", planPath, "--out", receiptPath, "--shard-id", shard.shardId, "--worker-attempt-id", "worker-1", "--endpoint", `gpu-${shard.shardId}`, "--item-manifest", itemPath, "--output", outputPath, "--rows", String(shard.expectedItems)]);
      receiptPaths.push(receiptPath);
    }
    const closurePath = join(dir, "SHARD-CLOSURE.json");
    const closure = cli(["verify-shards", "--run", init.run, "--plan", planPath, "--out", closurePath, ...receiptPaths.flatMap((value) => ["--shard-receipt", value])]);
    assert.equal(closure.shardCount, 2); assert.equal(closure.completedItems, 6);
    const shardOne = JSON.parse(readFileSync(planPath, "utf8")).shards[1];
    const wrongItems = join(dir, "shards", shardOne.shardId, "worker-1", "wrong-items.json");
    mkdirSync(join(dir, "shards", shardOne.shardId, "worker-1"), { recursive: true });
    writeFileSync(wrongItems, `${JSON.stringify(JSON.parse(readFileSync(planPath, "utf8")).shards[0].itemIds)}\n`);
    const wrongOutput = join(dir, "shards", shardOne.shardId, "attempts", "worker-2", "results.jsonl"); mkdirSync(join(dir, "shards", shardOne.shardId, "attempts", "worker-2"), { recursive: true }); writeFileSync(wrongOutput, "{}\n");
    const rejected = cli(["record-shard", "--run", init.run, "--plan", planPath, "--out", join(dir, "bad-receipt.json"), "--shard-id", shardOne.shardId, "--worker-attempt-id", "worker-2", "--endpoint", "gpu-b", "--item-manifest", wrongItems, "--output", wrongOutput, "--rows", String(shardOne.expectedItems)], 2);
    assert.equal(rejected.error.code, "SHARD_ASSIGNMENT_MISMATCH");
    const sharedOutput = join(dir, "shards", shardOne.shardId, "attempts", "worker-1", "results.jsonl");
    const sharedRejected = cli(["record-shard", "--run", init.run, "--plan", planPath, "--out", join(dir, "shared-receipt.json"), "--shard-id", shardOne.shardId, "--worker-attempt-id", "worker-3", "--endpoint", "gpu-b", "--item-manifest", join(dir, "shards", shardOne.shardId, "attempts", "worker-1", "items.json"), "--output", sharedOutput, "--rows", String(shardOne.expectedItems)], 2);
    assert.equal(sharedRejected.error.code, "SHARD_OUTPUT_CONFLICT");
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

test("seal and verify produce a tamper-evident VerifiedResult", () => {
  const fx = fixture();
  try {
    const prepared = prepareRun(fx);
    const sealed = cli(["seal", "--run", prepared.runPath, "--oracle-report", prepared.oraclePath]);
    assert.equal(sealed.status, "VerifiedResult");
    const verified = cli(["verify-run", "--run", prepared.runPath]);
    assert.equal(verified.state, "VerifiedResult");
    assert.equal(verified.checks.experiment, "pass");
    assert.equal(verified.checks.attempt, "pass");
    const checkpointArtifact = join(prepared.dir, "checkpoints", "step-10.bin");
    writeFileSync(checkpointArtifact, "checkpoint\n");
    const checkpoint = cli(["record-checkpoint", "--run", prepared.runPath, "--out", join(prepared.dir, "checkpoints", "step-10.json"), "--artifact", checkpointArtifact, "--checkpoint-id", "step-10", "--step", "10"]);
    assert.equal(checkpoint.action, "record-checkpoint");
    const analysis = cli(["record-analysis", "--run", prepared.runPath, "--out", join(prepared.dir, "analysis-record.json"), "--output-index", join(prepared.dir, "output-index.json"), "--analysis-id", "metrics-v1", "--method", "bootstrap", "--code-digest", sha256("analysis-code"), "--config-digest", sha256("analysis-config")]);
    assert.equal(analysis.action, "record-analysis");
    // A copied run tree remains verifiable because runtime paths are relative.
    const copied = join(fx.root, "copied-experiment");
    cpSync(join(prepared.dir, "..", "..", "..", ".."), copied, { recursive: true });
    const copiedRun = join(copied, "attempts", prepared.run.semanticAttemptId, "executions", prepared.run.executionId, "RUN.json");
    assert.equal(cli(["verify-run", "--run", copiedRun]).state, "VerifiedResult");
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

test("receipt mutation after bind and duplicate output paths are rejected", () => {
  const fx = fixture();
  try {
    const prepared = prepareRun(fx);
    writeFileSync(prepared.receiptPath, "{\"tampered\":true}\n");
    const failed = cli(["seal", "--run", prepared.runPath, "--oracle-report", prepared.oraclePath], 2);
    assert.equal(failed.error.code, "RECEIPT_STALE");

    const fx2 = fixture();
    try {
      fx2.spec.oracle.requiredOutputs = [
        { path: "outputs/metrics.json", role: "metrics" },
        { path: "outputs/metrics.json", role: "duplicate" },
      ];
      writeFileSync(fx2.specPath, `${JSON.stringify(fx2.spec, null, 2)}\n`);
      const duplicate = cli(["init", "--spec", fx2.specPath, "--runtime-root", fx2.runtime], 2);
      assert.equal(duplicate.error.code, "OUTPUT_DUPLICATE");
    } finally { rmSync(fx2.root, { recursive: true, force: true }); }
    const fx3 = fixture();
    try {
      const init3 = cli(["init", "--spec", fx3.specPath, "--runtime-root", fx3.runtime]);
      const run3 = JSON.parse(readFileSync(init3.run, "utf8"));
      const dir3 = runDir(init3.run);
      const receipt3 = join(dir3, "receipts", "resource.json");
      const environment3 = join(dir3, "receipts", "environment.json");
      writeFileSync(receipt3, `${JSON.stringify({ schemaVersion: 1 }, null, 2)}\n`);
      writeFileSync(environment3, `${JSON.stringify({ runManifestDigest: run3.runManifestDigest, executionId: run3.executionId, observed: {}, unobservable: ["all"] }, null, 2)}\n`);
      cli(["bind", "--run", init3.run, "--job-ref", `job-${run3.executionId}`, "--executor-kind", "local", "--executor-target", "test-host", "--receipt", `resource=${receipt3}`, "--receipt", `environment=${environment3}`]);
      writeFileSync(join(dir3, "outputs", "metrics.json"), '{"metric":0.9}\n');
      writeFileSync(join(dir3, "outputs", "analysis.json"), '{"delta":0.1}\n');
      const oracle3 = join(dir3, "oracle.json");
      writeFileSync(oracle3, `${JSON.stringify({ schemaVersion: 1, status: "pass", runManifestDigest: run3.runManifestDigest, executionId: run3.executionId, terminalState: "succeeded" }, null, 2)}\n`);
      const unbound = cli(["seal", "--run", init3.run, "--oracle-report", oracle3], 2);
      assert.equal(unbound.error.code, "RECEIPT_UNBOUND");
    } finally { rmSync(fx3.root, { recursive: true, force: true }); }
    const fx4 = fixture();
    try {
      const prepared4 = cli(["init", "--spec", fx4.specPath, "--runtime-root", fx4.runtime]);
      const receipt = join(prepared4.run.replace(/\/RUN\.json$/u, ""), "receipts", "same.json");
      const run4 = JSON.parse(readFileSync(prepared4.run, "utf8"));
      writeFileSync(receipt, `${JSON.stringify({ runManifestDigest: run4.runManifestDigest, executionId: run4.executionId }, null, 2)}\n`);
      const duplicateReceipt = cli(["bind", "--run", prepared4.run, "--job-ref", "job-duplicate", "--executor-kind", "local", "--executor-target", "test-host", "--receipt", `resource=${receipt}`, "--receipt", `hardware=${receipt}`], 2);
      assert.equal(duplicateReceipt.error.code, "RECEIPT_DUPLICATE");
    } finally { rmSync(fx4.root, { recursive: true, force: true }); }
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

test("same semantic retry stays in one attempt; code/config change is a new attempt", () => {
  const fx = fixture();
  try {
    const first = prepareRun(fx);
    const retry = cli(["init", "--spec", fx.specPath, "--runtime-root", fx.runtime, "--retry-of", first.runPath]);
    assert.equal(retry.semanticAttemptId, first.init.semanticAttemptId);
    assert.notEqual(retry.executionId, first.init.executionId);
    assert.equal(cli(["compare", "--left", first.runPath, "--right", retry.run]).sameSemantic, true);
    fx.spec.source.scope.reverse();
    writeFileSync(fx.specPath, `${JSON.stringify(fx.spec, null, 2)}\n`);
    const reordered = cli(["init", "--spec", fx.specPath, "--runtime-root", fx.runtime, "--retry-of", first.runPath]);
    assert.equal(reordered.semanticAttemptId, first.init.semanticAttemptId);
    assert.equal(cli(["compare", "--left", first.runPath, "--right", reordered.run]).sameSemantic, true);
    writeFileSync(join(fx.source, "configs", "base.json"), '{"lr":0.002}\n');
    git(fx.source, ["add", "configs/base.json"]);
    git(fx.source, ["commit", "--quiet", "-m", "change config"]);
    const changed = cli(["init", "--spec", fx.specPath, "--runtime-root", fx.runtime, "--compare-to", first.runPath]);
    assert.notEqual(changed.semanticAttemptId, first.init.semanticAttemptId);
    const comparison = cli(["compare", "--left", first.runPath, "--right", changed.run]);
    assert.equal(comparison.sameSemantic, false);
    assert.ok(comparison.changedDimensions.includes("source"));
    assert.ok(comparison.changedDimensions.includes("configs"));
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

test("dirty source and source-scope mutation cannot be silently attributed", () => {
  const fx = fixture();
  try {
    const clean = cli(["init", "--spec", fx.specPath, "--runtime-root", fx.runtime]);
    writeFileSync(join(fx.source, "untracked.txt"), "not committed\n");
    const dirty = cli(["init", "--spec", fx.specPath, "--runtime-root", fx.runtime], 2);
    assert.equal(dirty.error.code, "DIRTY_SOURCE");
    rmSync(join(fx.source, "untracked.txt"));
    writeFileSync(join(fx.source, "src", "train.py"), "print('changed')\n");
    git(fx.source, ["add", "src/train.py"]);
    git(fx.source, ["commit", "--quiet", "-m", "change source"]);
    const changed = cli(["verify-source", "--run", clean.run], 2);
    assert.equal(changed.error.code, "SOURCE_CHANGED");
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});
