import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/reuse.mjs', import.meta.url));
const cli = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

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
