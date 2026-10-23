import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/reuse.mjs', import.meta.url));
const cli = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
const boundedCli = (env, ...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'reuse-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const run = join(root, 'run');
  mkdirSync(run);
  return { root, run, dst: join(run, 'inputs', 'artifact') };
}
function historicalDigest(path) {
  const hash = createHash('sha256');
  if (lstatSync(path).isFile()) hash.update(readFileSync(path));
  else for (const name of readdirSync(path).sort()) hash.update(name + '\0' + historicalDigest(join(path, name)) + '\0');
  return 'sha256:' + hash.digest('hex');
}

test('streamed hashes preserve historical file and sorted nested directory digests', (t) => {
  const { root, run } = fixture(t);
  const source = join(root, 'source');
  mkdirSync(join(source, 'nested'), { recursive: true });
  writeFileSync(join(source, 'z.bin'), Buffer.alloc(131079, 173));
  writeFileSync(join(source, 'nested', 'empty'), '');
  writeFileSync(join(source, 'a.txt'), 'alpha');
  for (const [i, path] of [source, join(source, 'z.bin')].entries()) {
    const result = cli('link-artifact', path, join(run, 'inputs', String(i)), run);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).digest, historicalDigest(path));
  }
});

test('aggregate entry, byte and depth bounds fail before link creation, with explicit overrides', (t) => {
  const { root, run, dst } = fixture(t);
  const source = join(root, 'source');
  mkdirSync(join(source, 'nested'), { recursive: true });
  writeFileSync(join(source, 'a'), '1234');
  writeFileSync(join(source, 'nested', 'b'), '5678');
  for (const [key, value] of [['REUSE_MAX_ENTRIES', '3'], ['REUSE_MAX_BYTES', '7'], ['REUSE_MAX_DEPTH', '1']]) {
    const result = boundedCli({ [key]: value }, 'link-artifact', source, dst, run);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, new RegExp(key));
    assert.equal(existsSync(join(run, 'inputs')), false);
  }
  const result = boundedCli({ REUSE_MAX_ENTRIES: '4', REUSE_MAX_BYTES: '8', REUSE_MAX_DEPTH: '2' }, 'link-artifact', source, dst, run);
  assert.equal(result.status, 0, result.stderr);
  const manifest = join(root, 'manifest.json');
  writeFileSync(manifest, result.stdout);
  const verified = boundedCli({ REUSE_MAX_BYTES: '7' }, 'verify-reuse', dst, manifest, run);
  assert.equal(verified.status, 2);
  assert.match(verified.stderr, /REUSE_MAX_BYTES/);
  const invalid = boundedCli({ REUSE_MAX_BYTES: 'NaN' }, 'verify-reuse', dst, manifest, run);
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /REUSE_MAX_BYTES/);
});

test('elapsed budget is checked using a monotonic clock', (t) => {
  const { root, run, dst } = fixture(t);
  const source = join(root, 'source');
  writeFileSync(source, 'data');
  const clock = join(root, 'clock.mjs');
  writeFileSync(clock, "import { performance } from 'node:perf_hooks'; let now=0; Object.defineProperty(performance, 'now', { value: () => now += 100 });");
  const result = boundedCli({ REUSE_MAX_MS: '1', NODE_OPTIONS: `--import=${clock}` }, 'link-artifact', source, dst, run);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /REUSE_MAX_MS/);
  assert.equal(existsSync(dst), false);
});

test('read-only is reported as a request and manifest assertions do not prove enforcement', (t) => {
  const { root, run, dst } = fixture(t);
  const source = join(root, 'source');
  writeFileSync(source, 'original');
  const mode = statSync(source).mode;
  const result = cli('link-artifact', source, dst, run);
  assert.equal(result.status, 0, result.stderr);
  const linked = JSON.parse(result.stdout);
  assert.equal(linked.accessRequested, 'read-only');
  assert.equal(linked.readOnlyEnforcement, 'not-enforced');
  const manifest = join(root, 'manifest.json');
  writeFileSync(manifest, JSON.stringify({ source, digest: linked.digest, access: 'read-only', readOnlyEnforcement: 'verified-acl' }));
  const verified = cli('verify-reuse', dst, manifest, run);
  assert.equal(verified.status, 0, verified.stderr);
  assert.equal(JSON.parse(verified.stdout).readOnlyEnforcement, 'not-enforced');
  assert.equal(statSync(source).mode, mode);
  assert.equal(readFileSync(source, 'utf8'), 'original');
});

test('source links, nested links, escapes and altered bytes remain rejected', (t) => {
  const { root, run, dst } = fixture(t);
  const source = join(root, 'source');
  writeFileSync(source, 'original');
  const linkedSource = join(root, 'linked-source');
  symlinkSync(source, linkedSource);
  assert.equal(cli('link-artifact', linkedSource, dst, run).status, 2);
  const directory = join(root, 'directory');
  mkdirSync(directory); symlinkSync(source, join(directory, 'nested-link'));
  assert.equal(cli('link-artifact', directory, dst, run).status, 2);
  assert.equal(cli('link-artifact', source, join(root, 'escaped'), run).status, 2);
  const linked = cli('link-artifact', source, dst, run);
  assert.equal(linked.status, 0, linked.stderr);
  const manifest = join(root, 'manifest.json');
  writeFileSync(manifest, linked.stdout);
  writeFileSync(source, 'altered');
  const verified = cli('verify-reuse', dst, manifest, run);
  assert.equal(verified.status, 2);
  assert.match(verified.stderr, /digest mismatch/);
});

test('reuse links verify normally and reject symlink parents before writing', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'reuse-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const run = join(root, 'run');
  const outside = join(root, 'outside');
  const source = join(root, 'source.txt');
  mkdirSync(run); mkdirSync(outside);
  writeFileSync(source, 'original');
  const dst = join(run, 'inputs', 'normal');
  const linked = cli('link-artifact', source, dst, run);
  assert.equal(linked.status, 0, linked.stderr);
  const manifest = join(root, 'manifest.json');
  writeFileSync(manifest, linked.stdout);
  assert.equal(cli('verify-reuse', dst, manifest, run).status, 0);
  assert.equal(readFileSync(source, 'utf8'), 'original');
  for (const parent of [join(run, 'inputs', 'nested'), join(run, 'inputs')]) {
    rmSync(parent, { recursive: true, force: true });
    symlinkSync(outside, parent, 'dir');
    const escaped = join(parent, 'escape');
    assert.equal(cli('link-artifact', source, escaped, run).status, 2);
    assert.equal(existsSync(join(outside, 'escape')), false);
    symlinkSync(source, join(outside, 'escape'));
    assert.equal(cli('verify-reuse', escaped, manifest, run).status, 2);
    rmSync(join(outside, 'escape'));
  }
});
