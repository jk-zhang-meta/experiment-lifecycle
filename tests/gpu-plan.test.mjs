import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, chmodSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validate, matrix, liveInventory, commandPath, main } from "../scripts/gpu-plan.mjs";

function plan() {
  return { schemaVersion: 1, mode: "scientific", gpuAllowlist: ["GPU-aaaa", "GPU-bbbb"],
    modelAllowlist: [{ id: "org/a", revision: "rev-a" }, { id: "org/b", revision: "rev-b" }],
    scheduling: { maxConcurrentPerGpu: 1, queuePolicy: "fill-ready-authorized-rows" },
    experiment: { dataset: { id: "data", revision: "rev-data" }, inputSlice: "dev-v1",
      seeds: [7, 11], metrics: ["accuracy"], protocolDigest: "frozen-protocol" } };
}
function telemetry(calls, mode = "Disabled") {
  return (executable, args) => {
    calls.push(args);
    assert.equal(executable, "/mock/nvidia-smi");
    const id = args[0].slice("--id=".length);
    assert.ok(["GPU-aaaa", "GPU-bbbb", "0"].includes(id));
    const second = id === "GPU-bbbb";
    return { status: 0, stdout: `${second ? 1 : 0}, Mock GPU, ${second ? "GPU-bbbb" : "GPU-aaaa"}, 24000, 20000, 4000, 0, 40, ${mode}\n` };
  };
}
function inventory(value, env = {}, run = telemetry([])) {
  return liveInventory(validate(value), { env, run, executable: "/mock/nvidia-smi" });
}

test("scientific matrix retains every model × seed and frozen input identity", () => {
  const rows = matrix(validate(plan()));
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map(row => [row.model.id, row.seed]), [["org/a", 7], ["org/a", 11], ["org/b", 7], ["org/b", 11]]);
  assert.equal(new Set(rows.map(row => row.rowId)).size, 4);
  assert.ok(rows.every(row => row.dataset.revision === "rev-data" && row.inputSlice === "dev-v1" && row.protocolDigest === "frozen-protocol"));
});

test("incomplete or wildcard scientific plans are refused before telemetry", () => {
  for (const mutate of [p => delete p.experiment, p => delete p.experiment.dataset.revision,
    p => p.experiment.seeds = [], p => p.experiment.metrics = [], p => delete p.experiment.protocolDigest,
    p => p.gpuAllowlist = [], p => p.gpuAllowlist = ["*"], p => delete p.modelAllowlist[0].revision]) {
    const value = plan(); mutate(value); assert.throws(() => validate(value));
  }
});

test("inventory scopes every provider query to a declared device", () => {
  const calls = [];
  const result = inventory(plan(), { CUDA_VISIBLE_DEVICES: "GPU-bbbb,GPU-aaaa" }, telemetry(calls));
  assert.equal(result.allowlistSatisfied, true);
  assert.deepEqual(calls.map(args => args[0]), ["--id=GPU-aaaa", "--id=GPU-bbbb"]);
  assert.deepEqual(result.devices.map(device => device.uuid), ["GPU-aaaa", "GPU-bbbb"]);
});

test("empty, numeric, malformed or MIG CUDA masks never claim visibility", () => {
  for (const mask of ["", "0,1", "-1", "MIG-aaaa", "GPU-aaaa,", "GPU-aa"]) {
    const calls = [];
    const result = inventory(plan(), { CUDA_VISIBLE_DEVICES: mask }, telemetry(calls));
    assert.equal(result.allowlistSatisfied, false, mask);
    if (mask !== "GPU-aa") assert.equal(calls.length, 0, mask);
  }
});

test("MIG or unknown partition mapping fails closed without broadening inventory", () => {
  for (const mode of ["Enabled", "Unknown", ""]) {
    const result = inventory(plan(), {}, telemetry([], mode));
    assert.equal(result.allowlistSatisfied, false);
    assert.equal(result.unsupported.length, 2);
  }
  const value = plan(); value.gpuAllowlist = ["MIG-GPU-aaaa/1/0"];
  const calls = []; const result = inventory(value, {}, telemetry(calls));
  assert.equal(calls.length, 0);
  assert.equal(result.allowlistSatisfied, false);
});

test("provider error, ambiguous matches and unexpected device fail closed", () => {
  for (const run of [() => ({ status: 1, stdout: "" }),
    () => ({ status: 0, stdout: "0, Other, GPU-cccc, 1, 1, 0, 0, 40, Disabled\n" }),
    () => ({ status: 0, stdout: "row1\nrow2\n" })]) {
    const result = inventory(plan(), {}, run);
    assert.equal(result.allowlistSatisfied, false);
    assert.equal(result.unobservable, true);
    assert.deepEqual(result.devices, []);
  }
});

