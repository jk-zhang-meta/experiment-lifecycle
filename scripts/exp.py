#!/usr/bin/env python3
"""Git-bound run ledger.

Every run is tied to the exact commit it executed and leaves one small JSON
record in the repository. Logs and outputs stay in an untracked run directory.

  exp.py run --name SLUG [--snapshot] [--isolate] [--tee] [--runs-dir DIR]
             [--tag K=V]... -- COMMAND...
  exp.py ls [--json]
  exp.py show RUN
  exp.py decide RUN {keep,discard} [--note TEXT] [--metric K=V]...
  exp.py diff RUN_A RUN_B
  exp.py sync [RUN ...]

RUN is a run id or any unique part of one. Each record is a file under
experiments/ledger/ for you to commit. A copy is pinned inside this clone under
refs/exp-records/, so cleaning or resetting the working tree cannot lose it;
`sync` writes back what the current branch's working tree is missing.
Python 3.8+ standard library only.
"""
import argparse
import contextlib
import json
import os
import re
import shlex
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time

# Repository-relative directory of the record files.
LEDGER = os.environ.get("EXP_LEDGER_DIR", "experiments/ledger").strip("/")
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]{0,39}$")
SECRET_NAME = re.compile(r"(^|/)(\.env(\..+)?|\.netrc|.+\.(pem|key|p12|pfx)|id_(rsa|dsa|ecdsa|ed25519)"
                         r"|credentials(\..+)?|secrets?\.(json|ya?ml|toml|env))$", re.I | re.S)
# Executed commits are pinned under refs/exp/ and may be pushed. Record copies are this clone's
# own safety net: they stay out of that namespace, and records travel as committed files.
COMMIT_REFS, RECORD_REFS = "refs/exp", "refs/exp-records"


def warn(message):
    print(f"exp: {message}", file=sys.stderr)


def die(message, code=2):
    warn(message)
    sys.exit(code)


def git(*args, cwd=None, env=None, check=True):
    # File names are bytes: one that is not UTF-8 must come back as the name it is, not stop the run.
    done = subprocess.run(["git", *args], cwd=cwd, env=env, capture_output=True, text=True, errors="surrogateescape")
    if check and done.returncode:
        die(f"git {' '.join(args)} failed: {done.stderr.strip()}")
    return done.stdout.strip("\n") if done.returncode == 0 else ""


def repo_root():
    root = git("rev-parse", "--show-toplevel", check=False)
    if not root:
        die("not inside a Git repository")
    if LEDGER in ("", ".") or os.path.isabs(LEDGER) or ".." in LEDGER.split("/"):
        die("EXP_LEDGER_DIR must name a directory inside the repository")
    return os.path.realpath(root)


def now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def pairs(items, numeric=False):
    out = {}
    for item in items or []:
        key, separator, value = item.partition("=")
        if not separator or not key:
            die(f"expected KEY=VALUE, got {item!r}")
        if numeric:
            try:
                value = float(value)
            except ValueError:
                pass
        out[key] = value
    return out


def record_file(root, run_id):
    return os.path.join(root, LEDGER, run_id + ".json")


def public(record):
    return {key: value for key, value in record.items() if not key.startswith("_")}


def encoded(record):
    return json.dumps(public(record), indent=2, sort_keys=True) + "\n"


def write_file(root, record):
    directory = os.path.join(root, LEDGER)
    os.makedirs(directory, exist_ok=True)
    handle, temporary = tempfile.mkstemp(dir=directory, suffix=".tmp")
    with os.fdopen(handle, "w") as stream:
        stream.write(encoded(record))
    os.chmod(temporary, 0o644)
    os.replace(temporary, record_file(root, record["id"]))


def write_record(root, record, to_file=True):
    """Pin the record inside Git and, unless it belongs to another branch, write its file. A record
    that cannot be pinned is written as a file wherever we are, so that it exists somewhere.
    Returns False when the clone's pinned copy alone holds the record."""
    record["updated"] = time.time()
    if to_file:
        write_file(root, record)
    blob = subprocess.run(["git", "hash-object", "-w", "--stdin"], cwd=root, input=encoded(record),
                          capture_output=True, text=True)
    if blob.returncode or subprocess.run(["git", "update-ref", f"{RECORD_REFS}/{record['id']}", blob.stdout.strip()],
                                         cwd=root, capture_output=True).returncode:
        if to_file:
            warn(f"could not pin the record of {record['id']} inside Git; commit its file soon")
        else:
            try:
                write_file(root, record)
                warn(f"could not pin the record of {record['id']} inside Git, so its file was written here; "
                     f"move it to branch {record.get('branch')} and commit it there")
            except OSError as error:
                warn(f"the record of {record['id']} could not be saved anywhere: {error}")
        return True
    return to_file


