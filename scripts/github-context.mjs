#!/usr/bin/env node
/*
 * Read-only binding between a local Git checkout and one GitHub repository.
 * This tool records evidence; it does not authorize execution, archive code,
 * fetch, push, or otherwise change either repository.
 */
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_OUTPUT_BYTES = 1024 * 1024;
const COMMAND_TIMEOUT_MS = 15_000;
const REPO_PART = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u;
const SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/iu;

export class GithubContextError extends Error {
  constructor(message) { super(message); this.name = 'GithubContextError'; }
}

function fail(message) { throw new GithubContextError(message); }

export function parseRepository(value) {
  if (typeof value !== 'string' || !/^[^/]+\/[^/]+$/u.test(value)) fail('repository must be OWNER/REPO');
  const [owner, repo] = value.split('/');
  if (!REPO_PART.test(owner) || !REPO_PART.test(repo)) fail('repository must contain safe owner and repository names');
  return { owner, repo, fullName: `${owner}/${repo}` };
}

export function normalizeHost(value = 'github.com') {
  if (typeof value !== 'string' || !/^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/u.test(value) || value.includes('..')) {
    fail('host must be a plain DNS name');
  }
  return value.toLowerCase();
}

export function parseOriginUrl(value) {
  if (typeof value !== 'string' || !value || /[\r\n\0]/u.test(value)) fail('origin URL is invalid');
  let host, path;
  const scp = /^git@([A-Za-z0-9.-]+):([^/]+\/[^/]+)$/u.exec(value);
  if (scp) {
    [, host, path] = scp;
  } else {
    let parsed;
    try { parsed = new URL(value); } catch { fail('origin must be an HTTPS URL or git@host:owner/repo SSH URL'); }
    const authority = value.slice('https://'.length).split(/[/?#]/u, 1)[0];
    if (parsed.protocol !== 'https:' || authority.includes('@') || authority.includes(':') || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || !parsed.hostname) {
      fail('origin URL has unsupported or credential-bearing components');
    }
    host = parsed.hostname;
    path = parsed.pathname.replace(/^\//u, '');
    if (path.endsWith('/')) path = path.slice(0, -1);
  }
  if (path.endsWith('.git')) path = path.slice(0, -4);
  if (!/^[^/]+\/[^/]+$/u.test(path) || path.includes('%')) fail('origin repository path is ambiguous');
  const repo = parseRepository(path);
  return { host: normalizeHost(host), ...repo };
}

export function sameRepository(origin, expected) {
  return origin.host === expected.host && origin.fullName.toLowerCase() === expected.fullName.toLowerCase();
}

export function runFile(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8',
    shell: false,
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: MAX_OUTPUT_BYTES,
    windowsHide: true,
  });
  if (result.error || result.status !== 0 || result.signal) {
    const status = options.httpStatus ? /\(HTTP ([1-5][0-9]{2})\)/u.exec(String(result.stderr || '').slice(0, 8192))?.[1] : undefined;
    fail(`${options.label || command} failed${status ? ` (HTTP ${status})` : ''}`);
  }
  return String(result.stdout || '').trim();
}

function git(root, args) { return runFile('git', args, { cwd: root, label: 'git inspection' }); }
function gh(host, endpoint, env) {
  const raw = runFile('gh', ['api', '--hostname', host, '--method', 'GET', endpoint], { env, label: 'GitHub API inspection', httpStatus: true });
  try { return JSON.parse(raw); } catch { fail('GitHub API returned invalid JSON'); }
}

function requireSha(value, label) {
  if (typeof value !== 'string' || !SHA.test(value)) fail(`${label} is not a commit SHA`);
  return value.toLowerCase();
}

function canonicalRoot(sourceRoot) {
  if (typeof sourceRoot !== 'string' || !isAbsolute(sourceRoot)) fail('source root must be an absolute directory path');
  try { return realpathSync.native(sourceRoot); } catch { fail('source root cannot be resolved'); }
}

function apiRepository(host, expected, env) {
  const value = gh(host, `repos/${expected.fullName}`, env);
  if (!value || typeof value !== 'object' || typeof value.full_name !== 'string' || value.full_name.toLowerCase() !== expected.fullName.toLowerCase() || !Number.isSafeInteger(value.id) || value.id <= 0) {
    fail('GitHub repository response does not match the requested repository');
  }
  let url;
  try { url = new URL(value.html_url); } catch { fail('GitHub repository response has no valid HTML URL'); }
  const authority = typeof value.html_url === 'string' ? value.html_url.slice('https://'.length).split(/[/?#]/u, 1)[0] : '';
  if (url.protocol !== 'https:' || authority.includes('@') || authority.includes(':') || url.username || url.password || url.port || url.search || url.hash || url.hostname.toLowerCase() !== host || url.pathname.replace(/^\//u, '').replace(/\/$/u, '').toLowerCase() !== expected.fullName.toLowerCase()) {
    fail('GitHub repository response host or URL does not match');
  }
  return { host, fullName: expected.fullName, id: value.id, url: url.toString().replace(/\/$/u, '') };
}

export function inspectGithubContext(sourceRoot, repository, host = 'github.com', env = process.env) {
  const root = canonicalRoot(sourceRoot);
  const expectedRepo = parseRepository(repository);
  const expected = { ...expectedRepo, host: normalizeHost(host) };
  const topLevel = git(root, ['rev-parse', '--show-toplevel']);
  let canonicalTop;
  try { canonicalTop = realpathSync.native(topLevel); } catch { fail('git top-level cannot be resolved'); }
  if (canonicalTop !== root) fail('source root must be the exact local git top-level');
  // The selected mapping is origin only; this helper never selects, fetches,
  // or falls back to another remote.
  const origin = parseOriginUrl(git(root, ['remote', 'get-url', 'origin']));
  if (!sameRepository(origin, expected)) fail('origin does not match the expected GitHub repository');
  const commit = requireSha(git(root, ['rev-parse', 'HEAD']), 'local HEAD');
  const tree = git(root, ['rev-parse', 'HEAD^{tree}']);
  if (!/^[0-9a-f]{40,64}$/iu.test(tree)) fail('local HEAD tree is invalid');
  // Disable Git's optional index locks so this inspection cannot refresh/write
  // the working index while checking for diagnostic dirtiness.
  const status = git(root, ['--no-optional-locks', 'status', '--porcelain=v1', '--untracked-files=normal']);
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const ref = branch === 'HEAD' ? null : branch;
  const repo = apiRepository(expected.host, expected, env);
  const remote = gh(expected.host, `repos/${expected.fullName}/commits/${commit}`, env);
  if (!remote || requireSha(remote.sha, 'remote commit') !== commit) fail('GitHub commit response does not match local HEAD');
  return {
    observedAt: new Date().toISOString(),
    repository: repo,
    local: { commit, tree: tree.toLowerCase(), dirty: status.length > 0, ref },
    remote: { commitAvailable: true, commit },
  };
}

export function main(argv = process.argv.slice(2), env = process.env) {
  const [sourceRoot, repository, host = 'github.com'] = argv;
  if (!sourceRoot || !repository || argv.length > 3) fail('usage: github-context SOURCE_ROOT OWNER/REPO [HOST]');
  return inspectGithubContext(sourceRoot, repository, host, env);
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try { return realpathSync.native(fileURLToPath(import.meta.url)) === realpathSync.native(resolve(process.argv[1])); }
  catch { return false; }
}

if (isMainModule()) {
  try { console.log(JSON.stringify(main(), null, 2)); }
  catch (error) { console.error(`github-context: ${error instanceof Error ? error.message : 'inspection failed'}`); process.exitCode = 2; }
}
