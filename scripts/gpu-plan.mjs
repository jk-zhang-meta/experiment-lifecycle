#!/usr/bin/env node
/* Validate and expand the small, project-owned GPU experiment plan. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { accessSync, constants as fsConstants } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PROFILES = new Set(["bounded", "expensive", "build"]);
const MODES = new Set(["capacity-probe", "scientific"]);
class PlanError extends Error {
  constructor(code, message, details = undefined) {
    super(message); this.name = "PlanError"; this.code = code; this.details = details;
  }
}
function fail(code, message, details) { throw new PlanError(code, message, details); }
function readPlan(file) {
  if (typeof file !== "string" || !isAbsolute(file)) fail("PATH_INVALID", "Plan path must be absolute.");
  const target = resolve(file);
  const stat = lstatSync(target, { throwIfNoEntry: false });
  if (!stat?.isFile() || stat.isSymbolicLink()) fail("PATH_INVALID", `Plan must be a regular file: ${target}`);
  try { return { target, value: JSON.parse(readFileSync(target, "utf8")) }; }
  catch (error) { fail("PLAN_JSON_INVALID", `Cannot parse plan: ${error.message}`); }
}
function safeId(value, label) {
  if (typeof value !== "string" || !value.trim() || value.length > 512 ||
      /[*?{}\[\]]/u.test(value) || value.includes("\0")) {
    fail("PLAN_ALLOWLIST_INVALID", `${label} must be a concrete, non-wildcard identifier.`);
  }
  return value.trim();
}
function finiteNumber(value) {
  if (value === undefined || value === null || value === "" || value === "N/A") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
export function validate(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.schemaVersion !== 1) {
    fail("PLAN_INVALID", "Plan must be an object with schemaVersion 1.");
  }
  if (!MODES.has(value.mode)) fail("PLAN_INVALID", "mode must be capacity-probe or scientific.");
  if (!Array.isArray(value.gpuAllowlist) || value.gpuAllowlist.length === 0) {
    fail("PLAN_ALLOWLIST_INVALID", "gpuAllowlist must contain at least one concrete device ID.");
  }
  const gpuAllowlist = value.gpuAllowlist.map((entry) => safeId(entry, "GPU ID"));
  if (new Set(gpuAllowlist).size !== gpuAllowlist.length) fail("PLAN_ALLOWLIST_INVALID", "gpuAllowlist contains duplicates.");
  if (!Array.isArray(value.modelAllowlist) || value.modelAllowlist.length === 0) {
    fail("PLAN_ALLOWLIST_INVALID", "modelAllowlist must contain at least one model revision.");
  }
  const seenModels = new Set();
  const modelAllowlist = value.modelAllowlist.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) fail("PLAN_MODEL_INVALID", `modelAllowlist[${index}] must be an object.`);
    const id = safeId(entry.id, `modelAllowlist[${index}].id`);
    const revision = safeId(entry.revision, `modelAllowlist[${index}].revision`);
    const key = `${id}\0${revision}`;
    if (seenModels.has(key)) fail("PLAN_MODEL_INVALID", `Duplicate model revision: ${id}@${revision}`);
    seenModels.add(key);
    return { id, revision, label: entry.label ? safeId(entry.label, "model label") : null };
  });
  const reservePercent = Number(value.reservePercent ?? 10);
  const reserveMiB = Number(value.reserveMiB ?? 512);
  if (!Number.isFinite(reservePercent) || reservePercent < 1 || reservePercent > 50) {
    fail("PLAN_RESERVE_INVALID", "reservePercent must be between 1 and 50.");
  }
  if (!Number.isFinite(reserveMiB) || reserveMiB < 128 || reserveMiB > 131072) {
    fail("PLAN_RESERVE_INVALID", "reserveMiB must be between 128 and 131072.");
  }
  const scheduling = value.scheduling;
  if (!scheduling || typeof scheduling !== "object" || Array.isArray(scheduling)) {
    fail("PLAN_SCHEDULING_INVALID", "scheduling is required.");
  }
  const maxConcurrentPerGpu = Number(scheduling.maxConcurrentPerGpu);
  if (!Number.isInteger(maxConcurrentPerGpu) || maxConcurrentPerGpu < 1 || maxConcurrentPerGpu > 32) {
    fail("PLAN_SCHEDULING_INVALID", "maxConcurrentPerGpu must be an integer from 1 to 32.");
  }
  if (scheduling.queuePolicy !== "fill-ready-authorized-rows") {
    fail("PLAN_SCHEDULING_INVALID", "queuePolicy must be fill-ready-authorized-rows.");
  }
  const allowProviderParallelism = scheduling.allowProviderParallelism === true;
  const resourceProfile = value.resourceProfile || "bounded";
  if (!PROFILES.has(resourceProfile)) fail("PLAN_SCHEDULING_INVALID", "resourceProfile is invalid.");
  let experiment = null;
  if (value.experiment !== undefined) {
    if (!value.experiment || typeof value.experiment !== "object" || Array.isArray(value.experiment)) {
      fail("PLAN_EXPERIMENT_INVALID", "experiment must be an object.");
    }
    const dataset = value.experiment.dataset;
    if (!dataset || typeof dataset !== "object" || Array.isArray(dataset)) {
      fail("PLAN_EXPERIMENT_INVALID", "experiment.dataset with an exact id and revision is required.");
    }
    if (!Array.isArray(value.experiment.seeds) || !value.experiment.seeds.length ||
        value.experiment.seeds.some((seed) => !Number.isSafeInteger(seed))) {
      fail("PLAN_EXPERIMENT_INVALID", "experiment.seeds must contain one or more safe integers.");
    }
    if (!Array.isArray(value.experiment.metrics) || !value.experiment.metrics.length) {
      fail("PLAN_EXPERIMENT_INVALID", "experiment.metrics must contain one or more metric identifiers.");
    }
    experiment = {
      dataset: { id: safeId(dataset.id, "dataset id"), revision: safeId(dataset.revision, "dataset revision") },
      inputSlice: value.experiment.inputSlice ? safeId(value.experiment.inputSlice, "input slice") : null,
      seeds: [...new Set(value.experiment.seeds)],
      metrics: [...new Set(value.experiment.metrics.map((metric) => safeId(metric, "metric")))],
      protocolDigest: safeId(value.experiment.protocolDigest, "protocol digest"),
      environmentDigest: value.experiment.environmentDigest
        ? safeId(value.experiment.environmentDigest, "environment digest") : null,
    };
  }
  if (value.mode === "scientific" && !experiment) {
    fail("PLAN_EXPERIMENT_REQUIRED", "scientific mode requires dataset, seeds, metrics, and a frozen protocol digest.");
  }
  return {
    schemaVersion: 1, mode: value.mode, gpuAllowlist, modelAllowlist,
    reservePercent, reserveMiB,
    scheduling: { maxConcurrentPerGpu, queuePolicy: scheduling.queuePolicy, allowProviderParallelism },
    resourceProfile, experiment,
  };
}
export function matrix(plan) {
  const seeds = plan.experiment?.seeds || [null];
  const rows = [];
  for (const [modelIndex, model] of plan.modelAllowlist.entries()) {
    for (const seed of seeds) {
      rows.push({
        rowId: `${modelIndex + 1}-${model.id.replace(/[^A-Za-z0-9._-]+/gu, "-")}-${model.revision.replace(/[^A-Za-z0-9._-]+/gu, "-")}${seed === null ? "" : `-seed-${seed}`}`,
        model, seed, dataset: plan.experiment?.dataset || null,
        inputSlice: plan.experiment?.inputSlice || null,
        metrics: plan.experiment?.metrics || [], protocolDigest: plan.experiment?.protocolDigest || null,
        status: "pending", eligibleGpuCount: plan.gpuAllowlist.length,
        smokeRequired: true, fullRunRequired: true,
      });
    }
  }
  return rows;
}
function planDigest(plan) {
  return createHash("sha256").update(JSON.stringify(plan)).digest("hex");
}
export function commandPath(command, env = process.env, cwd = process.cwd()) {
  // Ignore relative PATH entries and the working directory, including aliases.
  const directories = (env.PATH || "").split(":").filter((directory) => isAbsolute(directory));
  for (const candidate of [...directories.map((directory) => resolve(directory, command)), "/usr/lib/wsl/lib/nvidia-smi"]) {
    try {
      if (realpathSync(dirname(candidate)) === realpathSync(cwd) ||
          dirname(realpathSync(candidate)) === realpathSync(cwd)) continue;
      if (!statSync(candidate).isFile()) continue;
      accessSync(candidate, fsConstants.X_OK);
      return candidate;
    } catch { /* next */ }
  }
  return null;
}
export function liveInventory(plan, { env = process.env, run = spawnSync, executable = commandPath("nvidia-smi", env) } = {}) {
  const capturedAt = new Date().toISOString();
  const visible = env.CUDA_VISIBLE_DEVICES === undefined ? null
    : env.CUDA_VISIBLE_DEVICES.split(",").map((item) => item.trim());
  const result = { capturedAt, provider: "nvidia-smi", available: false, unobservable: true,
    visibleDevices: visible, devices: [], eligible: [], missing: [], notVisible: [],
    unsupported: [], allowlistSatisfied: false, capacityReady: false, telemetryComplete: false };
  // CUDA integer ordinals need an executor/runtime mapping: NVML indices are not that proof.
  if (visible !== null && visible.some((id) => !/^GPU-[A-Za-z0-9-]+$/u.test(id))) {
    result.unsupported = [...plan.gpuAllowlist];
    result.error = visible.length === 1 && visible[0] === ""
      ? "CUDA_VISIBLE_DEVICES is empty; no devices are visible."
      : "CUDA visibility requires exact GPU UUIDs or an executor-verified mapping.";
    return result;
  }
  if (!executable) { result.missing = [...plan.gpuAllowlist]; return result; }
  const matches = (id, device) => id === device.uuid || id === device.index ||
    (device.uuid?.startsWith("GPU-") && id === device.uuid.slice(4));
  for (const id of plan.gpuAllowlist) {
    if (!/^(?:[0-9]+|(?:GPU-)?[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)$/u.test(id) || id.startsWith("MIG-")) {
      result.unsupported.push(id);
      continue;
    }
    const query = run(executable, [
      "--id=" + id,
      "--query-gpu=index,name,uuid,memory.total,memory.free,memory.used,utilization.gpu,temperature.gpu,mig.mode.current",
      "--format=csv,noheader,nounits",
    ], { encoding: "utf8", timeout: 3000, maxBuffer: 64 * 1024 });
    if (query.status !== 0 || query.error) { result.missing.push(id); continue; }
    const lines = query.stdout.trim().split(/\r?\n/u).filter(Boolean);
    if (lines.length !== 1) { result.unsupported.push(id); continue; }
    const fields = lines[0].split(",").map((field) => field.trim());
    const device = { index: fields[0], name: fields[1] || null, uuid: fields[2] || null,
      totalMiB: finiteNumber(fields[3]), freeMiB: finiteNumber(fields[4]),
      usedMiB: finiteNumber(fields[5]), utilizationPercent: finiteNumber(fields[6]),
      temperatureC: finiteNumber(fields[7]), migMode: fields[8] || null };
    // An unsupported MIG field means non-MIG hardware; enabled or unknown mode needs an adapter.
    if (fields.length !== 9 || !matches(id, device) || !/^GPU-[A-Za-z0-9-]+$/u.test(device.uuid || "") ||
        !["Disabled", "N/A", "[N/A]", "[Not Supported]"].includes(device.migMode)) {
      result.unsupported.push(id);
      continue;
    }
    if (result.devices.some((existing) => existing.uuid === device.uuid)) {
      result.unsupported.push(id);
      continue;
    }
    const telemetryIssues = [];
    for (const [field, raw, min, max] of [
      ["totalMiB", fields[3], Number.MIN_VALUE, Infinity],
      ["freeMiB", fields[4], 0, Infinity], ["usedMiB", fields[5], 0, Infinity],
      ["utilizationPercent", fields[6], 0, 100], ["temperatureC", fields[7], 0, 200],
    ]) {
      const missing = raw === "" || /^(?:N\/A|\[N\/A\]|\[Not Supported\])$/u.test(raw);
      if (missing || device[field] === null || device[field] < min || device[field] > max) {
        telemetryIssues.push({ field, reason: missing ? "missing" : "invalid" });
        device[field] = null;
      }
    }
    if (device.totalMiB !== null) {
      for (const field of ["freeMiB", "usedMiB"]) {
        if (device[field] !== null && device[field] > device.totalMiB) {
          telemetryIssues.push({ field, reason: "exceeds-total" });
        }
      }
      // NVIDIA may reserve memory outside used; allow 2 MiB display rounding, not excess accounting.
      if (device.freeMiB !== null && device.usedMiB !== null &&
          device.freeMiB + device.usedMiB > device.totalMiB + 2) {
        telemetryIssues.push({ field: "freeMiB", reason: "free-plus-used-exceeds-total" },
          { field: "usedMiB", reason: "free-plus-used-exceeds-total" });
      }
    }
    device.telemetryIssues = telemetryIssues;
    device.telemetryComplete = telemetryIssues.length === 0;
    device.capacityReady = !telemetryIssues.some(issue => ["totalMiB", "freeMiB", "usedMiB"].includes(issue.field));
    const isVisible = visible === null || visible.includes(device.uuid);
    result.devices.push(device);
    result.eligible.push({ id, device, visible: isVisible });
    if (!isVisible) result.notVisible.push(id);
  }
  result.available = result.devices.length > 0;
  const identityComplete = !result.missing.length && !result.unsupported.length;
  result.allowlistSatisfied = identityComplete && !result.notVisible.length &&
    result.eligible.length === plan.gpuAllowlist.length;
  result.telemetryComplete = identityComplete && result.devices.length === plan.gpuAllowlist.length &&
    result.devices.every(device => device.telemetryComplete);
  result.unobservable = !result.telemetryComplete;
  result.capacityReady = result.allowlistSatisfied && result.devices.every(device => device.capacityReady);
  return result;
}
function usage() {
  return "Usage: gpu-plan.mjs validate|matrix|inventory /absolute/path/gpu-experiment-plan.json";
}
export function main(args, { inventory = liveInventory, stdout = text => process.stdout.write(text),
  stderr = text => process.stderr.write(text) } = {}) {
try {
  const [action, file] = args;
  if (!["validate", "matrix", "inventory"].includes(action) || !file) throw new PlanError("USAGE", usage());
  const { target, value } = readPlan(file);
  const plan = validate(value);
  const digest = planDigest(plan);
  const output = action === "matrix"
    ? { schemaVersion: 1, action, plan, planDigest: digest, rows: matrix(plan).map((row) => ({ ...row, planDigest: digest })) }
    : action === "inventory"
      ? { schemaVersion: 1, action, plan, planDigest: digest, inventory: inventory(plan) }
      : { schemaVersion: 1, action, plan, planDigest: digest, modelCount: plan.modelAllowlist.length, gpuCount: plan.gpuAllowlist.length };
  stdout(JSON.stringify({ ...output, planPath: target }, null, 2) + "\n");
  return action === "inventory" && !output.inventory.capacityReady ? 3 : 0;
} catch (error) {
  stderr(JSON.stringify({ error: error.code || "GPU_PLAN_ERROR", message: error.message, details: error.details }) + "\n");
  return 2;
}
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