@contextlib.contextmanager
def locked(root):
    """One process at a time reads, changes and writes a record. Where flock is missing (native
    Windows) or refused by the filesystem, this is a no-op."""
    try:
        import fcntl
    except ImportError:
        yield
        return
    with open(os.path.join(root, git("rev-parse", "--git-common-dir", cwd=root), "exp.lock"), "w") as stream:
        try:
            fcntl.flock(stream, fcntl.LOCK_EX)
        except OSError:  # a filesystem without flock, as some network mounts are: go on unlocked
            pass
        yield


def current_branch(root):
    return git("rev-parse", "--abbrev-ref", "HEAD", cwd=root, check=False)


def pinned_records(root):
    names = git("for-each-ref", "--format=%(objectname)", RECORD_REFS, cwd=root, check=False).split()
    if not names:
        return []
    data = subprocess.run(["git", "cat-file", "--batch"], cwd=root, input=("\n".join(names) + "\n").encode(),
                          capture_output=True).stdout
    records, at = [], 0
    while at < len(data):
        end = data.index(b"\n", at)
        header = data[at:end].split()
        if len(header) != 3:  # "<name> missing"
            at = end + 1
            continue
        size = int(header[2])
        try:
            records.append(json.loads(data[end + 1:end + 1 + size]))
        except ValueError:
            pass
        at = end + 1 + size + 1
    return records


def load_records(root):
    """Every run this clone knows, on any branch: the newer of the record file and its pinned
    copy. `_file` says the working tree holds that newest copy, `_present` that it holds any."""
    records, directory = {}, os.path.join(root, LEDGER)
    for name in sorted(os.listdir(directory)) if os.path.isdir(directory) else []:
        if name.endswith(".json"):
            try:
                with open(os.path.join(directory, name)) as stream:
                    record = json.load(stream)
                records[record["id"]] = dict(record, _file=True, _present=True)
            except (OSError, ValueError, KeyError, TypeError):
                if os.path.getsize(os.path.join(directory, name)):  # an empty file is a run id being claimed
                    warn(f"skipped unreadable record {name}")
    for record in pinned_records(root):
        if not isinstance(record, dict) or "id" not in record:
            continue
        known = records.get(record["id"])
        if known is None or record.get("updated", 0) > known.get("updated", 0):
            records[record["id"]] = dict(record, _file=False, _present=known is not None)
    return [records[key] for key in sorted(records)]  # ids start with a UTC timestamp


def find(root, key):
    records = load_records(root)
    matches = [r for r in records if r["id"] == key] or [r for r in records if key in r["id"]]
    if len(matches) != 1:
        die(f"{key!r} matches {len(matches)} runs; give a unique part of one run id")
    return matches[0]


def uncommitted(root):
    """Changes outside the ledger; records never make the tree count as dirty."""
    return git("status", "--porcelain", "--untracked-files=all", "--ignore-submodules=none", "--", ".",
               f":(exclude){LEDGER}", cwd=root)


def gitlinks(root, treeish, env=None):
    """Paths of submodule entries in a commit, or in the index when treeish is None."""
    listing = (git("ls-tree", "-r", "-z", treeish, cwd=root) if treeish
               else git("ls-files", "-s", "-z", cwd=root, env=env))  # -z: Git quotes non-ASCII paths otherwise
    return {entry.split("\t", 1)[1] for entry in listing.split("\0") if entry.startswith("160000 ")}


