#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, realpathSync, symlinkSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const die = (m) => { console.error(`reuse: ${m}`); process.exitCode = 2; };
const digest = (p) => { const s=lstatSync(p); if (s.isFile()) return 'sha256:'+createHash('sha256').update(readFileSync(p)).digest('hex'); if (!s.isDirectory()) throw Error('artifact must be a regular file or directory'); const h=createHash('sha256'); for (const n of readdirSync(p).sort()) { const c=resolve(p,n), cs=lstatSync(c); if (cs.isSymbolicLink()) throw Error('directory artifact contains symlink'); h.update(n+'\0'+digest(c)+'\0'); } return 'sha256:'+h.digest('hex'); };
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
  return {source:src,destination:dst,digest:sourceDigest,access:'read-only',materialization:'symlink',sourceType:ss.isDirectory()?'directory':'file'};
}
function verify(dst, expected, root) {
  dst=resolve(dst); root=resolve(root); if(outside(root,dst)) throw Error('path outside experiment root'); const dr=relative(root,dst); if (!(dr==='inputs'||dr.startsWith('inputs'+sep))) throw Error('reuse link must be under inputs/');
  checkParents(root, dst);
  const s=lstatSync(dst); if(!s.isSymbolicLink()) throw Error('expected symlink'); const target=realpathSync(dst); if(expected.approvedRoot&&outside(resolve(expected.approvedRoot),target)) throw Error('resolved target outside approved root');
  const got=digest(target); if(got!==expected.digest) throw Error(`digest mismatch: ${got}`); if(expected.source&&resolve(expected.source)!==target) throw Error('source target mismatch'); return {status:'pass',resolvedTarget:target,digest:got,readOnlyEnforcement:expected.readOnlyEnforcement||'executor-required'};
}
const [cmd, ...a]=process.argv.slice(2);
try { if(cmd==='link-artifact'){ const [src,dst,root]=a; if(!src||!dst||!root) throw Error('usage: link-artifact SOURCE DEST EXPERIMENT_ROOT'); console.log(JSON.stringify(link(src,dst,root),null,2)); }
 else if(cmd==='verify-reuse'){ const [dst,manifest,root]=a; if(!dst||!manifest||!root) throw Error('usage: verify-reuse LINK MANIFEST EXPERIMENT_ROOT'); console.log(JSON.stringify(verify(dst,JSON.parse(readFileSync(manifest)),root),null,2)); }
 else throw Error('commands: link-artifact, verify-reuse'); } catch(e){ die(e.message); }
