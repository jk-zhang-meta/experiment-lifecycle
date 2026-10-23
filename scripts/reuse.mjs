#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { closeSync, lstatSync, mkdirSync, openSync, opendirSync, readFileSync, readSync, realpathSync, symlinkSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { performance } from 'node:perf_hooks';

const die = (m) => { console.error(`reuse: ${m}`); process.exitCode = 2; };
function digest(path) {
  const limits = { REUSE_MAX_ENTRIES: 10000, REUSE_MAX_BYTES: 10 * 1024 ** 3, REUSE_MAX_DEPTH: 64, REUSE_MAX_MS: 30000 };
  for (const key of Object.keys(limits)) {
    const value = Number(process.env[key] ?? limits[key]);
    if (!Number.isSafeInteger(value) || value < (key === 'REUSE_MAX_DEPTH' ? 0 : 1)) throw Error(`${key} must be a ${key === 'REUSE_MAX_DEPTH' ? 'nonnegative' : 'positive'} safe integer`);
    limits[key] = value;
  }
  const check = (key, value) => {
    if (value > limits[key]) throw Error(`artifact hash limit exceeded: ${key}=${limits[key]}; use a smaller artifact or explicitly raise ${key} for this invocation`);
  };
  const started = performance.now();
  const checkTime = () => check('REUSE_MAX_MS', performance.now() - started);
  const buffer = Buffer.allocUnsafe(64 * 1024);
  let entries = 1, bytes = 0;
  function visit(p, depth) {
    checkTime(); check('REUSE_MAX_DEPTH', depth);
    const stat = lstatSync(p);
    if (stat.isSymbolicLink()) throw Error('directory artifact contains symlink');
    const hash = createHash('sha256');
    if (stat.isFile()) {
      check('REUSE_MAX_BYTES', bytes + stat.size);
      const fd = openSync(p, 'r');
      try {
        for (;;) {
          checkTime();
          const count = readSync(fd, buffer, 0, Math.min(buffer.length, limits.REUSE_MAX_BYTES - bytes + 1), null);
          if (!count) break;
          bytes += count; check('REUSE_MAX_BYTES', bytes);
          hash.update(buffer.subarray(0, count));
        }
      } finally { closeSync(fd); }
    } else if (stat.isDirectory()) {
      // Bound enumeration before sorting while retaining the historical name order.
      const names = [], dir = opendirSync(p);
      try {
        for (let entry; (entry = dir.readSync());) {
          checkTime(); check('REUSE_MAX_ENTRIES', ++entries);
          names.push(entry.name);
        }
      } finally { dir.closeSync(); }
      for (const name of names.sort()) hash.update(name + '\0' + visit(resolve(p, name), depth + 1) + '\0');
    } else throw Error('artifact must be a regular file or directory');
    checkTime();
    return 'sha256:' + hash.digest('hex');
  }
  return visit(path, 0);
}
const outside = (root,p) => { const r=relative(root,p); return r==='..'||r.startsWith('..'+sep)||isAbsolute(r); };
const present = (p) => { try { lstatSync(p); return true; } catch { return false; } };
function checkParents(root, dst) {
  if (!lstatSync(root).isDirectory()) throw Error('experiment root must be a directory');
  let current = root;
  for (const part of relative(root, dirname(dst)).split(sep).filter(Boolean)) {
    current = resolve(current, part);
    if (!present(current)) break;
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw Error('reuse parent must be a real directory, not a symlink');
  }
}
function link(src,dst,root) {
  src=resolve(src); dst=resolve(dst); root=resolve(root);
  if (!isAbsolute(src)||!isAbsolute(dst)||outside(root,dst)) throw Error('destination outside experiment root');
  const dr=relative(root,dst); if (!(dr==='inputs'||dr.startsWith('inputs'+sep))) throw Error('reuse destination must be under inputs/');
  checkParents(root, dst);
  if (!present(src)) throw Error('source does not exist'); const ss=lstatSync(src); if (ss.isSymbolicLink()||(!ss.isFile()&&!ss.isDirectory())) throw Error('source must be a regular file or directory, not a symlink or special file');
  if (present(dst)) throw Error('destination already exists');
  const sourceDigest = digest(src);
  mkdirSync(dirname(dst),{recursive:true}); checkParents(root, dst); symlinkSync(src,dst,ss.isDirectory()?'junction':'file');
  return {source:src,destination:dst,digest:sourceDigest,accessRequested:'read-only',readOnlyEnforcement:'not-enforced',materialization:'symlink',sourceType:ss.isDirectory()?'directory':'file'};
}
function verify(dst, expected, root) {
  dst=resolve(dst); root=resolve(root); if(outside(root,dst)) throw Error('path outside experiment root'); const dr=relative(root,dst); if (!(dr==='inputs'||dr.startsWith('inputs'+sep))) throw Error('reuse link must be under inputs/');
  checkParents(root, dst);
  const s=lstatSync(dst); if(!s.isSymbolicLink()) throw Error('expected symlink'); const target=realpathSync(dst); if(expected.approvedRoot&&outside(resolve(expected.approvedRoot),target)) throw Error('resolved target outside approved root');
  const got=digest(target); if(got!==expected.digest) throw Error(`digest mismatch: ${got}`); if(expected.source&&resolve(expected.source)!==target) throw Error('source target mismatch'); return {status:'pass',resolvedTarget:target,digest:got,accessRequested:'read-only',readOnlyEnforcement:'not-enforced'};
}
const [cmd, ...a]=process.argv.slice(2);
try { if(cmd==='link-artifact'){ const [src,dst,root]=a; if(!src||!dst||!root) throw Error('usage: link-artifact SOURCE DEST EXPERIMENT_ROOT'); console.log(JSON.stringify(link(src,dst,root),null,2)); }
 else if(cmd==='verify-reuse'){ const [dst,manifest,root]=a; if(!dst||!manifest||!root) throw Error('usage: verify-reuse LINK MANIFEST EXPERIMENT_ROOT'); console.log(JSON.stringify(verify(dst,JSON.parse(readFileSync(manifest)),root),null,2)); }
 else throw Error('commands: link-artifact, verify-reuse'); } catch(e){ die(e.message); }