def snapshot(root, head, run_id):
    """Commit the working tree, untracked files included, without touching the
    index, the branch or the files."""
    untracked = git("ls-files", "--others", "--exclude-standard", "-z", cwd=root).split("\0")
    risky = [name for name in untracked if SECRET_NAME.search(name) and not name.startswith(LEDGER + "/")]
    if risky:
        die("these untracked files look like secrets and would enter the snapshot; add them to .gitignore "
            "first:\n" + "\n".join(risky[:10]))
    with tempfile.TemporaryDirectory() as scratch:
        env = dict(os.environ, GIT_INDEX_FILE=os.path.join(scratch, "index"))
        git("read-tree", head, cwd=root, env=env)
        git("add", "-A", "--", ".", f":(exclude){LEDGER}", cwd=root, env=env)
        known = gitlinks(root, head)
        for path in sorted(gitlinks(root, None, env)):
            if path not in known:
                die(f"{path} is a nested repository that Git does not track, so a snapshot cannot hold its "
                    "files; commit it as a submodule or ignore it")
            inside = os.path.join(root, path)
            if os.path.lexists(os.path.join(inside, ".git")) and git("status", "--porcelain", cwd=inside, check=False):
                die(f"submodule {path} has uncommitted changes; commit inside it first, because a snapshot "
                    "records only the submodule's commit")
        tree = git("write-tree", cwd=root, env=env)
    env = dict(os.environ)
    if not git("config", "user.email", cwd=root, check=False):
        for role in ("AUTHOR", "COMMITTER"):
            env.setdefault(f"GIT_{role}_NAME", "exp")
            env.setdefault(f"GIT_{role}_EMAIL", "exp@localhost")
    return git("commit-tree", tree, "-p", head, "-m", f"exp snapshot {run_id}", cwd=root, env=env)


def export_source(root, commit, target):
    """Write the commit's files to a plain directory: no worktree is registered."""
    if gitlinks(root, commit):
        die("--isolate cannot populate submodules; launch without it from a checkout you leave alone")
    with tempfile.TemporaryDirectory() as scratch:
        env = dict(os.environ, GIT_INDEX_FILE=os.path.join(scratch, "index"))
        git("read-tree", commit, cwd=root, env=env)
        git("checkout-index", "--all", f"--prefix={target}/", cwd=root, env=env)


def claim_run_id(root, base):
    """Reserve a run id by creating its record file; equal ids in the same second get a suffix."""
    os.makedirs(os.path.join(root, LEDGER), exist_ok=True)
    for attempt in range(1, 1000):
        run_id = base if attempt == 1 else f"{base}-{attempt}"
        try:
            os.close(os.open(record_file(root, run_id), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644))
            return run_id
        except FileExistsError:
            continue
    die("could not allocate a run id")


def make_run_dir(root, base, run_id):
    base = os.path.realpath(base or os.environ.get("EXP_RUNS_DIR") or os.path.join(root, "runs"))
    run_dir = os.path.join(base, run_id)
    os.makedirs(run_dir)
    relative = os.path.relpath(run_dir, root)
    if not relative.startswith(".."):
        if subprocess.run(["git", "check-ignore", "-q", relative], cwd=root).returncode != 0:
            os.rmdir(run_dir)
            die(f"{os.path.dirname(relative)}/ is inside the repository and not ignored; "
                "add it to .gitignore or point EXP_RUNS_DIR outside the repository")
    return run_dir


def gpus():
    try:
        done = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
            capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.TimeoutExpired):
        return []
    return [line.strip() for line in done.stdout.splitlines() if line.strip()] if done.returncode == 0 else []


def log_tail(path, lines=20):
    with open(path, "rb") as stream:
        stream.seek(0, os.SEEK_END)
        stream.seek(max(0, stream.tell() - 8192))
        return b"\n".join(stream.read().splitlines()[-lines:]).decode(errors="replace")


def source_state(root):
    """Every uncommitted path with its size and modification time. Two equal states mean the
    working tree stood still; nothing is written to Git to find out."""
    state, second_name = [], False
    for entry in git("status", "--porcelain", "-z", "--untracked-files=all", "--ignore-submodules=none", "--", ".",
                     f":(exclude){LEDGER}", cwd=root, check=False).split("\0"):
        if second_name or not entry:  # a rename lists its old name as a second entry
            second_name = False
            continue
        second_name = "R" in entry[:2] or "C" in entry[:2]
        try:
            info = os.lstat(os.path.join(root, entry[3:]))
            state.append((entry, info.st_size, info.st_mtime_ns))
        except OSError:
            state.append((entry, None, None))
    return state


def source_moved(root, head, launch_state):
    """True when the checkout a run shares no longer holds what it was launched from. Committing
    records does not count: HEAD is compared by its files outside the ledger."""
    committed = subprocess.run(["git", "diff", "--quiet", "--ignore-submodules=none", head, "HEAD", "--", ".",
                                f":(exclude){LEDGER}"], cwd=root, capture_output=True).returncode
    return committed != 0 or source_state(root) != launch_state


