#!/usr/bin/env node
/*
 * PAC Experiment Lifecycle.
 *
 * A small, dependency-free identity and evidence helper.  It never invokes a
 * shell or a project command; project runners and validators remain owned by
 * the project/executor.  All paths are explicit and all records are write-once.
 */
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync, closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync,
  opendirSync, readFileSync, readSync, realpathSync, renameSync, unlinkSync, writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir, hostname, platform, release, arch } from "node:os";
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";

const SCHEMA_VERSION = 1;
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const MAX_SPEC_BYTES = 2 * 1024 * 1024;
const MAX_SHARD_ITEMS = 200000;
const MAX_GIT_BYTES = 64 * 1024 * 1024;
const MAX_GIT_MS = 30000;
const MAX_STATUS_ITEMS = 4096;
const MAX_TREE_FILES = 200000;
const MAX_TREE_DIRS = 10000;
const MAX_TREE_ENTRIES = 500000;
const MAX_DIR_ENTRIES = 8192;
const MAX_TREE_BYTES = 2 * 1024 * 1024 * 1024 * 1024;
const MAX_TREE_MS = 120000;
const DIGEST_RE = /^(?:sha256:)?([0-9a-f]{64})$/iu;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,96}$/u;
const CHANGE_CLASSES = new Set([
  "feature", "bugfix", "refactor", "reproduction", "config", "data",
  "model", "environment", "protocol", "benchmark", "unknown",
]);
const DIMENSIONS = [
  "researchIntent", "source", "entrypoint", "configs", "data", "models", "protocol",
  "environment", "randomness", "factors", "matrix", "partitioning", "oracle", "analysis", "scientificCompute",
];
const DIMENSION_CLASSES = {
  researchIntent: "research",
  source: "source",
  entrypoint: "entrypoint",
  configs: "config",
  data: "data",
  models: "model",
  protocol: "protocol",
  environment: "environment",
  randomness: "randomness",
  factors: "factor",
  matrix: "factor",
  partitioning: "data",
  oracle: "oracle",
  analysis: "analysis",
  scientificCompute: "compute",
};
const SECRET_KEY_RE = /(?:^|[_-])(password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key|credential)(?:$|[_-])/iu;

class ExperimentError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "ExperimentError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = undefined) {
  throw new ExperimentError(code, message, details);
}

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonicalValue(value, pathLabel = "value") {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("JSON_INVALID", "Non-finite numbers are not allowed in a manifest.");
    return value;
  }
  if (Array.isArray(value)) return value.map((item, index) => canonicalValue(item, `${pathLabel}[${index}]`));
  if (typeof value === "object") {
    const result = {};
    for (const key of Object.keys(value).sort()) result[key] = canonicalValue(value[key], `${pathLabel}.${key}`);
    return result;
  }
  fail("JSON_INVALID", `Unsupported value in canonical JSON at ${pathLabel}.`);
}

