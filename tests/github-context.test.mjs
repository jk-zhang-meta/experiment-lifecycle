import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseOriginUrl } from '../scripts/github-context.mjs';

const script = fileURLToPath(new URL('../scripts/github-context.mjs', import.meta.url));
const run = (args, env, cwd) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env, cwd });
const git = (cwd, ...args) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};

function fixture(t, overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'github-context-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, 'repo'); mkdirSync(repo); git(repo, 'init'); git(repo, 'config', 'user.email', 'fixture@example.test'); git(repo, 'config', 'user.name', 'Fixture');
  writeFileSync(join(repo, 'readme.txt'), 'fixture\n'); git(repo, 'add', '.'); git(repo, 'commit', '-m', 'fixture');
  const sha = git(repo, 'rev-parse', 'HEAD');
  git(repo, 'remote', 'add', 'origin', overrides.origin || 'git@github.com:octo/widget.git');
  const bin = join(root, 'bin'); mkdirSync(bin);
  const gh = join(bin, 'gh');
  const repoResponse = overrides.repoResponse || { full_name: 'octo/widget', id: 42, html_url: 'https://github.com/octo/widget' };
  const commitResponse = overrides.commitResponse || { sha };
  const exit = overrides.ghExit ? `printf '%s\\n' '${overrides.ghStderr || ''}' >&2\nexit 1` : `case "$*" in *"/commits/"*) printf '%s\\n' '${JSON.stringify(commitResponse)}' ;; *) printf '%s\\n' '${JSON.stringify(repoResponse)}' ;; esac`;
  writeFileSync(gh, `#!/bin/sh\n${exit}\n`); chmodSync(gh, 0o755);
  return { root, repo, sha, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } };
}

test('parses allowed origins and rejects credential-bearing or ambiguous origins', () => {
  assert.deepEqual(parseOriginUrl('git@github.com:octo/widget.git'), { host: 'github.com', owner: 'octo', repo: 'widget', fullName: 'octo/widget' });
  assert.equal(parseOriginUrl('https://github.com/octo/widget.git').fullName, 'octo/widget');
  assert.equal(parseOriginUrl('https://github.com/octo/widget/').fullName, 'octo/widget');
  assert.equal(parseOriginUrl('https://github.com/octo/widget.git/').fullName, 'octo/widget');
  assert.throws(() => parseOriginUrl('https://token@github.com/octo/widget'));
  assert.throws(() => parseOriginUrl('https://github.com:443/octo/widget'));
  assert.throws(() => parseOriginUrl('https://github.com/octo//widget'));
  assert.throws(() => parseOriginUrl('https://github.com/octo/widget/extra'));
});

test('symlinked CLI runs while an imported module remains silent', (t) => {
  const f = fixture(t);
  const linkedDir = join(f.root, 'linked-skill');
  symlinkSync(dirname(script), linkedDir, 'dir');
  const linked = spawnSync(process.execPath, ['linked-skill/github-context.mjs', f.repo, 'octo/widget'], { encoding: 'utf8', env: f.env, cwd: f.root });
  assert.equal(linked.status, 0, linked.stderr);
  const imported = spawnSync(process.execPath, ['--input-type=module', '--eval', 'await import(process.env.GITHUB_CONTEXT_TARGET)'], { encoding: 'utf8', env: { ...f.env, GITHUB_CONTEXT_TARGET: script } });
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stdout, '');
});

test('CLI binds exact repository, reports dirty detached head and SHA equality from a relative script path', (t) => {
  const f = fixture(t); git(f.repo, 'checkout', '--detach');
  writeFileSync(join(f.repo, 'readme.txt'), 'changed\n');
  const result = spawnSync(process.execPath, ['scripts/github-context.mjs', f.repo, 'octo/widget'], { encoding: 'utf8', env: f.env, cwd: join(dirname(script), '..') });
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.repository.id, 42); assert.equal(value.local.commit, f.sha); assert.equal(value.remote.commit, f.sha); assert.equal(value.local.ref, null); assert.equal(value.local.dirty, true);
  assert.equal(result.stdout.includes(f.repo), false);
});

test('CLI rejects mismatched origin, subdirectory, API failures and response mismatches', (t) => {
  const wrong = fixture(t, { origin: 'git@github.com:other/widget.git' });
  assert.equal(run([wrong.repo, 'octo/widget'], wrong.env).status, 2);
  const f = fixture(t);
  const sub = join(f.repo, 'child'); mkdirSync(sub);
  assert.equal(run([sub, 'octo/widget'], f.env).status, 2);
  const badHost = fixture(t, { origin: 'git@git.example.test:octo/widget.git' });
  assert.equal(run([badHost.repo, 'octo/widget'], badHost.env).status, 2);
  const failedApi = fixture(t, { ghExit: true });
  assert.equal(run([failedApi.repo, 'octo/widget'], failedApi.env).status, 2);
  const httpFailure = fixture(t, { ghExit: true, ghStderr: 'request denied (HTTP 404) SECRET=do-not-print' });
  const httpResult = run([httpFailure.repo, 'octo/widget'], httpFailure.env);
  assert.equal(httpResult.status, 2);
  assert.match(httpResult.stderr, /\(HTTP 404\)/u);
  assert.equal(httpResult.stderr.includes('SECRET'), false);
  const mismatch = fixture(t, { repoResponse: { full_name: 'octo/other', id: 42, html_url: 'https://github.com/octo/other' } });
  assert.equal(run([mismatch.repo, 'octo/widget'], mismatch.env).status, 2);
  const wrongResponseHost = fixture(t, { repoResponse: { full_name: 'octo/widget', id: 42, html_url: 'https://evil.example.test/octo/widget' } });
  assert.equal(run([wrongResponseHost.repo, 'octo/widget'], wrongResponseHost.env).status, 2);
  const missingCommit = fixture(t, { commitResponse: { sha: '0'.repeat(40) } });
  assert.equal(run([missingCommit.repo, 'octo/widget'], missingCommit.env).status, 2);
});