def belongs_here(root, record):
    """A record file is written where one already is, or on the branch its run was launched from.
    Anywhere else it would collide with that branch's copy at the next checkout or merge."""
    return record.get("_present", False) or record.get("branch") == current_branch(root)


def finish(root, record, metrics=None, **fields):
    """Close a run's record without losing a verdict recorded while it was running."""
    with locked(root):
        current = next((r for r in load_records(root) if r["id"] == record["id"]), record)
        current.update(fields)
        current["metrics"] = dict(metrics or {}, **current.get("metrics", {}))
        here = write_record(root, current, to_file=belongs_here(root, current))
    if not here:
        warn(f"this run belongs to branch {current.get('branch')}: its record is saved in this clone, and "
             "`exp.py sync` on that branch writes the file")
    return current


def cmd_run(args):
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command:
        die("give the command to run after --")
    if not SLUG.match(args.name):
        die("--name must be a short lowercase slug such as lr-sweep")
    root = repo_root()
    head = git("rev-parse", "HEAD", cwd=root, check=False)
    if not head:
        die("commit at least once before running")
    if subprocess.run(["git", "check-ignore", "-q", f"{LEDGER}/run.json"], cwd=root).returncode == 0:
        die(f"{LEDGER}/ is ignored by Git, so records could never be committed; remove that ignore rule")
    hidden = [line[2:] for line in git("ls-files", "-v", cwd=root).splitlines()
              if line[:1].islower() or line[:1] == "S"]
    if hidden:
        die("these files are hidden from Git (skip-worktree or assume-unchanged), so a commit cannot say what "
            "ran:\n" + "\n".join(hidden[:10]))
    changes = uncommitted(root)
    if changes and not args.snapshot:
        shown = "\n".join(changes.splitlines()[:10])
        die("uncommitted changes; commit them, or pass --snapshot to bind this run to a "
            f"snapshot commit of the working tree:\n{shown}")
    launch_state = source_state(root)
    signals, held, process = [], [], None

    def stop(signum, _frame):  # nothing runs yet: undo the launch instead of dying with it half made
        raise SystemExit(128 + signum)

    def forward(signum, _frame):
        signals.append(signum)
        if process is None:  # the command is still starting; it gets the signal once it exists
            held.append(signum)
            return
        with contextlib.suppress(ProcessLookupError):
            process.send_signal(signum)

    # A signal the launcher had ignored stays ignored, here and in the command: nohup and a
    # background job of a non-interactive shell rely on that.
    heard = [getattr(signal, name) for name in ("SIGINT", "SIGTERM", "SIGHUP")
             if hasattr(signal, name) and signal.getsignal(getattr(signal, name)) != signal.SIG_IGN]

    def listen(handler):  # a closed terminal or a killed wrapper must not orphan the record
        for signum in heard:
            signal.signal(signum, handler)

    listen(stop)
    run_id = run_dir = None
    try:
        # Hold signals back while the id is claimed, so that none lands between its file and its name here.
        mask = getattr(signal, "pthread_sigmask", None)
        before = mask(signal.SIG_BLOCK, heard) if mask else None
        try:
            run_id = claim_run_id(root, f"{time.strftime('%Y%m%d-%H%M%S', time.gmtime())}-{args.name}-{head[:7]}")
        finally:
            if mask:
                mask(signal.SIG_SETMASK, before)
        run_dir = make_run_dir(root, args.runs_dir, run_id)
        commit = snapshot(root, head, run_id) if changes else head
        # Pin the executed commit so a later reset, rebase or branch deletion cannot lose it.
        git("update-ref", f"{COMMIT_REFS}/{run_id}", commit, cwd=root)
        relative_cwd = os.path.relpath(os.path.realpath(os.getcwd()), root)
        workdir = os.getcwd()
        if args.isolate:
            source = os.path.join(run_dir, "src")
            export_source(root, commit, source)
            workdir = os.path.join(source, relative_cwd)
        record = {
            "schema": 1, "id": run_id, "name": args.name, "status": "running",
            "decision": None, "note": "", "commit": commit, "head": head,
            "snapshot": bool(changes), "isolated": args.isolate, "source_changed": False,
            "branch": git("rev-parse", "--abbrev-ref", "HEAD", cwd=root),
            "command": command, "cwd": relative_cwd, "started": now(), "ended": None,
            "duration_s": None, "exit_code": None, "host": socket.gethostname(),
            "gpus": gpus(), "run_dir": run_dir, "metrics": {}, "tags": pairs(args.tag),
        }
        write_record(root, record)
        listen(forward)
    except BaseException:  # nothing ran: release the claimed id and what was set up for it
        listen(signal.SIG_IGN)  # a second signal must not stop the release halfway
        if run_id:
            with contextlib.suppress(OSError):
                os.unlink(record_file(root, run_id))
            for ref in (f"{COMMIT_REFS}/{run_id}", f"{RECORD_REFS}/{run_id}"):
                subprocess.run(["git", "update-ref", "-d", ref], cwd=root, capture_output=True)
        if run_dir:
            shutil.rmtree(run_dir, ignore_errors=True)
        raise

    env = dict(os.environ, EXP_RUN_ID=run_id, EXP_RUN_DIR=run_dir, EXP_COMMIT=commit)
    if args.isolate:  # Git inside the exported copy must not answer for the checkout around it
        env["GIT_CEILING_DIRECTORIES"] = os.pathsep.join(
            filter(None, [run_dir, os.environ.get("GIT_CEILING_DIRECTORIES")]))
    log_path = os.path.join(run_dir, "log.txt")
    began, code, echo = time.time(), None, args.tee and sys.stdout is not None  # None: started with it closed
    with open(log_path, "wb") as log:
        try:
            process = subprocess.Popen(command, cwd=workdir, env=env, stderr=subprocess.STDOUT,
                                       stdout=subprocess.PIPE if args.tee else log)
        except OSError as error:
            finish(root, record, status="failed", exit_code=127, ended=now(), duration_s=0.0)
            die(f"cannot start {command[0]}: {error}", 127)
        with contextlib.suppress(ProcessLookupError):
            for signum in held:
                process.send_signal(signum)
        try:
            if args.tee:
                for chunk in iter(lambda: process.stdout.read1(65536), b""):
                    log.write(chunk)
                    if echo:
                        try:
                            sys.stdout.buffer.write(chunk)
                            sys.stdout.buffer.flush()
                        except (BrokenPipeError, ValueError):  # the reader left; keep logging to the file
                            echo = False
                            os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
            code = process.wait()
        finally:
            if code is None:  # the wrapper is being torn down: do not leave the run or its record open
                process.kill()
                code = process.wait()

    status = "finished" if code == 0 else ("interrupted" if signals else "failed")
    # A run that shares the checkout is only as fixed as the checkout stayed.
    changed = not args.isolate and source_moved(root, head, launch_state)
    reported = {}
    metrics_path = os.path.join(run_dir, "metrics.json")
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path) as stream:
                reported = json.load(stream)
            if not isinstance(reported, dict):
                raise ValueError("not a JSON object")
        except (OSError, ValueError) as error:
            reported = {}
            warn(f"ignored {metrics_path}: {error}")
    record = finish(root, record, metrics=reported, status=status, exit_code=code, ended=now(),
                    duration_s=round(time.time() - began, 1), source_changed=changed)
    print(f"exp: {run_id} {status} exit={code} commit={commit[:10]} "
          f"metrics={json.dumps(record['metrics'], sort_keys=True)} log={log_path}")
    if changed:
        warn("the checkout changed while this run was alive, so its commit may not be all that ran; "
             "use --isolate for runs that outlive your next edit")
    if code != 0 and not args.tee:
        print(log_tail(log_path), file=sys.stderr)
    return code if code >= 0 else 128 - code