function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function digestBytes(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function digestValue(value) {
  return digestBytes(canonicalJson(value));
}

function normalizeDigest(value, label) {
  if (typeof value !== "string") fail("DIGEST_INVALID", `${label} must be a SHA-256 digest.`);
  const match = value.match(DIGEST_RE);
  if (!match) fail("DIGEST_INVALID", `${label} must be sha256:<64 lowercase hexadecimal characters>.`);
  return `sha256:${match[1].toLowerCase()}`;
}

function safeId(value, label) {
  if (typeof value !== "string" || !ID_RE.test(value)) fail("ID_INVALID", `${label} is not a safe identifier.`);
  return value;
}

function safeText(value, label, max = 4096) {
  if (typeof value !== "string" || value.length === 0 || value.length > max || /[\u0000\r\n]/u.test(value)) {
    fail("TEXT_INVALID", `${label} must be a non-empty single-line value.`);
  }
  return value;
}

function assertNoSecrets(value, pathLabel = "spec") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecrets(item, `${pathLabel}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY_RE.test(key)) fail("SECRET_FIELD", `${pathLabel}.${key} looks like a credential field; store a source label/digest instead.`);
    assertNoSecrets(child, `${pathLabel}.${key}`);
  }
}

function abs(value, label) {
  if (typeof value !== "string" || !value || !isAbsolute(value) || /[\u0000\r\n]/u.test(value)) {
    fail("PATH_INVALID", `${label} must be an absolute path without control characters.`);
  }
  return resolve(value);
}

function within(root, candidate, same = false) {
  const suffix = relative(root, candidate);
  return (same && suffix === "") ||
    (suffix !== "" && suffix !== ".." && !suffix.startsWith(`..${sep}`) && !isAbsolute(suffix));
}

// macOS exposes a few root-level compatibility aliases (most notably
// /var -> /private/var and /tmp -> /private/tmp). They are system-owned and
// unavoidable for os.tmpdir(), but arbitrary symlinked project/runtime
// ancestors must still fail closed. Permit only the exact aliases whose
// ownership, permissions, and real target match Apple's layout.
const DARWIN_SYSTEM_ALIASES = new Map([
  ["/var", "/private/var"],
  ["/tmp", "/private/tmp"],
]);

function isTrustedDarwinAlias(cursor) {
  if (platform() !== "darwin") return false;
  const expected = DARWIN_SYSTEM_ALIASES.get(cursor);
  if (!expected) return false;
  try {
    const stat = lstatSync(cursor);
    return stat.isSymbolicLink() && stat.uid === 0 && (stat.mode & 0o022) === 0 &&
      realpathSync.native(cursor) === expected;
  } catch {
    return false;
  }
}

function noSymlinkAncestors(target, label, allowMissing = false) {
  const absolute = resolve(target);
  const root = parse(absolute).root;
  let cursor = root;
  for (const part of absolute.slice(root.length).split(sep).filter(Boolean)) {
    cursor = join(cursor, part);
    try {
      const stat = lstatSync(cursor);
      if (stat.isSymbolicLink() && !isTrustedDarwinAlias(cursor)) {
        fail("PATH_UNSAFE", `${label} contains a symlink: ${cursor}`);
      }
    } catch (error) {
      if (allowMissing && error.code === "ENOENT") break;
      throw error;
    }
  }
}

function requireDirectory(target, label, allowMissing = false) {
  noSymlinkAncestors(target, label, allowMissing);
  try {
    const stat = lstatSync(target);
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail("PATH_INVALID", `${label} must be a real directory.`);
  } catch (error) {
    if (allowMissing && error.code === "ENOENT") return;
    throw error;
  }
}

function canonicalExistingPath(target, label) {
  try { return realpathSync.native(target); }
  catch (error) { fail("PATH_INVALID", `${label} could not be resolved: ${error.message}`); }
}

function requireFile(target, label) {
  noSymlinkAncestors(target, label);
  let stat;
  try { stat = lstatSync(target); }
  catch (error) { if (error.code === "ENOENT") fail("NOT_FOUND", `${label} does not exist: ${target}`); throw error; }
  if (!stat.isFile() || stat.isSymbolicLink()) fail("PATH_INVALID", `${label} must be a regular file.`);
  return stat;
}

function storageKey(value) {
  return String(value).toLowerCase().replaceAll("\\", "/");
}

function isSynchronizedStorage(value) {
  const key = storageKey(value);
  return key.includes("/mnt/c/") || key.includes("/mnt/d/") ||
    key.includes("onedrive") || key.includes("cloudstorage");
}

function safeRuntimeRoot(value) {
  const target = abs(value, "runtime-root");
  const home = resolve(homedir());
  let canonicalTarget = null;
  try { canonicalTarget = realpathSync.native(target); } catch { /* allow a new leaf */ }
  if (target === parse(target).root || target === home ||
      ["/private/var", "/private/tmp"].includes(canonicalTarget) ||
      isSynchronizedStorage(target)) {
    fail("RUNTIME_ROOT_UNSAFE", "runtime-root must be a narrow non-synchronized directory, not a filesystem/home/sync container.");
  }
  requireDirectory(target, "runtime-root", true);
  return target;
}

function relativeOrMarker(root, target, marker) {
  const rel = relative(root, target).replaceAll("\\", "/");
  return rel && !rel.startsWith("..") && !isAbsolute(rel) ? rel : marker;
}

function readBounded(target, label, maxBytes = MAX_JSON_BYTES) {
  const stat = requireFile(target, label);
  if (stat.size > maxBytes) fail("INPUT_CAP", `${label} exceeds ${maxBytes} bytes.`);
  return readFileSync(target, "utf8");
}

function readJson(target, label, maxBytes = MAX_JSON_BYTES) {
  let value;
  try { value = JSON.parse(readBounded(target, label, maxBytes)); }
  catch (error) {
    if (error instanceof ExperimentError) throw error;
    fail("JSON_INVALID", `${label} is not valid JSON: ${error.message}`);
  }
  assertNoSecrets(value, label);
  return value;
}

function hashFile(target, label) {
  const stat = requireFile(target, label);
  const hash = createHash("sha256");
  const fd = openSync(target, "r");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let remaining = stat.size;
  try {
    while (remaining > 0) {
      const read = readSync(fd, buffer, 0, Math.min(buffer.length, remaining), null);
      if (read <= 0) fail("READ_FAILED", `Could not read ${label}.`);
      hash.update(buffer.subarray(0, read));
      remaining -= read;
    }
  } finally { closeSync(fd); }
  return { sha256: `sha256:${hash.digest("hex")}`, bytes: Number(stat.size), kind: "file", files: 1, dirs: 0, entries: 1 };
}

function digestTree(target, label) {
  const start = Date.now();
  const counts = { bytes: 0, files: 0, dirs: 0, entries: 0 };
  function visit(current) {
    if (Date.now() - start > MAX_TREE_MS) fail("TREE_CAP", `${label} exceeded the hashing wall-time cap.`);
    noSymlinkAncestors(current, label);
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) fail("PATH_UNSAFE", `${label} contains a symlink: ${current}`);
    if (stat.isFile()) {
      const item = hashFile(current, label);
      counts.bytes += item.bytes; counts.files += 1; counts.entries += 1;
      if (counts.files > MAX_TREE_FILES || counts.bytes > MAX_TREE_BYTES || counts.entries > MAX_TREE_ENTRIES) {
        fail("TREE_CAP", `${label} exceeded the file/byte safety cap.`);
      }
      return { type: "file", bytes: item.bytes, sha256: item.sha256 };
    }
    if (!stat.isDirectory()) fail("PATH_UNSAFE", `${label} contains a special file: ${current}`);
    counts.dirs += 1; counts.entries += 1;
    if (counts.dirs > MAX_TREE_DIRS || counts.entries > MAX_TREE_ENTRIES) fail("TREE_CAP", `${label} exceeded the directory/entry cap.`);
    const directory = opendirSync(current);
    const children = [];
    try {
      for (;;) {
        const entry = directory.readSync();
        if (entry === null) break;
        children.push(entry);
        if (children.length > MAX_DIR_ENTRIES) {
          fail("TREE_CAP", `${label} contains more than ${MAX_DIR_ENTRIES} entries in one directory.`);
        }
      }
    } finally { directory.closeSync(); }
    children.sort((a, b) => a.name.localeCompare(b.name));
    const entries = [];
    for (const entry of children) {
      if (entry.isSymbolicLink()) fail("PATH_UNSAFE", `${label} contains a symlink: ${join(current, entry.name)}`);
      const child = join(current, entry.name);
      const item = visit(child);
      entries.push({ name: entry.name, ...item });
    }
    return { type: "directory", entries };
  }
  const tree = visit(target);
  return {
    sha256: digestValue(tree), bytes: counts.bytes, kind: tree.type,
    files: counts.files, dirs: counts.dirs, entries: counts.entries,
  };
}

function digestPath(target, label) {
  const stat = requireFileOrDirectory(target, label);
  return stat.isFile() ? hashFile(target, label) : digestTree(target, label);
}

function requireFileOrDirectory(target, label) {
  noSymlinkAncestors(target, label);
  let stat;
  try { stat = lstatSync(target); }
  catch (error) { if (error.code === "ENOENT") fail("NOT_FOUND", `${label} does not exist: ${target}`); throw error; }
  if ((!stat.isFile() && !stat.isDirectory()) || stat.isSymbolicLink()) fail("PATH_INVALID", `${label} must be a regular file or directory.`);
  return stat;
}

function fsyncDirectory(directory) {
  try {
    const fd = openSync(directory, "r");
    try { fsyncSync(fd); } finally { closeSync(fd); }
  } catch { /* Some filesystems do not permit directory fsync; record remains atomic. */ }
}

function writeImmutableRecord(target, value, digestFields = ["recordDigest"]) {
  if (existsSync(target)) fail("IMMUTABLE_EXISTS", `Refusing to overwrite immutable record: ${target}`);
  const unsigned = jsonClone(value);
  for (const field of digestFields) delete unsigned[field];
  const digest = digestBytes(canonicalJson(unsigned));
  const record = { ...unsigned };
  for (const field of digestFields) record[field] = digest;
  const parent = dirname(target);
  noSymlinkAncestors(parent, "record parent", true);
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  requireDirectory(parent, "record parent");
  const temporary = `${target}.partial-${process.pid}-${randomUUID().slice(0, 8)}`;
  const payload = `${JSON.stringify(record, null, 2)}\n`;
  try {
    const fd = openSync(temporary, "wx", 0o600);
    try { writeFileSync(fd, payload, { encoding: "utf8" }); fsyncSync(fd); }
    finally { closeSync(fd); }
    chmodSync(temporary, 0o600);
    renameSync(temporary, target);
    fsyncDirectory(parent);
  } catch (error) {
    try { if (existsSync(temporary)) unlinkSync(temporary); } catch { /* preserve the original failure */ }
    throw error;
  }
  return record;
}

function verifyRecord(record, label, digestFields = ["recordDigest"]) {
  if (!record || typeof record !== "object" || Array.isArray(record)) fail("RECORD_INVALID", `${label} must be an object.`);
  const unsigned = jsonClone(record);
  for (const field of digestFields) delete unsigned[field];
  const actual = digestBytes(canonicalJson(unsigned));
  for (const field of digestFields) {
    const expected = record[field];
    if (typeof expected !== "string" || normalizeDigest(expected, `${label}.${field}`) !== actual) {
      fail("RECORD_TAMPERED", `${label} digest does not match its content.`, { field, expected, actual });
    }
  }
  return actual;
}

function runGit(root, args, label, maxBytes = MAX_GIT_BYTES) {
  try {
    const output = execFileSync("git", args, {
      cwd: root, encoding: "utf8", maxBuffer: maxBytes,
      timeout: MAX_GIT_MS,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return output.trim();
  } catch (error) {
    fail("GIT_FAILED", `${label} failed: ${String(error.stderr || error.message).trim()}`);
  }
}

function gitSnapshot(sourceRoot, sourceSpec) {
  requireDirectory(sourceRoot, "source.root");
  const top = runGit(sourceRoot, ["rev-parse", "--show-toplevel"], "git root");
  // Git on macOS reports the canonical /private/var path even when the caller
  // used the conventional /var alias. Compare real paths so the system alias
  // does not look like a different checkout, while arbitrary symlinked roots
  // remain rejected by the ancestor checks above.
  const actualTop = canonicalExistingPath(resolve(top), "git root");
  const canonicalSourceRoot = canonicalExistingPath(sourceRoot, "source.root");
  if (actualTop !== canonicalSourceRoot) fail("SOURCE_ROOT_MISMATCH", `source.root is not the Git root (${actualTop}).`);
  const commit = runGit(sourceRoot, ["rev-parse", "HEAD"], "git commit");
  const treeOid = runGit(sourceRoot, ["rev-parse", "HEAD^{tree}"], "git tree");
  // The digest is over the stable Git tree object ID, not a recursive file walk.
  // This keeps init bounded even when a checkout has large ignored/generated
  // directories.  Scoped files below are still hashed explicitly.
  const treeDigest = digestBytes(treeOid);
  const statusRaw = runGit(sourceRoot, ["status", "--porcelain=v1", "--untracked-files=normal"], "git status");
  const statusItems = statusRaw ? statusRaw.split(/\r?\n/u).filter(Boolean).slice(0, MAX_STATUS_ITEMS) : [];
  if (statusRaw && statusItems.length >= MAX_STATUS_ITEMS) fail("STATUS_CAP", "Git status exceeded the item cap; narrow the project or clean the tree.");
  if (statusItems.length) {
    fail("DIRTY_SOURCE", "Source tree is dirty; commit all experiment source changes before initialization or verification. A supplied patch cannot prove a complete working-tree snapshot.");
  } else if (sourceSpec.dirtyPatch) {
    fail("PATCH_WITH_CLEAN_SOURCE", "source.dirtyPatch was supplied but the Git tree is clean.");
  }
  const scope = Array.isArray(sourceSpec.scope) ? sourceSpec.scope : [];
  const scoped = scope.map((entry, index) => {
    if (typeof entry !== "string" || !entry || isAbsolute(entry) || entry.includes("..")) {
      fail("SOURCE_SCOPE_INVALID", `source.scope[${index}] must be a relative path without traversal.`);
    }
    const target = resolve(sourceRoot, entry);
    if (!within(sourceRoot, target)) fail("SOURCE_SCOPE_INVALID", `source.scope[${index}] escaped source.root.`);
    const digest = digestPath(target, `source.scope[${index}]`);
    return { path: entry.replaceAll("\\", "/"), ...digest };
  }).sort((left, right) => left.path.localeCompare(right.path));
  return {
    root: sourceRoot,
    commit,
    treeOid,
    treeDigest,
    status: statusItems.length ? "dirty" : "clean",
    statusDigest: digestBytes(statusRaw),
    statusItems,
    dirtyPatch: null,
    scope: scoped,
  };
}

function normalizePathDescriptor(entry, sourceRoot, label, allowDirectory = true) {
  if (typeof entry === "string") entry = { path: entry };
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) fail("INPUT_INVALID", `${label} must be an object.`);
  const rawPath = entry.path;
  if (typeof rawPath !== "string" || !rawPath) fail("PATH_INVALID", `${label}.path is required.`);
  const target = isAbsolute(rawPath) ? abs(rawPath, `${label}.path`) : resolve(sourceRoot, rawPath);
  if (!within(sourceRoot, target)) fail("PATH_SCOPE", `${label}.path must stay inside source.root.`);
  const stat = requireFileOrDirectory(target, `${label}.path`);
  if (!allowDirectory && !stat.isFile()) fail("PATH_INVALID", `${label}.path must be a file.`);
  const digest = digestPath(target, `${label}.path`);
  const values = entry.values && typeof entry.values === "object" ? canonicalValue(entry.values) : null;
  return {
    path: relativeOrMarker(sourceRoot, target, "<source-root>").replaceAll("\\", "/"),
    role: typeof entry.role === "string" ? safeText(entry.role, `${label}.role`, 256) : null,
    values,
    digest: digest.sha256,
    bytes: digest.bytes,
    kind: digest.kind,
    files: digest.files,
  };
}

function normalizeImmutableRef(entry, label, sourceRoot) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) fail("INPUT_INVALID", `${label} must be an object.`);
  const id = safeText(entry.id, `${label}.id`, 512);
  const revision = safeText(entry.revision, `${label}.revision`, 512);
  let digest = entry.digest ? normalizeDigest(entry.digest, `${label}.digest`) : null;
  let pathInfo = null;
  if (entry.path) {
    const rawPath = entry.path;
    const target = isAbsolute(rawPath) ? abs(rawPath, `${label}.path`) : resolve(sourceRoot, rawPath);
    // Data and model stores commonly live outside the Git checkout.  They are
    // still explicit, symlink-free inputs; only config/protocol files are
    // required to live under source.root.
    if (isAbsolute(rawPath) && !within(sourceRoot, target)) {
      const local = digestPath(target, `${label}.path`);
      pathInfo = {
        // Host paths are execution metadata, not scientific identity.  Keep a
        // stable marker so copying the same immutable dataset/model to another
        // machine does not create a false semantic attempt.
        path: typeof entry.logicalPath === "string" ? safeText(entry.logicalPath, `${label}.logicalPath`, 1024) : "<external-input>",
        digest: local.sha256, bytes: local.bytes, kind: local.kind, files: local.files,
      };
    } else {
      pathInfo = normalizePathDescriptor({ path: rawPath, role: label }, sourceRoot, `${label}.path`);
    }
    if (digest && digest !== pathInfo.digest) fail("INPUT_DIGEST_MISMATCH", `${label}.digest does not match its local path.`);
    digest = pathInfo.digest;
  }
  if (!digest) fail("INPUT_DIGEST_REQUIRED", `${label} needs an immutable digest or a local path that can be hashed.`);
  const manifestDigest = entry.manifestDigest ? normalizeDigest(entry.manifestDigest, `${label}.manifestDigest`) : null;
  const schemaDigest = entry.schemaDigest ? normalizeDigest(entry.schemaDigest, `${label}.schemaDigest`) : null;
  const split = entry.split == null ? null : canonicalValue(entry.split);
  const selection = entry.selection == null ? null : canonicalValue(entry.selection);
  const preprocess = entry.preprocess == null ? [] : entry.preprocess;
  if (!Array.isArray(preprocess)) fail("PREPROCESS_INVALID", `${label}.preprocess must be an array.`);
  const preprocessSteps = preprocess.map((step, index) => {
    if (!step || typeof step !== "object" || Array.isArray(step)) fail("PREPROCESS_INVALID", `${label}.preprocess[${index}] must be an object.`);
    const normalized = canonicalValue(step, `${label}.preprocess[${index}]`);
    if (!normalized.id || !normalized.codeDigest || !normalized.configDigest || !normalized.outputDigest) {
      fail("PREPROCESS_INVALID", `${label}.preprocess[${index}] requires id, codeDigest, configDigest, and outputDigest.`);
    }
    for (const field of ["codeDigest", "configDigest", "outputDigest"]) normalizeDigest(normalized[field], `${label}.preprocess[${index}].${field}`);
    if (normalized.derivedFrom != null && !Array.isArray(normalized.derivedFrom)) fail("PREPROCESS_INVALID", `${label}.preprocess[${index}].derivedFrom must be an array.`);
    return normalized;
  });
  return { id, revision, digest, manifestDigest, schemaDigest, split, selection, preprocess: preprocessSteps, path: pathInfo?.path || null, bytes: pathInfo?.bytes ?? null };
}

function normalizeMatrix(raw, seeds, models, factors) {
  if (raw == null) return null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !raw.axes || typeof raw.axes !== "object" || Array.isArray(raw.axes)) {
    fail("MATRIX_INVALID", "spec.matrix must contain an axes object.");
  }
  const axes = {};
  for (const key of Object.keys(raw.axes).sort()) {
    const values = raw.axes[key];
    if (!Array.isArray(values) || values.length === 0) fail("MATRIX_INVALID", `spec.matrix.axes.${key} must be a non-empty array.`);
    axes[key] = values.map((value, index) => canonicalValue(value, `matrix.axes.${key}[${index}]`))
      .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
  }
  if (!Object.prototype.hasOwnProperty.call(axes, "seed")) axes.seed = seeds;
  if (Object.keys(axes).length === 0) fail("MATRIX_INVALID", "spec.matrix.axes must not be empty.");
  const names = Object.keys(axes).sort();
  const rows = [];
  const walk = (index, row) => {
    if (index === names.length) {
      const condition = canonicalValue({ ...factors, ...row });
      const digest = digestValue(condition);
      rows.push({ conditionId: `cond-${digest.slice(7, 27)}`, condition });
      return;
    }
    const name = names[index];
    for (const value of axes[name]) walk(index + 1, { ...row, [name]: value });
  };
  walk(0, {});
  const unique = new Set(rows.map((row) => row.conditionId));
  if (unique.size !== rows.length) fail("MATRIX_DUPLICATE", "spec.matrix axes produce duplicate condition IDs.");
  const matrix = { axes, rows, expectedCount: rows.length };
  return { ...matrix, matrixDigest: digestValue(matrix) };
}

function positiveInteger(value, label, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) fail("INTEGER_INVALID", `${label} must be an integer from 1 to ${maximum}.`);
  return value;
}

function normalizePartitioning(raw) {
  if (raw == null) return null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || raw.mode !== "sharded") {
    fail("PARTITION_INVALID", "compute.partitioning.mode must be sharded.");
  }
  const assignment = raw.assignment || "balanced-contiguous";
  if (!["balanced-contiguous", "round-robin"].includes(assignment)) fail("PARTITION_INVALID", "partitioning.assignment must be balanced-contiguous or round-robin.");
  return {
    mode: "sharded",
    itemManifestDigest: normalizeDigest(raw.itemManifestDigest, "compute.partitioning.itemManifestDigest"),
    expectedItems: positiveInteger(raw.expectedItems, "compute.partitioning.expectedItems", MAX_SHARD_ITEMS),
    shardCount: positiveInteger(raw.shardCount, "compute.partitioning.shardCount", 4096),
    assignment,
    resultItemIdField: safeId(raw.resultItemIdField || "itemId", "compute.partitioning.resultItemIdField"),
    topologyIsScientificFactor: raw.topologyIsScientificFactor === true,
  };
}

function normalizeSpec(raw, runtimeRoot) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("SPEC_INVALID", "Experiment spec must be an object.");
  assertNoSecrets(raw);
  if (raw.schemaVersion !== SCHEMA_VERSION) fail("SPEC_VERSION", `Experiment spec must use schemaVersion ${SCHEMA_VERSION}.`);
  const experiment = raw.experiment;
  if (!experiment || typeof experiment !== "object") fail("SPEC_INVALID", "spec.experiment is required.");
  const experimentId = safeId(experiment.id, "experiment.id");
  const projectId = safeId(experiment.projectId, "experiment.projectId");
  const question = safeText(experiment.question, "experiment.question", 20000);
  const hypothesis = safeText(experiment.hypothesis, "experiment.hypothesis", 20000);
  const feature = experiment.feature == null ? null : safeText(experiment.feature, "experiment.feature", 4096);
  const baseline = experiment.baseline == null ? null : safeText(experiment.baseline, "experiment.baseline", 4096);
  const candidate = experiment.candidate == null ? null : safeText(experiment.candidate, "experiment.candidate", 4096);
  const researchDesign = experiment.design && typeof experiment.design === "object"
    ? canonicalValue(experiment.design) : {};
  const sourceSpec = raw.source;
  if (!sourceSpec || typeof sourceSpec !== "object") fail("SPEC_INVALID", "spec.source is required.");
  const sourceRoot = abs(sourceSpec.root, "source.root");
  const changeClass = safeText(sourceSpec.changeClass, "source.changeClass", 64);
  if (!CHANGE_CLASSES.has(changeClass)) fail("CHANGE_CLASS_INVALID", `Unsupported source.changeClass: ${changeClass}`);
  const source = gitSnapshot(sourceRoot, sourceSpec);
  const entrypoint = raw.entrypoint;
  if (!entrypoint || typeof entrypoint !== "object") fail("SPEC_INVALID", "spec.entrypoint is required.");
  const entryPath = typeof entrypoint.path === "string" ? entrypoint.path : "";
  if (!entryPath || isAbsolute(entryPath) || entryPath.includes("..")) fail("ENTRYPOINT_INVALID", "entrypoint.path must be a relative path without traversal.");
  const entryTarget = resolve(sourceRoot, entryPath);
  if (!within(sourceRoot, entryTarget)) fail("ENTRYPOINT_INVALID", "entrypoint.path escaped source.root.");
  requireFileOrDirectory(entryTarget, "entrypoint.path");
  if (!Array.isArray(entrypoint.argv)) fail("ENTRYPOINT_INVALID", "entrypoint.argv must be an array.");
  if (entrypoint.argv.length === 0) fail("ENTRYPOINT_INVALID", "entrypoint.argv must not be empty.");
  const argv = entrypoint.argv.map((arg, index) => {
    if (typeof arg !== "string" || arg.length > 32768 || /\0/u.test(arg)) fail("ARGV_INVALID", `entrypoint.argv[${index}] is invalid.`);
    return arg;
  });
  const entrypointSymbol = entrypoint.symbol == null
    ? (entrypoint.function == null ? null : safeText(entrypoint.function, "entrypoint.function", 4096))
    : safeText(entrypoint.symbol, "entrypoint.symbol", 4096);
  const workingDirectory = entrypoint.workingDirectory == null ? "." : entrypoint.workingDirectory;
  if (typeof workingDirectory !== "string" || isAbsolute(workingDirectory) || workingDirectory.includes("..")) {
    fail("ENTRYPOINT_INVALID", "entrypoint.workingDirectory must be a relative path without traversal.");
  }
  const workingTarget = resolve(sourceRoot, workingDirectory);
  if (!within(sourceRoot, workingTarget, true)) fail("ENTRYPOINT_INVALID", "entrypoint.workingDirectory escaped source.root.");
  requireDirectory(workingTarget, "entrypoint.workingDirectory");
  const configs = (Array.isArray(raw.configs) ? raw.configs : []).map((item, i) => normalizePathDescriptor(item, sourceRoot, `configs[${i}]`));
  const data = (Array.isArray(raw.data) ? raw.data : []).map((item, i) => normalizeImmutableRef(item, `data[${i}]`, sourceRoot));
  const models = (Array.isArray(raw.models) ? raw.models : []).map((item, i) => normalizeImmutableRef(item, `models[${i}]`, sourceRoot));
  const protocolRaw = raw.protocol;
  if (!protocolRaw || typeof protocolRaw !== "object") fail("SPEC_INVALID", "spec.protocol is required.");
  const protocol = {
    id: safeText(protocolRaw.id, "protocol.id", 512),
    version: safeText(protocolRaw.version, "protocol.version", 256),
    path: null,
    digest: protocolRaw.digest ? normalizeDigest(protocolRaw.digest, "protocol.digest") : null,
  };
  if (protocolRaw.path) {
    const pathInfo = normalizePathDescriptor({ path: protocolRaw.path }, sourceRoot, "protocol.path", false);
    if (protocol.digest && protocol.digest !== pathInfo.digest) fail("INPUT_DIGEST_MISMATCH", "protocol.digest does not match protocol.path.");
    protocol.path = pathInfo.path; protocol.digest = pathInfo.digest;
  }
  if (!protocol.digest) fail("INPUT_DIGEST_REQUIRED", "protocol.digest or protocol.path is required.");
  const randomness = raw.randomness;
  if (!randomness || !Array.isArray(randomness.seeds) || randomness.seeds.length === 0) fail("RANDOMNESS_REQUIRED", "randomness.seeds must contain at least one seed.");
  const seeds = randomness.seeds.map((seed, index) => {
    if ((typeof seed !== "string" && typeof seed !== "number") || (typeof seed === "number" && !Number.isSafeInteger(seed))) fail("SEED_INVALID", `randomness.seeds[${index}] is invalid.`);
    return seed;
  });
  const environmentRaw = raw.environment;
  if (!environmentRaw || typeof environmentRaw !== "object") fail("ENVIRONMENT_REQUIRED", "spec.environment is required.");
  const environmentFiles = (Array.isArray(environmentRaw.files) ? environmentRaw.files : []).map((item, i) => normalizePathDescriptor(item, sourceRoot, `environment.files[${i}]`, false));
  const containerImage = environmentRaw.containerImage == null ? null : safeText(environmentRaw.containerImage, "environment.containerImage", 2048);
  if (containerImage && !/@sha256:[0-9a-f]{64}$/iu.test(containerImage)) fail("ENVIRONMENT_NOT_IMMUTABLE", "containerImage must include an immutable @sha256 digest.");
  const environment = {
    files: environmentFiles,
    containerImage,
    toolchain: environmentRaw.toolchain && typeof environmentRaw.toolchain === "object" ? canonicalValue(environmentRaw.toolchain) : {},
    semantic: environmentRaw.semantic !== false,
    notApplicable: environmentRaw.notApplicable ? safeText(environmentRaw.notApplicable, "environment.notApplicable", 2000) : null,
  };
  const semanticEnvironment = environment.semantic
    ? environment
    : { semantic: false, notApplicable: environment.notApplicable || "environment declared non-semantic" };
  const factors = raw.factors && typeof raw.factors === "object" ? canonicalValue(raw.factors) : {};
  const matrix = normalizeMatrix(raw.matrix, seeds, models, factors);
  const computeRaw = raw.compute;
  if (!computeRaw || typeof computeRaw !== "object") fail("COMPUTE_REQUIRED", "spec.compute is required, including the executor and resource budget.");
  const executorRaw = computeRaw.executor;
  if (!executorRaw || typeof executorRaw !== "object") fail("EXECUTOR_REQUIRED", "compute.executor is required.");
  const executor = {
    kind: safeText(executorRaw.kind, "compute.executor.kind", 128),
    target: safeText(executorRaw.target, "compute.executor.target", 2048),
    queue: executorRaw.queue == null ? null : safeText(executorRaw.queue, "compute.executor.queue", 512),
  };
  const resourceBudget = computeRaw.resourceBudget && typeof computeRaw.resourceBudget === "object"
    ? canonicalValue(computeRaw.resourceBudget) : {};
  const resourceForecast = computeRaw.resourceForecast && typeof computeRaw.resourceForecast === "object"
    ? canonicalValue(computeRaw.resourceForecast) : null;
  const partitioning = normalizePartitioning(computeRaw.partitioning);
  const gpuAllowlist = Array.isArray(computeRaw.gpuAllowlist) ? computeRaw.gpuAllowlist.map((v, i) => safeText(v, `compute.gpuAllowlist[${i}]`, 512)) : [];
  const modelAllowlist = Array.isArray(computeRaw.modelAllowlist) ? computeRaw.modelAllowlist.map((v, i) => safeText(v, `compute.modelAllowlist[${i}]`, 512)) : [];
  const compute = {
    hardwareIsScientificFactor: computeRaw.hardwareIsScientificFactor === true,
    executor, resourceBudget, gpuAllowlist, modelAllowlist,
    expected: computeRaw.expected && typeof computeRaw.expected === "object" ? canonicalValue(computeRaw.expected) : {},
    resourceForecast, partitioning,
  };
  const analysisRaw = raw.analysis;
  if (!analysisRaw || typeof analysisRaw !== "object" || Array.isArray(analysisRaw)) {
    fail("ANALYSIS_REQUIRED", "spec.analysis must identify the analysis code/method or an explicit notApplicable reason.");
  }
  const analysis = canonicalValue(analysisRaw);
  if (!analysis.id && !analysis.code && !analysis.method && !analysis.notApplicable) {
    fail("ANALYSIS_REQUIRED", "spec.analysis needs id, code, method, or notApplicable.");
  }
  const oracleRaw = raw.oracle;
  if (!oracleRaw || typeof oracleRaw !== "object") fail("ORACLE_REQUIRED", "spec.oracle is required.");
  const requiredOutputs = Array.isArray(oracleRaw.requiredOutputs) ? oracleRaw.requiredOutputs : [];
  if (requiredOutputs.length === 0) fail("OUTPUTS_REQUIRED", "oracle.requiredOutputs must list at least one output.");
  const outputSeen = new Set();
  const outputs = requiredOutputs.map((item, index) => {
    if (!item || typeof item !== "object") fail("OUTPUT_INVALID", `oracle.requiredOutputs[${index}] is invalid.`);
    const outputPath = item.path;
    if (typeof outputPath !== "string" || !outputPath || isAbsolute(outputPath) || outputPath.includes("..") || outputPath.includes("\0")) fail("OUTPUT_INVALID", `oracle.requiredOutputs[${index}].path must be relative and safe.`);
    const normalized = outputPath.replaceAll("\\", "/").split("/").filter(Boolean).join("/");
    if (!normalized || outputSeen.has(normalized)) fail("OUTPUT_DUPLICATE", `Duplicate required output: ${normalized}`);
    outputSeen.add(normalized);
    return { path: normalized, role: safeText(item.role || "artifact", `oracle.requiredOutputs[${index}].role`, 256) };
  });
  const oracle = {
    id: safeText(oracleRaw.id, "oracle.id", 512),
    version: safeText(oracleRaw.version || "1", "oracle.version", 128),
    validator: oracleRaw.validator == null ? null : safeText(oracleRaw.validator, "oracle.validator", 4096),
    requiredOutputs: outputs,
    checks: Array.isArray(oracleRaw.checks) ? oracleRaw.checks.map((v, i) => safeText(v, `oracle.checks[${i}]`, 512)) : [],
  };
  const semantic = {
    question, hypothesis, changeClass,
    source: {
      commit: source.commit, treeOid: source.treeOid, treeDigest: source.treeDigest, status: source.status,
      dirtyPatchDigest: source.dirtyPatch?.digest || null,
      scope: source.scope.map(({ path: itemPath, sha256, bytes, kind }) => ({ path: itemPath, digest: sha256, bytes, kind })),
    },
    entrypoint: {
      path: entryPath.replaceAll("\\", "/"), argv, argvDigest: digestValue(argv),
      symbol: entrypointSymbol, workingDirectory: relative(sourceRoot, workingTarget).replaceAll("\\", "/") || ".",
    },
    configs: configs.map(({ path: itemPath, role, values, digest, bytes, kind }) => ({ path: itemPath, role: role || null, values: values || null, digest, bytes, kind })),
    data, models, protocol, environment: semanticEnvironment,
    randomness: { seeds, determinism: randomness.determinism == null ? null : safeText(randomness.determinism, "randomness.determinism", 4096) },
    factors,
    matrix,
    partitioning: partitioning ? {
      mode: partitioning.mode, itemManifestDigest: partitioning.itemManifestDigest,
      expectedItems: partitioning.expectedItems, resultItemIdField: partitioning.resultItemIdField,
      topology: partitioning.topologyIsScientificFactor ? {
        shardCount: partitioning.shardCount, assignment: partitioning.assignment,
      } : null,
    } : null,
    oracle,
    analysis,
    researchIntent: { question, hypothesis, feature, baseline, candidate, design: researchDesign },
    scientificCompute: compute.hardwareIsScientificFactor ? { hardwareIsScientificFactor: true, gpuAllowlist, modelAllowlist } : { hardwareIsScientificFactor: false },
  };
  const execution = {
    executor, resourceBudget, gpuAllowlist, modelAllowlist,
    expected: compute.expected, resourceForecast: compute.resourceForecast, partitioning: compute.partitioning,
    environment,
    host: { platform: platform(), arch: arch(), kernel: release(), hostname: hostname(), node: process.version },
    sourceRoot, runtimeRoot,
  };
  const experimentRecord = {
    schemaVersion: SCHEMA_VERSION, kind: "pac-experiment", experimentId, projectId,
    question, hypothesis, feature, baseline, candidate,
    design: researchDesign,
    owner: experiment.owner == null ? null : safeText(experiment.owner, "experiment.owner", 512),
    protocol: { id: protocol.id, version: protocol.version, digest: protocol.digest },
  };
  return { experimentId, projectId, experimentRecord, source, sourceRoot, semantic, execution, oracle, raw };
}

function loadRecord(target, label, digestFields = ["recordDigest"]) {
  const record = readJson(target, label);
  verifyRecord(record, label, digestFields);
  return record;
}

function pathFromRun(runPath) {
  const target = abs(runPath, "run");
  requireFile(target, "run");
  return target;
}

function runIds(run) {
  return {
    experimentId: safeId(run.experimentId, "run.experimentId"),
    semanticAttemptId: safeId(run.semanticAttemptId, "run.semanticAttemptId"),
    executionId: safeId(run.executionId, "run.executionId"),
  };
}

function runManifestDigest(run) {
  return verifyRecord(run, "RUN.json", ["runManifestDigest", "recordDigest"]);
}

function semanticFingerprintFromRun(run) {
  if (!run.semantic || typeof run.semantic !== "object") fail("SEMANTIC_INVALID", "RUN.json has no semantic projection.");
  const projection = jsonClone(run.semantic);
  delete projection.fingerprint;
  delete projection.changeSet;
  return digestValue(projection);
}

function findSibling(runPath, name) {
  return join(dirname(runPath), name);
}

function executionRootForRun(runPath, run) {
  const base = resolve(dirname(runPath));
  const declared = run.runtime?.executionRoot;
  if (declared !== "." && declared !== "") {
    const rel = safeRelative(declared, "runtime.executionRoot");
    const candidate = resolve(base, rel);
    if (candidate !== base) fail("RUNTIME_LAYOUT", "runtime.executionRoot must be '.' for the supported layout.");
  }
  if (run.runtime?.layoutVersion != null && run.runtime.layoutVersion !== 1) {
    fail("RUNTIME_LAYOUT", "Unsupported runtime layout version.");
  }
  return base;
}

function runtimePathForRun(runPath, run, field, label) {
  const root = executionRootForRun(runPath, run);
  const raw = run.runtime?.[field];
  const rel = safeRelative(raw, label);
  const target = resolve(root, rel);
  if (!within(root, target, true)) fail("RUNTIME_SCOPE", `${label} escaped execution root.`);
  return target;
}

function relativeExecutionPath(root, target, label) {
  const rel = relative(root, resolve(target)).replaceAll("\\", "/");
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) fail("RUNTIME_SCOPE", `${label} is outside execution root.`);
  return rel;
}

function addUniqueEntry(entries, entry, seen) {
  const pathKey = safeRelative(entry.path, "output index path");
  if (seen.has(pathKey)) fail("OUTPUT_DUPLICATE", `Output index path is declared more than once: ${pathKey}`);
  seen.add(pathKey);
  entries.push({ ...entry, path: pathKey });
}

function dimensionDigest(semantic, dimension) {
  return digestValue(semantic?.[dimension] ?? null);
}

function buildChangeSet(semantic, parentSemantic = null) {
  const result = {};
  for (const dimension of DIMENSIONS) {
    const afterDigest = dimensionDigest(semantic, dimension);
    const beforeDigest = parentSemantic ? dimensionDigest(parentSemantic, dimension) : null;
    const changed = beforeDigest === null ? true : beforeDigest !== afterDigest;
    const classification = !parentSemantic ? "initial" : changed ?
      (dimension === "source" ? semantic.changeClass : (DIMENSION_CLASSES[dimension] || "unknown")) : "unchanged";
    result[dimension] = { changed, beforeDigest, afterDigest, classification };
  }
  return result;
}

function initCommand(options) {
  if (!options.spec || !options.runtimeRoot) fail("USAGE", "init requires --spec and --runtime-root.");
  const specPath = abs(options.spec, "spec");
  const runtimeRoot = safeRuntimeRoot(options.runtimeRoot);
  const raw = readJson(specPath, "experiment spec", MAX_SPEC_BYTES);
  const normalized = normalizeSpec(raw, runtimeRoot);
  const experimentRoot = join(runtimeRoot, normalized.projectId, "experiments", normalized.experimentId);
  const attemptsRoot = join(experimentRoot, "attempts");
  noSymlinkAncestors(experimentRoot, "experiment root", true);
  mkdirSync(attemptsRoot, { recursive: true, mode: 0o700 });
  const experimentPath = join(experimentRoot, "EXPERIMENT.json");
  let experiment;
  if (existsSync(experimentPath)) {
    experiment = loadRecord(experimentPath, "EXPERIMENT.json");
    const expectedStable = normalized.experimentRecord;
    for (const field of ["experimentId", "projectId", "question", "hypothesis", "feature", "baseline", "candidate", "design", "protocol"]) {
      if (canonicalJson(experiment[field]) !== canonicalJson(expectedStable[field])) fail("EXPERIMENT_CONFLICT", `Existing EXPERIMENT.json differs in ${field}.`);
    }
  } else experiment = writeImmutableRecord(experimentPath, { ...normalized.experimentRecord, createdAt: new Date().toISOString() });
  let parentRun = null;
  if (options.retryOf) {
    const parentPath = pathFromRun(options.retryOf);
    parentRun = loadRecord(parentPath, "parent RUN.json", ["runManifestDigest", "recordDigest"]);
    runIds(parentRun);
    if (parentRun.experimentId !== normalized.experimentId || parentRun.projectId !== normalized.projectId) fail("RETRY_SCOPE", "--retry-of must belong to the same project and experiment.");
    if (normalizeDigest(parentRun.semantic.fingerprint, "parent semantic fingerprint") !== digestValue(normalized.semantic)) fail("RETRY_SEMANTIC_CHANGED", "--retry-of has a different semantic fingerprint; create a new attempt instead.");
  }
  let comparisonRun = null;
  if (options.compareTo) {
    const comparisonPath = pathFromRun(options.compareTo);
    comparisonRun = loadRecord(comparisonPath, "comparison RUN.json", ["runManifestDigest", "recordDigest"]);
    runIds(comparisonRun);
    if (comparisonRun.experimentId !== normalized.experimentId || comparisonRun.projectId !== normalized.projectId) {
      fail("COMPARE_SCOPE", "--compare-to must belong to the same project and experiment.");
    }
  }
  const semanticFingerprint = digestValue(normalized.semantic);
  const semanticAttemptId = parentRun?.semanticAttemptId || `sa-${semanticFingerprint.slice("sha256:".length, 28)}`;
  const attemptRoot = join(attemptsRoot, semanticAttemptId);
  const executionRoot = join(attemptRoot, "executions");
  mkdirSync(executionRoot, { recursive: true, mode: 0o700 });
  const attemptPath = join(attemptRoot, "ATTEMPT.json");
  // `--retry-of` proves equality but must not rewrite the attempt's changeSet;
  // use only an explicitly selected prior semantic attempt for that comparison.
  const parentSemantic = comparisonRun?.semantic || null;
  const attemptRecord = {
    schemaVersion: SCHEMA_VERSION, kind: "pac-experiment-attempt", projectId: normalized.projectId,
    experimentId: normalized.experimentId, semanticAttemptId, semanticFingerprint,
    // A retry is another execution of this same attempt, not a self-parenting
    // semantic attempt.  Only a changed semantic attempt gets a parent link.
    parentSemanticAttemptId: comparisonRun?.semanticAttemptId || null,
    semantic: normalized.semantic,
    changeSet: buildChangeSet(normalized.semantic, parentSemantic),
    createdAt: new Date().toISOString(),
  };
  let attempt;
  if (existsSync(attemptPath)) {
    attempt = loadRecord(attemptPath, "ATTEMPT.json");
    if (normalizeDigest(attempt.semanticFingerprint, "ATTEMPT semantic fingerprint") !== semanticFingerprint) fail("ATTEMPT_CONFLICT", "Existing attempt directory has a different semantic fingerprint.");
    if ((!options.retryOf || options.compareTo)
        && ((attempt.parentSemanticAttemptId || null) !== (attemptRecord.parentSemanticAttemptId || null)
        || canonicalJson(attempt.changeSet) !== canonicalJson(attemptRecord.changeSet))) {
      fail("ATTEMPT_CONFLICT", "Existing attempt metadata has a different comparison parent or change set.");
    }
  } else attempt = writeImmutableRecord(attemptPath, attemptRecord);
  if (normalized.semantic.matrix) {
    const matrixPath = join(attemptRoot, "MATRIX.json");
    const matrixRecord = {
      schemaVersion: SCHEMA_VERSION, kind: "pac-experiment-matrix", projectId: normalized.projectId,
      experimentId: normalized.experimentId, semanticAttemptId, semanticFingerprint,
      axes: normalized.semantic.matrix.axes, rows: normalized.semantic.matrix.rows,
      expectedCount: normalized.semantic.matrix.expectedCount, matrixDigest: normalized.semantic.matrix.matrixDigest,
    };
    if (existsSync(matrixPath)) {
      const existing = loadRecord(matrixPath, "MATRIX.json");
      if (existing.matrixDigest !== matrixRecord.matrixDigest || existing.semanticFingerprint !== semanticFingerprint) {
        fail("MATRIX_CONFLICT", "Existing MATRIX.json differs from the semantic experiment matrix.");
      }
    } else writeImmutableRecord(matrixPath, matrixRecord);
  }
  const executionId = `ex-${randomUUID()}`;
  const runId = `${normalized.experimentId}--${semanticAttemptId}--${executionId.slice(3, 15)}`;
  const runRoot = join(executionRoot, executionId);
  noSymlinkAncestors(runRoot, "execution root", true);
  mkdirSync(join(runRoot, "outputs"), { recursive: true, mode: 0o700 });
  mkdirSync(join(runRoot, "checkpoints"), { recursive: true, mode: 0o700 });
  mkdirSync(join(runRoot, "receipts"), { recursive: true, mode: 0o700 });
  mkdirSync(join(runRoot, "logs"), { recursive: true, mode: 0o700 });
  const run = {
    schemaVersion: SCHEMA_VERSION, kind: "pac-experiment-run", projectId: normalized.projectId,
    experimentId: normalized.experimentId, semanticAttemptId, executionId, runId,
    attemptRecordDigest: attempt.recordDigest,
    semantic: { fingerprint: semanticFingerprint, changeSet: attempt.changeSet, ...normalized.semantic },
    source: { ...normalized.source, root: normalized.sourceRoot },
    entrypoint: normalized.semantic.entrypoint,
    inputs: { configs: normalized.semantic.configs, data: normalized.semantic.data, models: normalized.semantic.models, protocol: normalized.semantic.protocol, environment: normalized.execution.environment },
    randomness: normalized.semantic.randomness,
    factors: normalized.semantic.factors,
    executorRequest: normalized.execution,
    // Runtime paths are relative to the directory containing RUN.json.  This
    // makes a run tree verifiable after it is copied to another host; the
    // source root remains an explicit provenance location and may need a host
    // mapping during source verification.
    runtime: { layoutVersion: 1, executionRoot: ".", outputRoot: "outputs", checkpointRoot: "checkpoints", receiptRoot: "receipts", logRoot: "logs" },
    oracle: normalized.oracle,
    matrix: normalized.semantic.matrix ? { digest: normalized.semantic.matrix.matrixDigest, path: "../../MATRIX.json" } : null,
    parentExecutionId: parentRun?.executionId || null,
    specPath,
    createdAt: new Date().toISOString(),
  };
  const runRecord = writeImmutableRecord(join(runRoot, "RUN.json"), run, ["runManifestDigest", "recordDigest"]);
  process.stdout.write(JSON.stringify({ ok: true, action: "init", experiment: experimentPath, attempt: attemptPath, run: join(runRoot, "RUN.json"), experimentId: normalized.experimentId, semanticAttemptId, executionId, runId, runManifestDigest: runRecord.runManifestDigest }, null, 2) + "\n");
}

function parseReceipt(value, executionRoot) {
  if (typeof value !== "string") fail("RECEIPT_INVALID", "--receipt requires role=absolute-path.");
  const split = value.indexOf("=");
  if (split <= 0) fail("RECEIPT_INVALID", "--receipt requires role=absolute-path.");
  const role = safeId(value.slice(0, split), "receipt role");
  const pathValue = abs(value.slice(split + 1), `receipt.${role}`);
  const digest = digestPath(pathValue, `receipt.${role}`);
  if (digest.kind !== "file") fail("RECEIPT_INVALID", "Receipt must be a regular file.");
  if (isSynchronizedStorage(pathValue)) fail("RECEIPT_STORAGE", "Receipts must stay outside synchronized storage.");
  if (!within(executionRoot, pathValue)) fail("RECEIPT_SCOPE", "Receipt must be inside the execution directory.");
  return { role, path: relativeExecutionPath(executionRoot, pathValue), digest: digest.sha256, bytes: digest.bytes };
}

function bindCommand(options) {
  if (!options.run || !options.jobRef || !options.executorKind || !options.executorTarget) fail("USAGE", "bind requires --run, --job-ref, --executor-kind, and --executor-target.");
  const runPath = pathFromRun(options.run);
  const run = loadRecord(runPath, "RUN.json", ["runManifestDigest", "recordDigest"]);
  const manifestDigest = runManifestDigest(run);
  if (normalizeDigest(run.semantic?.fingerprint, "RUN semantic fingerprint") !== semanticFingerprintFromRun(run)) {
    fail("SEMANTIC_TAMPERED", "RUN semantic fingerprint does not match its semantic projection.");
  }
  const { executionId } = runIds(run);
  const executionRoot = executionRootForRun(runPath, run);
  const bindingPath = findSibling(runPath, "EXECUTION.json");
  if (existsSync(bindingPath)) fail("IMMUTABLE_EXISTS", `Execution binding already exists: ${bindingPath}`);
  const receipts = (options.receipts || []).map((receipt) => parseReceipt(receipt, executionRoot));
  const receiptRoles = new Set();
  const receiptPaths = new Set();
  for (const receipt of receipts) {
    if (receiptRoles.has(receipt.role)) fail("RECEIPT_DUPLICATE", `Receipt role is declared more than once: ${receipt.role}`);
    if (receiptPaths.has(receipt.path)) fail("RECEIPT_DUPLICATE", `Receipt path is declared more than once: ${receipt.path}`);
    receiptRoles.add(receipt.role);
    receiptPaths.add(receipt.path);
  }
  const binding = {
    schemaVersion: SCHEMA_VERSION, kind: "pac-experiment-execution", projectId: run.projectId,
    experimentId: run.experimentId, semanticAttemptId: run.semanticAttemptId, executionId,
    runManifestDigest: manifestDigest,
    executor: { kind: safeText(options.executorKind, "executor-kind", 128), target: safeText(options.executorTarget, "executor-target", 2048), jobRef: safeText(options.jobRef, "job-ref", 4096) },
    startedAt: new Date().toISOString(),
    receipts,
  };
  const record = writeImmutableRecord(bindingPath, binding);
  process.stdout.write(JSON.stringify({ ok: true, action: "bind", path: bindingPath, executionId, runManifestDigest: manifestDigest, recordDigest: record.recordDigest }, null, 2) + "\n");
}

function safeRelative(value, label) {
  if (typeof value !== "string" || !value || isAbsolute(value) || value.includes("\0")) fail("PATH_INVALID", `${label} must be relative.`);
  const normalized = value.replaceAll("\\", "/").split("/").filter(Boolean).join("/");
  if (!normalized || normalized.split("/").some((part) => part === "." || part === "..")) fail("PATH_INVALID", `${label} contains traversal.`);
  return normalized;
}

function outputEntry(runPath, run, output) {
  const rel = safeRelative(output.path, "output path");
  const root = executionRootForRun(runPath, run);
  const target = join(root, rel);
  if (!within(root, resolve(target))) fail("OUTPUT_SCOPE", `Output escaped execution root: ${rel}`);
  const digest = digestPath(target, `output ${rel}`);
  return { path: rel, role: output.role, kind: digest.kind, bytes: digest.bytes, files: digest.files, sha256: digest.sha256 };
}

function verifyBoundReceipt(receipt, run, runPath) {
  const root = executionRootForRun(runPath, run);
  const rel = safeRelative(receipt.path, `receipt ${receipt.role}.path`);
  const target = resolve(root, rel);
  if (!within(root, target)) fail("RECEIPT_SCOPE", `${receipt.role} receipt escaped execution root.`);
  const current = hashFile(target, `receipt ${receipt.role}`);
  if (current.sha256 !== normalizeDigest(receipt.digest, `receipt ${receipt.role}.digest`) || current.bytes !== receipt.bytes) {
    fail("RECEIPT_STALE", `${receipt.role} receipt changed after binding.`);
  }
  let value;
  try { value = readJson(target, `receipt ${receipt.role}`); }
  catch (error) { fail("RECEIPT_INVALID", `${receipt.role} receipt must be bounded JSON: ${error.message}`); }
  if (value.runManifestDigest == null || value.executionId == null) {
    fail("RECEIPT_UNBOUND", `${receipt.role} receipt must declare runManifestDigest and executionId.`);
  }
  const identity = {
    runManifestDigest: normalizeDigest(value.runManifestDigest, `receipt ${receipt.role}.runManifestDigest`),
    executionId: safeId(value.executionId, `receipt ${receipt.role}.executionId`),
  };
  if (identity.runManifestDigest !== run.runManifestDigest) fail("RECEIPT_MISMATCH", `${receipt.role} receipt names a different run manifest.`);
  if (identity.executionId !== run.executionId) fail("RECEIPT_MISMATCH", `${receipt.role} receipt names a different execution.`);
  return { ...receipt, path: rel, identity: "bound" };
}

function requiredReceiptRoles(run) {
  const roles = ["resource", "environment"];
  const allowlist = run.executorRequest?.gpuAllowlist;
  if (Array.isArray(allowlist) && allowlist.length > 0) roles.push("hardware");
  return roles;
}

function readItemIds(pathValue, label) {
  const value = readJson(pathValue, label);
  const items = Array.isArray(value) ? value : value?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_SHARD_ITEMS) {
    fail("SHARD_ITEMS_INVALID", `${label} must contain 1 to ${MAX_SHARD_ITEMS} item IDs.`);
  }
  const result = items.map((item, index) => safeText(item, `${label}[${index}]`, 2048));
  if (new Set(result).size !== result.length) fail("SHARD_ITEMS_DUPLICATE", `${label} contains duplicate item IDs.`);
  return result;
}

function readResultIds(pathValue, field, expected, label) {
  if (!pathValue.toLowerCase().endsWith('.jsonl')) return null;
  const lines = readFileSync(pathValue, 'utf8').split(/\r?\n/u).filter((line) => line.trim().length > 0);
  if (lines.length !== expected) fail('SHARD_OUTPUT_MISMATCH', `${label} must contain exactly ${expected} JSONL rows.`);
  const ids = lines.map((line, index) => {
    let value;
    try { value = JSON.parse(line); } catch { fail('SHARD_OUTPUT_INVALID', `${label} row ${index + 1} is not valid JSON.`); }
    return safeText(value?.[field], `${label} row ${index + 1}.${field}`, 2048);
  });
  if (new Set(ids).size !== ids.length) fail('SHARD_OUTPUT_DUPLICATE', `${label} contains duplicate ${field} values.`);
  return ids;
}

function shardAssignments(items, count, method) {
  const shards = Array.from({ length: count }, () => []);
  if (method === "round-robin") items.forEach((item, index) => shards[index % count].push(item));
  else {
    let cursor = 0;
    for (let index = 0; index < count; index += 1) {
      const size = Math.floor(items.length / count) + (index < items.length % count ? 1 : 0);
      shards[index] = items.slice(cursor, cursor + size); cursor += size;
    }
  }
  return shards;
}

function planShardsCommand(options) {
  if (!options.run || !options.items || !options.out) fail("USAGE", "plan-shards requires --run, --items, and --out.");
  const runPath = pathFromRun(options.run);
  const run = loadRecord(runPath, "RUN.json", ["runManifestDigest", "recordDigest"]);
  const partitioning = run.executorRequest?.partitioning;
  if (!partitioning || partitioning.mode !== "sharded") fail("PARTITION_REQUIRED", "RUN.json does not declare sharded partitioning.");
  const executionRoot = executionRootForRun(runPath, run);
  const out = abs(options.out, "shard plan");
  if (!within(executionRoot, out)) fail("SHARD_PLAN_SCOPE", "Shard plan must be inside the execution root.");
  const itemsPath = abs(options.items, "item manifest");
  const itemsDigest = hashFile(itemsPath, "item manifest");
  if (itemsDigest.sha256 !== partitioning.itemManifestDigest) fail("SHARD_ITEMS_MISMATCH", "Item manifest digest does not match RUN.json.");
  const items = readItemIds(itemsPath, "item manifest");
  if (items.length !== partitioning.expectedItems) fail("SHARD_ITEMS_MISMATCH", "Item manifest count does not match RUN.json.");
  if (partitioning.shardCount > items.length) fail("SHARD_COUNT_INVALID", "Shard count cannot exceed item count.");
  const assignments = shardAssignments(items, partitioning.shardCount, partitioning.assignment);
  const shards = assignments.map((itemIds, index) => {
    const shardId = `shard-${String(index).padStart(5, "0")}`;
    return { shardId, itemIds, itemDigest: digestValue(itemIds), expectedItems: itemIds.length, outputPrefix: `shards/${shardId}/attempts/` };
  });
  const record = writeImmutableRecord(out, {
    schemaVersion: SCHEMA_VERSION, kind: "pac-experiment-shard-plan", projectId: run.projectId,
    experimentId: run.experimentId, semanticAttemptId: run.semanticAttemptId, executionId: run.executionId,
    runManifestDigest: run.runManifestDigest, itemManifestDigest: itemsDigest.sha256,
    assignment: partitioning.assignment, resultItemIdField: partitioning.resultItemIdField,
    expectedItems: items.length, shards, createdAt: new Date().toISOString(),
  });
  process.stdout.write(JSON.stringify({ ok: true, action: "plan-shards", path: out, shardPlanDigest: record.recordDigest, shardCount: shards.length, expectedItems: items.length }, null, 2) + "\n");
}

function recordShardCommand(options) {
  if (!options.run || !options.plan || !options.out || !options.shardId || !options.workerAttemptId || !options.endpoint || !options.itemManifest || !options.output || options.rows == null) {
    fail("USAGE", "record-shard requires --run, --plan, --out, --shard-id, --worker-attempt-id, --endpoint, --item-manifest, --output, and --rows.");
  }
  const runPath = pathFromRun(options.run); const run = loadRecord(runPath, "RUN.json", ["runManifestDigest", "recordDigest"]);
  const executionRoot = executionRootForRun(runPath, run); const planPath = abs(options.plan, "shard plan");
  const plan = loadRecord(planPath, "shard plan");
  if (!within(executionRoot, planPath) || plan.runManifestDigest !== run.runManifestDigest || plan.executionId !== run.executionId) fail("SHARD_PLAN_MISMATCH", "Shard plan is outside or names a different execution.");
  const shard = (plan.shards || []).find((item) => item.shardId === options.shardId);
  if (!shard) fail("SHARD_UNKNOWN", `Unknown shard: ${options.shardId}`);
  const workerAttemptId = safeId(options.workerAttemptId, "workerAttemptId"); const itemPath = abs(options.itemManifest, "shard item manifest");
  const itemIds = readItemIds(itemPath, `items for ${shard.shardId}`); const itemDigest = hashFile(itemPath, "shard item manifest");
  if (!within(executionRoot, itemPath)) fail("SHARD_RECEIPT_SCOPE", "Shard item manifest must be inside the execution root.");
  if (canonicalJson(itemIds) !== canonicalJson(shard.itemIds)) fail("SHARD_ASSIGNMENT_MISMATCH", `Shard ${shard.shardId} did not use its assigned inputs.`);
  const outputPath = abs(options.output, "shard output"); const outputRel = relativeExecutionPath(executionRoot, outputPath);
  const prefix = `${shard.outputPrefix}${workerAttemptId}/`;
  if (!outputRel.startsWith(prefix)) fail("SHARD_OUTPUT_CONFLICT", `Shard output must be under ${prefix}.`);
  const outputDigest = digestPath(outputPath, "shard output"); const rows = Number(options.rows);
  if (!Number.isSafeInteger(rows) || rows !== shard.expectedItems) fail("SHARD_OUTPUT_MISMATCH", `Shard ${shard.shardId} must report exactly ${shard.expectedItems} rows.`);
  const resultIds = readResultIds(outputPath, plan.resultItemIdField, shard.expectedItems, `output for ${shard.shardId}`);
  if (resultIds && canonicalJson(resultIds.slice().sort()) !== canonicalJson(shard.itemIds.slice().sort())) fail("SHARD_OUTPUT_ASSIGNMENT_MISMATCH", `Shard ${shard.shardId} output IDs do not equal its assigned inputs.`);
  const devices = options.devices ? options.devices.split(",").filter(Boolean).map((value, index) => safeText(value.trim(), `device[${index}]`, 512)) : [];
  const out = abs(options.out, "shard receipt"); if (!within(executionRoot, out)) fail("SHARD_RECEIPT_SCOPE", "Shard receipt must be inside the execution root.");
  const record = writeImmutableRecord(out, {
    schemaVersion: SCHEMA_VERSION, kind: "pac-experiment-shard-receipt", projectId: run.projectId,
    experimentId: run.experimentId, semanticAttemptId: run.semanticAttemptId, executionId: run.executionId,
    runManifestDigest: run.runManifestDigest, shardPlanDigest: plan.recordDigest, shardId: shard.shardId,
    workerAttemptId, endpoint: safeText(options.endpoint, "endpoint", 2048), devices,
    itemManifest: { path: relativeExecutionPath(executionRoot, itemPath), sha256: itemDigest.sha256 }, itemCount: rows,
    output: { path: outputRel, sha256: outputDigest.sha256, bytes: outputDigest.bytes, rows },
    resultItemIds: resultIds ? { field: plan.resultItemIdField, digest: digestValue(resultIds.slice().sort()), count: resultIds.length } : null,
    terminalState: options.terminalState || "completed", completedAt: new Date().toISOString(),
  });
  process.stdout.write(JSON.stringify({ ok: true, action: "record-shard", path: out, shardId: shard.shardId, recordDigest: record.recordDigest }, null, 2) + "\n");
}

function verifyShardsCommand(options) {
  if (!options.run || !options.plan || !options.out || !options.shardReceipts?.length) fail("USAGE", "verify-shards requires --run, --plan, --out, and one --shard-receipt per shard.");
  const runPath = pathFromRun(options.run);
  const run = loadRecord(runPath, "RUN.json", ["runManifestDigest", "recordDigest"]);
  const executionRoot = executionRootForRun(runPath, run);
  const planPath = abs(options.plan, "shard plan");
  const plan = loadRecord(planPath, "shard plan");
  if (!within(executionRoot, planPath) || plan.runManifestDigest !== run.runManifestDigest || plan.executionId !== run.executionId) fail("SHARD_PLAN_MISMATCH", "Shard plan is outside or names a different execution.");
  const expected = new Map((plan.shards || []).map((shard) => [shard.shardId, shard]));
  if (expected.size === 0 || options.shardReceipts.length !== expected.size) fail("SHARD_INCOMPLETE", "Exactly one receipt is required for every shard.");
  const seenShards = new Set(); const seenOutputs = new Set(); const receipts = [];
  for (const rawPath of options.shardReceipts) {
    const receiptPath = abs(rawPath, "shard receipt");
    if (!within(executionRoot, receiptPath)) fail("SHARD_RECEIPT_SCOPE", "Shard receipt must be inside the execution root.");
    const receipt = loadRecord(receiptPath, "shard receipt");
    if (receipt.runManifestDigest !== run.runManifestDigest || receipt.executionId !== run.executionId || receipt.shardPlanDigest !== plan.recordDigest) fail("SHARD_RECEIPT_MISMATCH", "Shard receipt names a different run or plan.");
    const shard = expected.get(receipt.shardId);
    if (!shard || seenShards.has(receipt.shardId)) fail("SHARD_DUPLICATE", "Shard receipt is unknown or duplicated.");
    if (!['succeeded', 'success', 'completed'].includes(String(receipt.terminalState || "").toLowerCase())) fail("SHARD_NOT_SUCCESSFUL", `Shard ${receipt.shardId} is not terminal-successful.`);
    const workerAttemptId = safeId(receipt.workerAttemptId, "workerAttemptId");
    safeText(receipt.endpoint, "shard endpoint", 2048);
    if (!Array.isArray(receipt.devices)) fail("SHARD_RECEIPT_INVALID", "Shard receipt devices must be an array, including an empty array for CPU work.");
    receipt.devices.forEach((device, index) => safeText(device, `shard devices[${index}]`, 512));
    const itemPath = resolve(executionRoot, safeRelative(receipt.itemManifest.path, "shard item manifest path"));
    if (!within(executionRoot, itemPath)) fail("SHARD_RECEIPT_SCOPE", "Shard item manifest escaped the execution root.");
    const itemIds = readItemIds(itemPath, `items for ${receipt.shardId}`);
    const itemFile = hashFile(itemPath, `items for ${receipt.shardId}`);
    if (canonicalJson(itemIds) !== canonicalJson(shard.itemIds) || itemFile.sha256 !== normalizeDigest(receipt.itemManifest.sha256, "shard item manifest digest") || receipt.itemCount !== shard.expectedItems) {
      fail("SHARD_ASSIGNMENT_MISMATCH", `Shard ${receipt.shardId} did not use its exact assigned inputs.`);
    }
    const outputRel = safeRelative(receipt.output.path, "shard output path");
    const requiredPrefix = `${shard.outputPrefix}${workerAttemptId}/`;
    if (!outputRel.startsWith(requiredPrefix) || seenOutputs.has(outputRel)) fail("SHARD_OUTPUT_CONFLICT", `Shard ${receipt.shardId} does not own an exclusive worker-attempt output path.`);
    const outputPath = resolve(executionRoot, outputRel);
    if (!within(executionRoot, outputPath)) fail("SHARD_RECEIPT_SCOPE", "Shard output escaped the execution root.");
    const output = digestPath(outputPath, `output for ${receipt.shardId}`);
    if (output.sha256 !== normalizeDigest(receipt.output.sha256, "shard output digest") || receipt.output.rows !== shard.expectedItems) fail("SHARD_OUTPUT_MISMATCH", `Shard ${receipt.shardId} output digest or row count is invalid.`);
    const resultIds = readResultIds(outputPath, plan.resultItemIdField, shard.expectedItems, `output for ${receipt.shardId}`);
    if (resultIds && canonicalJson(resultIds.slice().sort()) !== canonicalJson(shard.itemIds.slice().sort())) fail("SHARD_OUTPUT_ASSIGNMENT_MISMATCH", `Shard ${shard.shardId} output IDs do not equal its assigned inputs.`);
    seenShards.add(receipt.shardId); seenOutputs.add(outputRel);
    receipts.push({ shardId: receipt.shardId, workerAttemptId, endpoint: receipt.endpoint, devices: receipt.devices, itemDigest: shard.itemDigest, itemCount: shard.expectedItems, output: { path: outputRel, sha256: output.sha256, bytes: output.bytes, rows: receipt.output.rows }, receipt: { path: relativeExecutionPath(executionRoot, receiptPath), digest: receipt.recordDigest } });
  }
  const out = abs(options.out, "shard closure");
  if (!within(executionRoot, out)) fail("SHARD_CLOSURE_SCOPE", "Shard closure must be inside the execution root.");
  receipts.sort((left, right) => left.shardId.localeCompare(right.shardId));
  const record = writeImmutableRecord(out, {
    schemaVersion: SCHEMA_VERSION, kind: "pac-experiment-shard-closure", projectId: run.projectId,
    experimentId: run.experimentId, semanticAttemptId: run.semanticAttemptId, executionId: run.executionId,
    runManifestDigest: run.runManifestDigest, shardPlanDigest: plan.recordDigest,
    shardPlan: { path: relativeExecutionPath(executionRoot, planPath), digest: plan.recordDigest },
    expectedItems: plan.expectedItems, completedItems: receipts.reduce((sum, item) => sum + item.itemCount, 0),
    shards: receipts, status: "complete", completedAt: new Date().toISOString(),
  });
  process.stdout.write(JSON.stringify({ ok: true, action: "verify-shards", path: out, shardClosureDigest: record.recordDigest, shardCount: receipts.length, completedItems: record.completedItems }, null, 2) + "\n");
}

function shardClosure(run, reportPath, executionRoot) {
  const partitioning = run.executorRequest?.partitioning;
  if (!partitioning) return null;
  if (!reportPath) fail("SHARD_REPORT_REQUIRED", "Sharded executions require --shard-report before sealing.");
  const pathValue = abs(reportPath, "shard-report");
  if (!within(executionRoot, pathValue)) fail("SHARD_CLOSURE_SCOPE", "Shard report must be inside the execution root.");
  const report = loadRecord(pathValue, "shard report");
  if (report.runManifestDigest !== run.runManifestDigest || report.executionId !== run.executionId || report.status !== "complete" || report.completedItems !== partitioning.expectedItems) fail("SHARD_INCOMPLETE", "Shard report is incomplete or names a different execution.");
  if (!report.shardPlan?.path) fail("SHARD_PLAN_REQUIRED", "Regenerate the shard closure with an explicit plan path before sealing.");
  const dependencies = [];
  const dependency = (relativePath, role, expectedDigest, record = false) => {
    const rel = safeRelative(relativePath, role);
    const target = resolve(executionRoot, rel);
    const value = record ? loadRecord(target, role) : null;
    const actual = digestPath(target, role);
    if ((record ? value.recordDigest : actual.sha256) !== normalizeDigest(expectedDigest, role)) {
      fail("SHARD_EVIDENCE_STALE", `Shard evidence changed: ${rel}`);
    }
    dependencies.push({ path: rel, role, ...actual });
    return value;
  };
  const plan = dependency(report.shardPlan.path, "shard-plan", report.shardPlan.digest, true);
  if (plan.recordDigest !== report.shardPlanDigest || plan.runManifestDigest !== run.runManifestDigest
      || plan.executionId !== run.executionId || plan.expectedItems !== partitioning.expectedItems
      || !Array.isArray(report.shards) || report.shards.length !== plan.shards.length) {
    fail("SHARD_INCOMPLETE", "Shard closure does not match its plan.");
  }
  const seen = new Set();
  for (const shard of report.shards) {
    const assigned = plan.shards.find((entry) => entry.shardId === shard.shardId);
    if (!assigned || seen.has(shard.shardId)) fail("SHARD_INCOMPLETE", "Shard closure has unknown or duplicate shards.");
    seen.add(shard.shardId);
    const receipt = dependency(shard.receipt.path, "shard-receipt", shard.receipt.digest, true);
    if (receipt.runManifestDigest !== run.runManifestDigest || receipt.executionId !== run.executionId
        || receipt.shardPlanDigest !== plan.recordDigest || receipt.shardId !== shard.shardId
        || !["succeeded", "success", "completed"].includes(String(receipt.terminalState || "").toLowerCase())
        || receipt.output.path !== shard.output.path || receipt.output.sha256 !== shard.output.sha256
        || receipt.itemCount !== assigned.expectedItems) fail("SHARD_INCOMPLETE", "Shard receipt does not match the closure and plan.");
    dependency(receipt.itemManifest.path, "shard-inputs", receipt.itemManifest.sha256);
    const itemIds = readItemIds(resolve(executionRoot, safeRelative(receipt.itemManifest.path, "shard inputs")), "shard inputs");
    if (canonicalJson(itemIds) !== canonicalJson(assigned.itemIds)) fail("SHARD_ASSIGNMENT_MISMATCH", "Closed shard inputs differ from the plan.");
    const outputPath = resolve(executionRoot, safeRelative(shard.output.path, "closed shard output"));
    const current = digestPath(outputPath, `closed output ${shard.shardId}`);
    if (current.sha256 !== normalizeDigest(shard.output.sha256, "closed shard output digest")) fail("SHARD_OUTPUT_STALE", `Shard output changed after closure: ${shard.shardId}`);
    dependency(shard.output.path, "shard-output", shard.output.sha256);
  }
  return { path: pathValue, digest: digestPath(pathValue, "shard report"), dependencies };
}

function matrixClosure(run, reportPath, executionRoot) {
  if (!run.matrix) return null;
  if (!reportPath) fail("MATRIX_REPORT_REQUIRED", "Matrix experiments require --matrix-report proving every condition reached a terminal state.");
  const pathValue = abs(reportPath, "matrix-report");
  if (!within(executionRoot, pathValue)) fail("MATRIX_REPORT_SCOPE", "Matrix report must be inside the execution root.");
  const report = readJson(pathValue, "matrix report");
  if (report.runManifestDigest !== run.runManifestDigest || report.executionId !== run.executionId) {
    fail("MATRIX_REPORT_MISMATCH", "Matrix report names a different run.");
  }
  if (normalizeDigest(report.matrixDigest, "matrix report.matrixDigest") !== normalizeDigest(run.matrix.digest, "RUN matrix.digest")) {
    fail("MATRIX_REPORT_MISMATCH", "Matrix report names a different matrix.");
  }
  const matrixPath = join(dirname(dirname(executionRoot)), "MATRIX.json");
  const matrix = loadRecord(matrixPath, "MATRIX.json");
  const expected = new Map((matrix.rows || []).map((row) => [row.conditionId, row]));
  if (!Array.isArray(report.rows) || report.rows.length !== expected.size) fail("MATRIX_INCOMPLETE", "Matrix report must contain exactly one row for every condition.");
  const seen = new Set();
  for (const row of report.rows) {
    if (!row || typeof row !== "object" || typeof row.conditionId !== "string" || seen.has(row.conditionId) || !expected.has(row.conditionId)) {
      fail("MATRIX_INCOMPLETE", "Matrix report contains an unknown or duplicate conditionId.");
    }
    const status = String(row.status || "");
    if (!["completed", "failed", "blocked", "excluded-with-reason"].includes(status)) fail("MATRIX_STATUS_INVALID", `Invalid terminal status for ${row.conditionId}.`);
    if (status === "excluded-with-reason" && !(typeof row.reason === "string" && row.reason.trim())) fail("MATRIX_STATUS_INVALID", `Excluded condition ${row.conditionId} requires a reason.`);
    if (status !== "completed") fail("MATRIX_INCOMPLETE", "VerifiedResult requires every frozen matrix condition to be completed. Failed, blocked, and post-hoc excluded rows remain incomplete.");
    seen.add(row.conditionId);
  }
  return { path: pathValue, digest: digestPath(pathValue, "matrix report") };
}

function sealCommand(options) {
  if (!options.run || !options.oracleReport) fail("USAGE", "seal requires --run and --oracle-report.");
  const runPath = pathFromRun(options.run);
  const run = loadRecord(runPath, "RUN.json", ["runManifestDigest", "recordDigest"]);
  const manifestDigest = runManifestDigest(run);
  if (normalizeDigest(run.semantic?.fingerprint, "RUN semantic fingerprint") !== semanticFingerprintFromRun(run)) {
    fail("SEMANTIC_TAMPERED", "RUN semantic fingerprint does not match its semantic projection.");
  }
  const executionPath = findSibling(runPath, "EXECUTION.json");
  if (!existsSync(executionPath)) fail("EXECUTION_UNBOUND", "Cannot seal before EXECUTION.json binds a stable job reference.");
  const execution = loadRecord(executionPath, "EXECUTION.json");
  if (execution.runManifestDigest !== manifestDigest || execution.executionId !== run.executionId) fail("EXECUTION_MISMATCH", "EXECUTION.json does not name this run.");
  const oraclePath = abs(options.oracleReport, "oracle-report");
  const oracle = readJson(oraclePath, "oracle report");
  if (oracle.status !== "pass") fail("ORACLE_FAILED", "Oracle report must have status=pass.");
  if (normalizeDigest(oracle.runManifestDigest, "oracle.runManifestDigest") !== manifestDigest || oracle.executionId !== run.executionId) fail("ORACLE_MISMATCH", "Oracle report names a different run.");
  if (!['succeeded', 'success', 'completed'].includes(String(oracle.terminalState || "").toLowerCase())) fail("TERMINAL_STATE", "Oracle report must certify a successful terminal executor state.");
  const executionRoot = executionRootForRun(runPath, run);
  if (!within(executionRoot, oraclePath)) fail("ORACLE_SCOPE", "Oracle report must be inside the execution root.");
  const matrixReport = matrixClosure(run, options.matrixReport, executionRoot);
  const shardReport = shardClosure(run, options.shardReport, executionRoot);
  const receiptEntries = execution.receipts.map((receipt) => verifyBoundReceipt(receipt, run, runPath));
  const receiptRoles = new Set(receiptEntries.map((receipt) => receipt.role));
  for (const role of requiredReceiptRoles(run)) {
    if (!receiptRoles.has(role)) fail("RECEIPT_REQUIRED", `Cannot seal without the required ${role} receipt.`);
  }
  const entries = [];
  const seen = new Set();
  for (const output of run.oracle.requiredOutputs) addUniqueEntry(entries, outputEntry(runPath, run, output), seen);
  const oracleDigest = digestPath(oraclePath, "oracle report");
  addUniqueEntry(entries, { path: relativeExecutionPath(executionRoot, oraclePath, "oracle report"), role: "oracle", kind: oracleDigest.kind, bytes: oracleDigest.bytes, files: oracleDigest.files, sha256: oracleDigest.sha256 }, seen);
  if (matrixReport) addUniqueEntry(entries, { path: relativeExecutionPath(executionRoot, matrixReport.path, "matrix report"), role: "matrix-closure", kind: matrixReport.digest.kind, bytes: matrixReport.digest.bytes, files: matrixReport.digest.files, sha256: matrixReport.digest.sha256 }, seen);
  if (shardReport) addUniqueEntry(entries, { path: relativeExecutionPath(executionRoot, shardReport.path, "shard report"), role: "shard-closure", kind: shardReport.digest.kind, bytes: shardReport.digest.bytes, files: shardReport.digest.files, sha256: shardReport.digest.sha256 }, seen);
  for (const entry of shardReport?.dependencies || []) {
    const existing = entries.find((item) => item.path === entry.path);
    if (existing && existing.sha256 !== entry.sha256) fail("SHARD_EVIDENCE_STALE", "Shard dependency changed while sealing.");
    if (!existing) addUniqueEntry(entries, entry, seen);
  }
  for (const receipt of receiptEntries) {
    addUniqueEntry(entries, { path: receipt.path, role: `receipt:${receipt.role}`, kind: "file", bytes: receipt.bytes, files: 1, sha256: receipt.digest, identity: receipt.identity }, seen);
  }
  const indexPath = findSibling(runPath, "output-index.json");
  const indexValue = {
    schemaVersion: SCHEMA_VERSION, kind: "pac-experiment-output-index", projectId: run.projectId,
    experimentId: run.experimentId, semanticAttemptId: run.semanticAttemptId, executionId: run.executionId,
    runManifestDigest: manifestDigest, oracleReportDigest: oracleDigest.sha256, entries,
    generatedAt: new Date().toISOString(),
  };
  const index = existsSync(indexPath) ? loadRecord(indexPath, "output-index.json") : writeImmutableRecord(indexPath, indexValue);
  if (index.runManifestDigest !== manifestDigest) fail("INDEX_MISMATCH", "Existing output-index.json names a different run.");
  if (index.oracleReportDigest !== oracleDigest.sha256) fail("INDEX_MISMATCH", "Existing output-index.json names a different oracle report.");
  verifyIndex(runPath, run, index);
  const expectedEntriesDigest = digestValue(entries);
  if (digestValue(index.entries || []) !== expectedEntriesDigest) {
    fail("INDEX_MISMATCH", "Existing output-index.json entries do not match the current explicit output/receipt set.");
  }
  const completePath = findSibling(runPath, "COMPLETE.json");
  if (existsSync(completePath)) fail("IMMUTABLE_EXISTS", `Completion record already exists: ${completePath}`);
  const summary = oracle.summary && typeof oracle.summary === "object" ? canonicalValue(oracle.summary) : {};
  const complete = writeImmutableRecord(completePath, {
    schemaVersion: SCHEMA_VERSION, kind: "pac-experiment-complete", projectId: run.projectId,
    experimentId: run.experimentId, semanticAttemptId: run.semanticAttemptId, executionId: run.executionId,
    runManifestDigest: manifestDigest, outputIndexDigest: index.recordDigest, oracleReportDigest: oracleDigest.sha256,
    status: "verified", terminalState: oracle.terminalState, summary,
    resourceReceipts: receiptEntries,
    completedAt: new Date().toISOString(),
  });
  process.stdout.write(JSON.stringify({ ok: true, action: "seal", status: "VerifiedResult", run: runPath, outputIndex: indexPath, complete: completePath, runManifestDigest: manifestDigest, outputCount: entries.length, summary }, null, 2) + "\n");
}

function verifyIndex(runPath, run, index) {
  if (index.runManifestDigest !== run.runManifestDigest || index.executionId !== run.executionId) fail("INDEX_MISMATCH", "Output index identity mismatch.");
  if (!Array.isArray(index.entries) || index.entries.length === 0) fail("INDEX_INVALID", "Output index must contain explicit entries.");
  const root = executionRootForRun(runPath, run);
  const seen = new Set();
  for (const entry of index.entries || []) {
    const rel = safeRelative(entry.path, "indexed output");
    if (seen.has(rel)) fail("OUTPUT_DUPLICATE", `Output index contains duplicate path: ${rel}`);
    seen.add(rel);
    const target = join(root, rel);
    if (!within(root, resolve(target))) fail("INDEX_SCOPE", `Indexed output escaped execution root: ${rel}`);
    const actual = digestPath(target, `indexed output ${rel}`);
    if (actual.sha256 !== normalizeDigest(entry.sha256, `indexed output ${rel}.sha256`) || actual.bytes !== entry.bytes || actual.kind !== entry.kind) fail("OUTPUT_STALE", `Indexed output changed: ${rel}`);
  }
}

function verifyRunCommand(options) {
  if (!options.run) fail("USAGE", "verify-run requires --run.");
  const runPath = pathFromRun(options.run);
  const run = loadRecord(runPath, "RUN.json", ["runManifestDigest", "recordDigest"]);
  const manifestDigest = runManifestDigest(run);
  if (normalizeDigest(run.semantic?.fingerprint, "RUN semantic fingerprint") !== semanticFingerprintFromRun(run)) {
    fail("SEMANTIC_TAMPERED", "RUN semantic fingerprint does not match its semantic projection.");
  }
  const executionPath = findSibling(runPath, "EXECUTION.json");
  const indexPath = findSibling(runPath, "output-index.json");
  const completePath = findSibling(runPath, "COMPLETE.json");
  const attemptPath = join(dirname(dirname(dirname(runPath))), "ATTEMPT.json");
  const experimentPath = join(dirname(dirname(dirname(dirname(dirname(runPath))))), "EXPERIMENT.json");
  const attempt = loadRecord(attemptPath, "ATTEMPT.json");
  const experiment = loadRecord(experimentPath, "EXPERIMENT.json");
  if (attempt.experimentId !== run.experimentId || attempt.semanticAttemptId !== run.semanticAttemptId
      || attempt.recordDigest !== run.attemptRecordDigest
      || normalizeDigest(attempt.semanticFingerprint, "ATTEMPT semantic fingerprint") !== normalizeDigest(run.semantic.fingerprint, "RUN semantic fingerprint")) {
    fail("ATTEMPT_MISMATCH", "RUN.json is not bound to its immutable ATTEMPT.json.");
  }
  if (experiment.experimentId !== run.experimentId || experiment.projectId !== run.projectId) {
    fail("EXPERIMENT_MISMATCH", "RUN.json is not under its declared EXPERIMENT.json.");
  }
  const report = { ok: true, action: "verify-run", run: runPath, runManifestDigest: manifestDigest, state: "ActiveRun", checks: { run: "pass", experiment: "pass", attempt: "pass", execution: "missing", index: "missing", complete: "missing" } };
  if (existsSync(executionPath)) {
    const execution = loadRecord(executionPath, "EXECUTION.json");
    if (execution.runManifestDigest !== manifestDigest || execution.executionId !== run.executionId) fail("EXECUTION_MISMATCH", "Execution binding identity mismatch.");
    report.checks.execution = "pass"; report.jobRef = execution.executor.jobRef;
  }
  let index;
  if (existsSync(indexPath)) {
    index = loadRecord(indexPath, "output-index.json"); verifyIndex(runPath, run, index); report.checks.index = "pass";
  }
  if (existsSync(completePath)) {
    const complete = loadRecord(completePath, "COMPLETE.json");
    if (complete.runManifestDigest !== manifestDigest || !index || report.checks.execution !== "pass"
        || complete.outputIndexDigest !== index.recordDigest || complete.status !== "verified") {
      fail("COMPLETE_INVALID", "Completion record does not match the bound execution and verified output index.");
    }
    report.checks.complete = "pass"; report.state = "VerifiedResult"; report.summary = complete.summary;
  } else if (index) report.state = "terminal-awaiting-completion";
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

function sourceFromRun(run, sourceRootOverride = null) {
  const sourceRoot = abs(sourceRootOverride || run.source.root, "run.source.root");
  const sourceSpec = {
    scope: Array.isArray(run.source.scope) ? run.source.scope.map((item) =>
      typeof item === "string" ? item : item.path).filter(Boolean) : [],
    dirtyPatch: run.source.dirtyPatch?.path || null,
  };
  return gitSnapshot(sourceRoot, sourceSpec);
}

function verifySourceCommand(options) {
  if (!options.run) fail("USAGE", "verify-source requires --run.");
  const runPath = pathFromRun(options.run);
  const run = loadRecord(runPath, "RUN.json", ["runManifestDigest", "recordDigest"]);
  const current = sourceFromRun(run, options.sourceRoot || null);
  const expected = run.source;
  const checks = {
    commit: current.commit === expected.commit,
    treeOid: current.treeOid === expected.treeOid,
    treeDigest: current.treeDigest === expected.treeDigest,
    status: current.status === expected.status,
    statusDigest: current.statusDigest === expected.statusDigest,
    dirtyPatch: (current.dirtyPatch?.digest || null) === (expected.dirtyPatch?.digest || null),
    scope: canonicalJson(current.scope) === canonicalJson(expected.scope || []),
  };
  if (Object.values(checks).some((value) => !value)) fail("SOURCE_CHANGED", "Current source does not match RUN.json.", { checks, expected, current });
  process.stdout.write(JSON.stringify({ ok: true, action: "verify-source", checks, runManifestDigest: run.runManifestDigest }, null, 2) + "\n");
}

function semanticFromRecord(pathValue, label) {
  const record = loadRecord(pathValue, label, ["runManifestDigest", "recordDigest"]);
  if (!record.semantic) fail("RECORD_INVALID", `${label} has no semantic projection.`);
  return { record, semantic: record.semantic };
}

function compareCommand(options) {
  if (!options.left || !options.right) fail("USAGE", "compare requires --left and --right RUN.json paths.");
  const leftPath = pathFromRun(options.left); const rightPath = pathFromRun(options.right);
  const left = semanticFromRecord(leftPath, "left RUN.json"); const right = semanticFromRecord(rightPath, "right RUN.json");
  const dimensions = {};
  for (const dimension of DIMENSIONS) {
    const before = dimensionDigest(left.semantic, dimension); const after = dimensionDigest(right.semantic, dimension);
    dimensions[dimension] = { changed: before !== after, beforeDigest: before, afterDigest: after };
  }
  const changed = Object.entries(dimensions).filter(([, item]) => item.changed).map(([key]) => key);
  const sameSemantic = changed.length === 0;
  process.stdout.write(JSON.stringify({ ok: true, action: "compare", sameSemantic, changedDimensions: changed, recommendation: sameSemantic ? "new execution of the same semantic attempt" : "new semantic attempt", dimensions, left: { runId: left.record.runId, executionId: left.record.executionId }, right: { runId: right.record.runId, executionId: right.record.executionId } }, null, 2) + "\n");
}

function recordCheckpointCommand(options) {
  if (!options.run || !options.out || !options.artifact || !options.checkpointId || options.step == null) {
    fail("USAGE", "record-checkpoint requires --run, --out, --artifact, --checkpoint-id, and --step.");
  }
  const runPath = pathFromRun(options.run);
  const run = loadRecord(runPath, "RUN.json", ["runManifestDigest", "recordDigest"]);
  const executionRoot = executionRootForRun(runPath, run);
  const out = abs(options.out, "checkpoint receipt");
  const artifact = abs(options.artifact, "checkpoint artifact");
  if (!within(executionRoot, out) || !within(executionRoot, artifact)) fail("CHECKPOINT_SCOPE", "Checkpoint receipt and artifact must be inside the execution root.");
  const artifactDigest = digestPath(artifact, "checkpoint artifact");
  const step = Number(options.step);
  if (!Number.isSafeInteger(step) || step < 0) fail("CHECKPOINT_INVALID", "Checkpoint step must be a non-negative integer.");
  let parent = null;
  if (options.parent) {
    const parentPath = abs(options.parent, "parent checkpoint");
    if (!within(executionRoot, parentPath)) fail("CHECKPOINT_SCOPE", "Parent checkpoint must be inside the execution root.");
    parent = loadRecord(parentPath, "parent checkpoint");
    if (parent.runManifestDigest !== run.runManifestDigest || parent.executionId !== run.executionId) fail("CHECKPOINT_MISMATCH", "Parent checkpoint names a different execution.");
    parent = { path: relativeExecutionPath(executionRoot, parentPath), digest: parent.recordDigest };
  }
  const record = writeImmutableRecord(out, {
    schemaVersion: SCHEMA_VERSION, kind: "pac-experiment-checkpoint", projectId: run.projectId,
    experimentId: run.experimentId, semanticAttemptId: run.semanticAttemptId, executionId: run.executionId,
    runManifestDigest: run.runManifestDigest, checkpointId: safeId(options.checkpointId, "checkpoint-id"),
    parent, step, artifact: { path: relativeExecutionPath(executionRoot, artifact), sha256: artifactDigest.sha256, bytes: artifactDigest.bytes, kind: artifactDigest.kind },
    state: options.state == null ? null : safeText(options.state, "checkpoint state", 4096), createdAt: new Date().toISOString(),
  });
  process.stdout.write(JSON.stringify({ ok: true, action: "record-checkpoint", path: out, recordDigest: record.recordDigest }, null, 2) + "\n");
}

function recordAnalysisCommand(options) {
  if (!options.run || !options.out || !options.outputIndex || !options.analysisId || !options.method || !options.codeDigest || !options.configDigest) {
    fail("USAGE", "record-analysis requires --run, --out, --output-index, --analysis-id, --method, --code-digest, and --config-digest.");
  }
  const runPath = pathFromRun(options.run);
  const run = loadRecord(runPath, "RUN.json", ["runManifestDigest", "recordDigest"]);
  const executionRoot = executionRootForRun(runPath, run);
  const out = abs(options.out, "analysis record");
  const indexPath = abs(options.outputIndex, "output index");
  if (!within(executionRoot, out) || !within(executionRoot, indexPath)) fail("ANALYSIS_SCOPE", "Analysis record and input index must be inside the execution root.");
  const index = loadRecord(indexPath, "output-index.json");
  if (index.runManifestDigest !== run.runManifestDigest || index.executionId !== run.executionId) fail("ANALYSIS_MISMATCH", "Analysis input index names a different execution.");
  verifyIndex(runPath, run, index);
  const codeDigest = normalizeDigest(options.codeDigest, "analysis code digest");
  const configDigest = normalizeDigest(options.configDigest, "analysis config digest");
  const record = writeImmutableRecord(out, {
    schemaVersion: SCHEMA_VERSION, kind: "pac-experiment-analysis", projectId: run.projectId,
    experimentId: run.experimentId, semanticAttemptId: run.semanticAttemptId, executionId: run.executionId,
    runManifestDigest: run.runManifestDigest, analysisId: safeId(options.analysisId, "analysis-id"), method: safeText(options.method, "analysis method", 8192),
    inputIndex: { path: relativeExecutionPath(executionRoot, indexPath), sha256: index.recordDigest }, codeDigest, configDigest,
    dependencyEnvironment: run.inputs.environment, createdAt: new Date().toISOString(),
  });
  process.stdout.write(JSON.stringify({ ok: true, action: "record-analysis", path: out, recordDigest: record.recordDigest }, null, 2) + "\n");
}

function publicationCommand(options) {
  if (!options.run || !options.manifest || !options.out) fail("USAGE", "record-publication requires --run, --manifest, and --out.");
  const runPath = pathFromRun(options.run);
  const run = loadRecord(runPath, "RUN.json", ["runManifestDigest", "recordDigest"]);
  const completePath = findSibling(runPath, "COMPLETE.json");
  if (!existsSync(completePath)) fail("NOT_VERIFIED", "Only a sealed VerifiedResult can be published.");
  const complete = loadRecord(completePath, "COMPLETE.json");
  if (complete.status !== "verified" || complete.runManifestDigest !== run.runManifestDigest) fail("NOT_VERIFIED", "Completion record is not verified for this run.");
  const manifestPath = abs(options.manifest, "publication manifest");
  const manifest = readJson(manifestPath, "publication manifest");
  if (manifest.runId != null && manifest.runId !== run.runId && manifest.runId !== run.executionId) fail("PUBLICATION_MISMATCH", "Published manifest names a different run.");
  const manifestDigest = digestPath(manifestPath, "publication manifest").sha256;
  const out = abs(options.out, "publication receipt");
  if (isSynchronizedStorage(out)) fail("PUBLICATION_RECEIPT_STORAGE", "Publication receipt must remain in host-local runtime.");
  const receipt = writeImmutableRecord(out, {
    schemaVersion: SCHEMA_VERSION, kind: "pac-experiment-publication", projectId: run.projectId,
    experimentId: run.experimentId, semanticAttemptId: run.semanticAttemptId, executionId: run.executionId,
    runManifestDigest: run.runManifestDigest, outputIndexDigest: complete.outputIndexDigest,
    destinationManifest: manifestPath, destinationManifestDigest: manifestDigest,
    publishedAt: new Date().toISOString(),
  });
  process.stdout.write(JSON.stringify({ ok: true, action: "record-publication", path: out, recordDigest: receipt.recordDigest }, null, 2) + "\n");
}

function parseArgs(argv) {
  const positional = []; const options = { receipts: [] };
  const valueOptions = new Set(["spec", "runtime-root", "retry-of", "compare-to", "run", "source-root", "job-ref", "executor-kind", "executor-target", "receipt", "oracle-report", "matrix-report", "shard-report", "left", "right", "manifest", "out", "artifact", "checkpoint-id", "step", "state", "parent", "output-index", "analysis-id", "method", "code-digest", "config-digest", "items", "plan", "shard-receipt", "shard-id", "worker-attempt-id", "endpoint", "item-manifest", "output", "rows", "terminal-state", "devices"]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) { positional.push(token); continue; }
    const key = token.slice(2);
    if (!valueOptions.has(key)) fail("USAGE", `Unknown option: ${token}`);
    const value = argv[++index];
    if (value == null || value.startsWith("--")) fail("USAGE", `${token} requires a value.`);
    if (key === "runtime-root") options.runtimeRoot = value;
    else if (key === "receipt") options.receipts.push(value);
    else if (key === "shard-receipt") (options.shardReceipts ||= []).push(value);
    else options[key.replace(/-([a-z])/gu, (_, letter) => letter.toUpperCase())] = value;
  }
  return { action: positional[0], options };
}

function help() {
  return [
    "Usage:",
    "  experiment.mjs init --spec ABS --runtime-root ABS [--retry-of RUN.json] [--compare-to RUN.json]",
    "  experiment.mjs bind --run RUN.json --job-ref ID --executor-kind KIND --executor-target TARGET [--receipt role=ABS]...",
    "  experiment.mjs seal --run RUN.json --oracle-report ABS [--matrix-report ABS]",
    "  experiment.mjs verify-run --run RUN.json",
    "  experiment.mjs verify-source --run RUN.json [--source-root ABS]",
    "  experiment.mjs compare --left RUN.json --right RUN.json",
    "  experiment.mjs record-checkpoint --run RUN.json --out ABS --artifact ABS --checkpoint-id ID --step N [--parent ABS] [--state TEXT]",
    "  experiment.mjs record-analysis --run RUN.json --out ABS --output-index ABS --analysis-id ID --method TEXT --code-digest DIGEST --config-digest DIGEST",
    "  experiment.mjs plan-shards --run RUN.json --items ABS --out ABS",
    "  experiment.mjs record-shard --run RUN.json --plan ABS --out ABS --shard-id ID --worker-attempt-id ID --endpoint ID --item-manifest ABS --output ABS --rows N [--devices id,id]",
    "  experiment.mjs verify-shards --run RUN.json --plan ABS --shard-receipt ABS... --out ABS",
    "  experiment.mjs record-publication --run RUN.json --manifest MANIFEST.json --out ABS",
  ].join("\n");
}

function main(argv) {
  const parsed = parseArgs(argv); const action = parsed.action; const options = parsed.options;
  if (!action || action === "help") { process.stdout.write(`${help()}\n`); return 0; }
  if (action === "init") initCommand(options);
  else if (action === "bind") bindCommand(options);
  else if (action === "seal") sealCommand(options);
  else if (action === "verify-run") verifyRunCommand(options);
  else if (action === "verify-source") verifySourceCommand(options);
  else if (action === "compare") compareCommand(options);
  else if (action === "record-checkpoint") recordCheckpointCommand(options);
  else if (action === "record-analysis") recordAnalysisCommand(options);
  else if (action === "plan-shards") planShardsCommand(options);
  else if (action === "record-shard") recordShardCommand(options);
  else if (action === "verify-shards") verifyShardsCommand(options);
  else if (action === "record-publication") publicationCommand(options);
  else fail("USAGE", `Unknown action: ${action}`);
  return 0;
}

try { process.exitCode = main(process.argv.slice(2)); }
catch (error) {
  const failure = error instanceof ExperimentError ? error : new ExperimentError("UNEXPECTED", error.message || String(error));
  process.stderr.write(`${JSON.stringify({ ok: false, error: { code: failure.code, message: failure.message, details: failure.details } }, null, 2)}\n`);
  process.exitCode = 2;
}