test("unknown and contradictory capacity telemetry never passes CLI capacity readiness", () => {
  const dir = mkdtempSync(join(tmpdir(), "gpu-telemetry-"));
  try {
    const file = join(dir, "plan.json"); const value = plan(); value.gpuAllowlist = ["GPU-aaaa"];
    writeFileSync(file, JSON.stringify(value));
    const cases = [
      ["N/A", "20000", "4000"], ["24000", "", "4000"], ["24000", "20000", "oops"],
      ["0", "0", "0"], ["24000", "-1", "4000"], ["24000", "25000", "0"],
      ["24000", "20000", "5000"], ["24000", "20000", "Infinity"],
    ];
    for (const memory of cases) {
      const run = () => ({ status: 0, stdout: `0, Mock GPU, GPU-aaaa, ${memory.join(", ")}, 0, 40, Disabled\n` });
      let output;
      const status = main(["inventory", file], { inventory: p => inventory(p, {}, run),
        stdout: text => { output = JSON.parse(text); }, stderr: text => assert.fail(text) });
      assert.equal(status, 3, memory.join(","));
      assert.equal(output.inventory.allowlistSatisfied, true);
      assert.equal(output.inventory.capacityReady, false);
      assert.equal(output.inventory.telemetryComplete, false);
      assert.equal(output.inventory.unobservable, true);
      assert.ok(output.inventory.devices[0].telemetryIssues.length > 0);
    }
    const run = () => ({ status: 0, stdout: "0, Mock GPU, GPU-aaaa, 24000, 20000, 4000, N/A, , Disabled\n" });
    let output;
    assert.equal(main(["inventory", file], { inventory: p => inventory(p, {}, run),
      stdout: text => { output = JSON.parse(text); }, stderr: text => assert.fail(text) }), 0);
    assert.equal(output.inventory.capacityReady, true);
    assert.equal(output.inventory.telemetryComplete, false);
    assert.equal(output.inventory.unobservable, true);
    assert.deepEqual(output.inventory.devices[0].telemetryIssues,
      [{ field: "utilizationPercent", reason: "missing" }, { field: "temperatureC", reason: "missing" }]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("physical index allowlist is checked against exact UUID visibility", () => {
  const value = plan(); value.gpuAllowlist = ["0"];
  assert.equal(inventory(value, { CUDA_VISIBLE_DEVICES: "GPU-aaaa" }).allowlistSatisfied, true);
  assert.equal(inventory(value, { CUDA_VISIBLE_DEVICES: "GPU-bbbb" }).allowlistSatisfied, false);
  value.gpuAllowlist = ["0", "GPU-aaaa"];
  assert.equal(inventory(value).allowlistSatisfied, false, "aliases must not count one GPU twice");
});

test("executable discovery ignores cwd, relative PATH entries and cwd aliases", () => {
  const dir = mkdtempSync(join(tmpdir(), "gpu-path-"));
  const alias = `${dir}-alias`;
  try {
    const fake = join(dir, "nvidia-smi"); writeFileSync(fake, "#!/bin/sh\nexit 99\n"); chmodSync(fake, 0o700);
    symlinkSync(dir, alias);
    assert.notEqual(commandPath("nvidia-smi", { PATH: `.:relative::${dir}:${alias}` }, dir), fake);
    assert.notEqual(commandPath("nvidia-smi", { PATH: alias }, dir), join(alias, "nvidia-smi"));
  } finally { rmSync(alias, { force: true }); rmSync(dir, { recursive: true, force: true }); }
});

test("validate and matrix CLI remain usable; incomplete input exits with error", () => {
  const dir = mkdtempSync(join(tmpdir(), "gpu-cli-"));
  try {
    const file = join(dir, "plan.json"); writeFileSync(file, JSON.stringify(plan()));
    const helper = fileURLToPath(new URL("../scripts/gpu-plan.mjs", import.meta.url));
    for (const action of ["validate", "matrix"]) {
      const result = spawnSync(process.execPath, [helper, action, file], { encoding: "utf8", timeout: 3000 });
      assert.equal(result.status, 0, result.stderr);
      const value = JSON.parse(result.stdout); assert.match(value.planDigest, /^[a-f0-9]{64}$/);
      if (action === "matrix") assert.equal(value.rows.length, 4);
    }
    writeFileSync(file, "{}");
    const result = spawnSync(process.execPath, [helper, "validate", file], { encoding: "utf8", timeout: 3000 });
    assert.equal(result.status, 2); assert.equal(JSON.parse(result.stderr).error, "PLAN_INVALID");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