def cmd_ls(args):
    root = repo_root()
    records = load_records(root)
    if args.json:
        print(json.dumps([public(r) for r in records], indent=2, sort_keys=True))
        return 0
    print("id\tstatus\tdecision\tcommit\tmetrics\tnote")
    for r in records:
        metrics = " ".join(f"{k}={v:.6g}" if isinstance(v, float) else f"{k}={v}"
                           for k, v in sorted(r["metrics"].items()))
        print("\t".join([r["id"], r["status"], r["decision"] or "-", r["commit"][:10],
                         metrics or "-", r["note"] or "-"]))
    branch = current_branch(root)
    behind = [r.get("branch") == branch for r in records if not r["_file"]]
    if any(behind):
        warn(f"{sum(behind)} of this branch's records are missing or out of date in the working tree; "
             "`exp.py sync` writes them back")
    if not all(behind):
        warn(f"{len(behind) - sum(behind)} runs of other branches are listed from this clone's pinned copies")
    return 0


def cmd_show(args):
    r = find(repo_root(), args.run)
    print(json.dumps(public(r), indent=2, sort_keys=True))
    print(f"log: {os.path.join(r['run_dir'], 'log.txt')}")
    print(f"source: git archive {r['commit']} | tar -x -C <dir>   then, in {r['cwd']}: {shlex.join(r['command'])}")
    return 0


def cmd_decide(args):
    root = repo_root()
    with locked(root):
        r = find(root, args.run)
        r["decision"] = args.decision
        if args.note is not None:
            r["note"] = args.note
        r["metrics"].update(pairs(args.metric, numeric=True))
        here = write_record(root, r, to_file=belongs_here(root, r))
    print(f"exp: {r['id']} {args.decision}")
    if not here:
        warn(f"this run belongs to branch {r.get('branch')}: the verdict is saved in this clone, and "
             "`exp.py sync` on that branch writes it into the record file")
    return 0


def cmd_diff(args):
    root = repo_root()
    a, b = find(root, args.a), find(root, args.b)
    print(f"\t{a['id']}\t{b['id']}")
    for key in sorted(set(a["metrics"]) | set(b["metrics"])):
        print(f"{key}\t{a['metrics'].get(key, '-')}\t{b['metrics'].get(key, '-')}")
    for field in ("command", "tags", "host"):
        if a[field] != b[field]:
            print(f"{field}\t{a[field]}\t{b[field]}")
    print(git("diff", "--stat", a["commit"], b["commit"], cwd=root))
    return 0


def cmd_sync(args):
    root = repo_root()
    with locked(root):
        branch = current_branch(root)
        behind = [r for r in load_records(root) if not r["_file"]]
        chosen = [find(root, key) for key in args.runs] or [r for r in behind if r.get("branch") == branch]
        for record in chosen:
            write_file(root, record)
    elsewhere = 0 if args.runs else len(behind) - len(chosen)
    print(f"exp: wrote {len(chosen)} record file(s) back to {LEDGER}/"
          + (f"; left {elsewhere} of other branches alone (name a run to write it here)" if elsewhere else ""))
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(prog="exp.py", description=__doc__.split("\n\n")[1])
    commands = parser.add_subparsers(dest="action", required=True)

    run = commands.add_parser("run", help="run a command bound to the current commit")
    run.add_argument("--name", required=True, help="short slug naming what this run tries")
    run.add_argument("--snapshot", action="store_true",
                     help="allow uncommitted changes by binding the run to a snapshot commit")
    run.add_argument("--isolate", action="store_true",
                     help="run from an exported copy of the commit, so later edits cannot affect it")
    run.add_argument("--tee", action="store_true", help="also stream the output here")
    run.add_argument("--runs-dir", help="parent of the run directory (default $EXP_RUNS_DIR, then <repo>/runs)")
    run.add_argument("--tag", action="append", metavar="K=V", help="free-form label, repeatable")
    run.add_argument("command", nargs=argparse.REMAINDER)
    run.set_defaults(handler=cmd_run)

    ls = commands.add_parser("ls", help="list runs, oldest first, as TSV")
    ls.add_argument("--json", action="store_true")
    ls.set_defaults(handler=cmd_ls)

    show = commands.add_parser("show", help="print one record and how to get its source back")
    show.add_argument("run")
    show.set_defaults(handler=cmd_show)

    decide = commands.add_parser("decide", help="record the verdict on a run")
    decide.add_argument("run")
    decide.add_argument("decision", choices=["keep", "discard"])
    decide.add_argument("--note")
    decide.add_argument("--metric", action="append", metavar="K=V")
    decide.set_defaults(handler=cmd_decide)

    diff = commands.add_parser("diff", help="compare metrics, settings and code of two runs")
    diff.add_argument("a")
    diff.add_argument("b")
    diff.set_defaults(handler=cmd_diff)

    sync = commands.add_parser("sync", help="write back record files this branch's working tree lost")
    sync.add_argument("runs", nargs="*", metavar="RUN", help="write these runs here, whatever their branch")
    sync.set_defaults(handler=cmd_sync)

    args = parser.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):  # a path that is not UTF-8 is printed as the bytes it is
        sys.stdout.reconfigure(errors="surrogateescape")
    return args.handler(args)


if __name__ == "__main__":
    sys.exit(main())
