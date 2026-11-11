"""Behavioural tests for scripts/exp.py against real temporary Git repositories."""
import contextlib
import importlib.util
import io
import json
import os
import signal
import subprocess
import sys
import tempfile
import time
import unittest

EXP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts", "exp.py")
PY = sys.executable
REPORT = ("import json, os; open(os.path.join(os.environ['EXP_RUN_DIR'], 'metrics.json'), 'w')"
          ".write(json.dumps({'acc': 0.9})); print('hello from run')")


def git(repo, *args):
    return subprocess.run(["git", "-c", "protocol.file.allow=always", *args], cwd=repo, check=True,
                          capture_output=True, text=True).stdout.strip()


def load_exp():
    spec = importlib.util.spec_from_file_location("exp", EXP)
    exp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(exp)
    return exp


def new_repo(path, files):
    os.makedirs(path)
    git(path, "init", "-q", "-b", "main")
    git(path, "config", "user.name", "tester")
    git(path, "config", "user.email", "tester@example.invalid")
    for name, text in files.items():
        with open(os.path.join(path, name), "w") as stream:
            stream.write(text)
    git(path, "add", "-A")
    git(path, "commit", "-q", "-m", "init")


class ExpTest(unittest.TestCase):
    def setUp(self):
        self._scratch = tempfile.TemporaryDirectory()
        self.addCleanup(self._scratch.cleanup)
        self.repo = os.path.join(self._scratch.name, "repo")
        new_repo(self.repo, {".gitignore": "runs/\n", "train.py": "print('v1')\n"})
        self.env = {k: v for k, v in os.environ.items() if not k.startswith("EXP_")}

    def write(self, name, text):
        with open(os.path.join(self.repo, name), "w") as stream:
            stream.write(text)

    def exp(self, *args):
        return subprocess.run([PY, EXP, *args], cwd=self.repo, env=self.env, capture_output=True, text=True)

    def records(self):
        return json.loads(self.exp("ls", "--json").stdout)

    def start(self, name, seconds, *options):
        """Launch a run that sleeps, and return once its record says it is running."""
        run = subprocess.Popen([PY, EXP, "run", "--name", name, *options, "--", PY, "-c",
                                f"import time; time.sleep({seconds})"],
                               cwd=self.repo, env=self.env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.addCleanup(run.wait)
        self.addCleanup(run.kill)
        deadline = time.time() + 20
        while time.time() < deadline and not [r for r in self.records() if r["name"] == name
                                              and r["status"] == "running"]:
            time.sleep(0.1)
        return run

    def refused(self, done, phrase):
        self.assertEqual(done.returncode, 2, done.stderr)
        self.assertIn(phrase, done.stderr)
        self.nothing_left()

    def nothing_left(self):
        # Nothing ran, so no record, claimed id, pinned ref or run directory is left behind.
        self.assertEqual(self.records(), [])
        self.assertEqual(git(self.repo, "for-each-ref", "refs/exp", "refs/exp-records"), "")
        for leftover in ("experiments/ledger", "runs"):
            directory = os.path.join(self.repo, leftover)
            self.assertEqual(os.listdir(directory) if os.path.isdir(directory) else [], [], leftover)

    # --- the binding -------------------------------------------------------------------------

    def test_clean_run_is_bound_to_head_and_collects_metrics(self):
        done = self.exp("run", "--name", "base", "--", PY, "-c", REPORT)
        self.assertEqual(done.returncode, 0, done.stderr)
        (record,) = self.records()
        self.assertEqual(record["commit"], git(self.repo, "rev-parse", "HEAD"))
        self.assertEqual((record["status"], record["exit_code"], record["snapshot"], record["source_changed"]),
                         ("finished", 0, False, False))
        self.assertEqual(record["metrics"], {"acc": 0.9})
        self.assertEqual(git(self.repo, "rev-parse", f"refs/exp/{record['id']}"), record["commit"])
        with open(os.path.join(record["run_dir"], "log.txt")) as stream:
            self.assertIn("hello from run", stream.read())
        # Only the record file is new; the run directory is ignored.
        self.assertEqual(git(self.repo, "status", "--porcelain", "--untracked-files=all").split()[-1],
                         f"experiments/ledger/{record['id']}.json")

    def test_uncommitted_changes_are_refused_without_snapshot(self):
        self.write("train.py", "print('v2')\n")
        self.refused(self.exp("run", "--name", "dirty", "--", PY, "-c", "pass"), "uncommitted changes")

    def test_snapshot_binds_modified_and_untracked_files_without_touching_the_tree(self):
        self.write("train.py", "print('v2')\n")
        self.write("new_module.py", "X = 1\n")
        head, status = git(self.repo, "rev-parse", "HEAD"), git(self.repo, "status", "--porcelain")
        done = self.exp("run", "--name", "wip", "--snapshot", "--", PY, "-c", "pass")
        self.assertEqual(done.returncode, 0, done.stderr)
        (record,) = self.records()
        self.assertTrue(record["snapshot"])
        self.assertEqual(record["head"], head)
        self.assertNotEqual(record["commit"], head)
        self.assertEqual(git(self.repo, "show", f"{record['commit']}:train.py"), "print('v2')")
        self.assertEqual(git(self.repo, "show", f"{record['commit']}:new_module.py"), "X = 1")
        self.assertEqual(git(self.repo, "rev-parse", f"refs/exp/{record['id']}"), record["commit"])
        self.assertEqual(git(self.repo, "rev-parse", "HEAD"), head)
        self.assertEqual(git(self.repo, "status", "--porcelain", "--", "train.py", "new_module.py"), status)

    def test_snapshot_refuses_what_it_cannot_faithfully_hold(self):
        # Git quotes non-ASCII paths in plain listings, and a pattern's "." stops at a newline.
        for secret in (".env", os.path.join("数据", "密钥.pem"), os.path.join("数据", "a\nb.pem")):
            os.makedirs(os.path.dirname(os.path.join(self.repo, secret)), exist_ok=True)
            self.write(secret, "TOKEN=abc\n")
            self.refused(self.exp("run", "--name", "s", "--snapshot", "--", PY, "-c", "pass"), "look like secrets")
            os.unlink(os.path.join(self.repo, secret))
        os.rmdir(os.path.join(self.repo, "数据"))
        new_repo(os.path.join(self.repo, "nested"), {"lib.py": "X = 1\n"})
        self.refused(self.exp("run", "--name", "s", "--snapshot", "--", PY, "-c", "pass"), "nested repository")

    def test_dirty_submodule_is_never_reported_as_bound(self):
        library = os.path.join(self._scratch.name, "library")
        new_repo(library, {"lib.py": "X = 1\n"})
        git(self.repo, "submodule", "add", "-q", library, "子模块")  # a path Git quotes in plain listings
        git(self.repo, "commit", "-qm", "add submodule")
        with open(os.path.join(self.repo, "子模块", "lib.py"), "w") as stream:
            stream.write("X = 999\n")
        self.refused(self.exp("run", "--name", "s", "--", PY, "-c", "pass"), "uncommitted changes")
        self.refused(self.exp("run", "--name", "s", "--snapshot", "--", PY, "-c", "pass"),
                     "submodule 子模块 has uncommitted changes")
        git(os.path.join(self.repo, "子模块"), "checkout", "-q", "--", "lib.py")
        self.refused(self.exp("run", "--name", "s", "--isolate", "--", PY, "-c", "pass"), "cannot populate submodules")

    def test_files_hidden_from_git_are_refused(self):
        git(self.repo, "update-index", "--skip-worktree", "train.py")
        self.write("train.py", "print('local only')\n")
        self.refused(self.exp("run", "--name", "h", "--", PY, "-c", "pass"), "hidden from Git")

    def test_isolated_run_executes_the_committed_source_not_later_edits(self):
        self.write("train.py", "print('committed')\n")
        git(self.repo, "commit", "-qam", "committed")
        # The command edits the launching checkout first, then runs train.py from its own cwd.
        edit = os.path.join(self.repo, "train.py")
        script = (f"open({edit!r}, 'w').write(\"print('edited later')\\n\"); "
                  "exec(open('train.py').read())")
        done = self.exp("run", "--name", "iso", "--isolate", "--", PY, "-c", script)
        self.assertEqual(done.returncode, 0, done.stderr)
        (record,) = self.records()
        with open(os.path.join(record["run_dir"], "log.txt")) as stream:
            self.assertEqual(stream.read().strip(), "committed")
        self.assertFalse(record["source_changed"])  # an isolated run does not depend on the checkout
        self.assertEqual(len(git(self.repo, "worktree", "list").splitlines()), 1)  # no worktree was registered
        self.assertFalse(os.path.exists(os.path.join(record["run_dir"], "src", ".git")))

    def test_a_checkout_edited_during_a_shared_run_is_flagged(self):
        done = self.exp("run", "--name", "drift", "--", PY, "-c", "open('train.py', 'a').write('# later\\n')")
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertIn("checkout changed", done.stderr)
        self.assertTrue(self.records()[0]["source_changed"])

    def test_a_modified_file_edited_again_during_a_snapshot_run_is_flagged(self):
        self.write("train.py", "print('v2')\n")  # already modified at launch, so `git status` reads the same after
        done = self.exp("run", "--name", "again", "--snapshot", "--", PY, "-c",
                        "open('train.py', 'w').write(\"print('v3')\\n\")")
        self.assertEqual(done.returncode, 0, done.stderr)
        (record,) = self.records()
        self.assertEqual(git(self.repo, "show", f"{record['commit']}:train.py"), "print('v2')")
        self.assertTrue(record["source_changed"])

    def test_a_commit_of_source_during_a_shared_run_is_flagged_but_a_commit_of_records_is_not(self):
        self.exp("run", "--name", "first", "--", PY, "-c", "pass")
        (first,) = self.records()
        run = self.start("second", 3)
        git(self.repo, "add", f"experiments/ledger/{first['id']}.json")  # what the loop asks for after every run
        git(self.repo, "commit", "-qm", "record first")
        self.assertEqual(run.wait(), 0)
        self.assertFalse([r for r in self.records() if r["name"] == "second"][0]["source_changed"])

        commit = ("import subprocess; open('train.py', 'a').write('# later\\n'); "
                  "subprocess.run(['git', 'commit', '-qam', 'mid-run'], check=True)")
        done = self.exp("run", "--name", "third", "--", PY, "-c", commit)
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertEqual(git(self.repo, "status", "--porcelain", "--", "train.py"), "")  # clean again, yet moved
        self.assertTrue([r for r in self.records() if r["name"] == "third"][0]["source_changed"])

    def test_a_submodule_bumped_during_a_shared_run_is_flagged_even_where_git_is_told_to_ignore_it(self):
        library = os.path.join(self._scratch.name, "library")
        new_repo(library, {"lib.py": "X = 1\n"})
        git(self.repo, "submodule", "add", "-q", library, "lib")
        git(self.repo, "config", "-f", ".gitmodules", "submodule.lib.ignore", "all")
        git(self.repo, "commit", "-qam", "add submodule")
        bump = ("import subprocess\n"
                "def git(*args, cwd='.'):\n"
                "    return subprocess.run(['git', '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', *args],"
                " cwd=cwd, check=True, capture_output=True, text=True).stdout.strip()\n"
                "open('lib/lib.py', 'w').write('X = 2\\n')\n"
                "git('commit', '-qam', 'two', cwd='lib')\n"
                "git('update-index', '--cacheinfo', '160000,' + git('rev-parse', 'HEAD', cwd='lib') + ',lib')\n"
                "git('commit', '-qm', 'bump lib')\n")
        done = self.exp("run", "--name", "bump", "--", PY, "-c", bump)
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertEqual(git(self.repo, "status", "--porcelain", "--ignore-submodules=none"), "?? experiments/")
        self.assertTrue(self.records()[0]["source_changed"])

    def test_git_inside_an_isolated_run_does_not_answer_for_the_launching_checkout(self):
        done = self.exp("run", "--name", "iso-git", "--isolate", "--", "git", "rev-parse", "HEAD")
        self.assertNotEqual(done.returncode, 0)
        self.assertIn("not a git repository", done.stderr.lower())
        self.assertEqual(self.records()[0]["status"], "failed")

    # --- the record --------------------------------------------------------------------------

    def test_failure_keeps_the_record_and_returns_the_exit_code(self):
        done = self.exp("run", "--name", "boom", "--", PY, "-c", "import sys; print('bad'); sys.exit(3)")
        self.assertEqual(done.returncode, 3)
        self.assertIn("bad", done.stderr)  # log tail is surfaced on failure
        (record,) = self.records()
        self.assertEqual((record["status"], record["exit_code"]), ("failed", 3))

    def test_run_directory_inside_the_repository_must_be_ignored(self):
        self.refused(self.exp("run", "--name", "leak", "--runs-dir", "outputs", "--", PY, "-c", "pass"), "not ignored")

    def test_an_ignored_ledger_is_refused(self):
        self.write(".gitignore", "runs/\nexperiments/\n")
        git(self.repo, "commit", "-qam", "ignore experiments")
        self.refused(self.exp("run", "--name", "x", "--", PY, "-c", "pass"), "ignored by Git")

    def test_records_do_not_make_the_next_run_dirty(self):
        for name in ("one", "two"):
            done = self.exp("run", "--name", name, "--", PY, "-c", "pass")
            self.assertEqual(done.returncode, 0, done.stderr)
        self.assertEqual([r["name"] for r in self.records()], ["one", "two"])

    def test_launches_in_the_same_second_get_distinct_ids(self):
        launches = [subprocess.Popen([PY, EXP, "run", "--name", "sweep", "--", PY, "-c", "pass"], cwd=self.repo,
                                     env=self.env, stdout=subprocess.PIPE, stderr=subprocess.PIPE) for _ in range(4)]
        self.assertEqual([launch.wait() for launch in launches], [0, 0, 0, 0])
        for launch in launches:
            launch.stdout.close()
            launch.stderr.close()
        records = self.records()
        self.assertEqual(len({r["id"] for r in records}), 4)
        self.assertEqual({r["status"] for r in records}, {"finished"})

    def test_a_verdict_given_while_the_run_is_alive_survives_its_end(self):
        for name, clean_the_tree in (("slow", False), ("cleaned", True)):
            run = self.start(name, 3)
            decided = self.exp("decide", name, "keep", "--note", "looks right", "--metric", "acc=0.5")
            self.assertEqual(decided.returncode, 0, decided.stderr)
            if clean_the_tree:  # the record file is gone when the run ends; the pinned verdict must still win
                git(self.repo, "clean", "-fdq")
            self.assertEqual(run.wait(), 0)
            record = [r for r in self.records() if r["name"] == name][0]
            self.assertEqual((record["status"], record["decision"], record["note"], record["metrics"]),
                             ("finished", "keep", "looks right", {"acc": 0.5}), name)

    def test_a_terminated_or_hung_up_run_is_recorded_as_interrupted(self):
        for name, signum in (("term", signal.SIGTERM), ("hup", signal.SIGHUP)):
            run = self.start(name, 60)
            run.send_signal(signum)
            self.assertEqual(run.wait(timeout=30), 128 + signum)
            record = [r for r in self.records() if r["name"] == name][0]
            self.assertEqual((record["status"], record["exit_code"]), ("interrupted", -signum), name)

    def test_a_signal_the_launcher_ignored_stays_ignored_for_the_wrapper_and_the_command(self):
        job = ("import json, os, signal, time; ignored = [int(signal.getsignal(getattr(signal, n)) == signal.SIG_IGN)"
               " for n in ('SIGHUP', 'SIGINT')]; json.dump({'hup': ignored[0], 'int': ignored[1]},"
               " open(os.path.join(os.environ['EXP_RUN_DIR'], 'metrics.json'), 'w')); time.sleep(3)")
        for name, signum in (("nohup", signal.SIGHUP), ("background", signal.SIGINT)):  # what nohup and `cmd &` do
            run = subprocess.Popen([PY, EXP, "run", "--name", name, "--", PY, "-c", job], cwd=self.repo, env=self.env,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                   preexec_fn=lambda: signal.signal(signum, signal.SIG_IGN))
            self.addCleanup(run.wait)
            self.addCleanup(run.kill)
            deadline = time.time() + 20
            while time.time() < deadline and not [r for r in self.records() if r["name"] == name]:
                time.sleep(0.1)
            run.send_signal(signum)
            self.assertEqual(run.wait(timeout=30), 0, name)
            record = [r for r in self.records() if r["name"] == name][0]
            self.assertEqual(record["status"], "finished", name)
            self.assertEqual(record["metrics"], {"hup": int(signum == signal.SIGHUP), "int": int(signum == signal.SIGINT)})

    def test_a_launch_stopped_while_it_is_being_set_up_leaves_nothing_behind(self):
        tools, probing = os.path.join(self._scratch.name, "bin"), os.path.join(self._scratch.name, "probing")
        os.makedirs(tools)
        with open(os.path.join(tools, "nvidia-smi"), "w") as stream:  # setup waits here, the run id already claimed
            stream.write(f"#!/bin/sh\ntouch '{probing}'\nexec sleep 15\n")
        os.chmod(os.path.join(tools, "nvidia-smi"), 0o755)
        env = dict(self.env, PATH=tools + os.pathsep + self.env["PATH"])
        for signum in (signal.SIGTERM, signal.SIGHUP, signal.SIGINT):
            run = subprocess.Popen([PY, EXP, "run", "--name", "early", "--", PY, "-c", "pass"], cwd=self.repo,
                                   env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self.addCleanup(run.wait)
            self.addCleanup(run.kill)
            deadline = time.time() + 20
            while time.time() < deadline and not os.path.exists(probing):
                time.sleep(0.05)
            self.assertTrue(os.path.exists(probing))
            run.send_signal(signum)
            self.assertEqual(run.wait(timeout=30), 128 + signum)
            self.nothing_left()
            os.unlink(probing)

    def test_a_signal_that_arrives_while_the_command_starts_still_reaches_it(self):
        exp, job = load_exp(), [PY, "-c", "import time; time.sleep(5)"]
        real, here = subprocess.Popen, os.getcwd()
        handlers = {signum: signal.getsignal(signum) for signum in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP)}

        def slow_start(command, *args, **kwargs):
            if command == job:  # the wrapper has not been handed its process yet
                os.kill(os.getpid(), signal.SIGTERM)
            return real(command, *args, **kwargs)

        os.chdir(self.repo)
        subprocess.Popen = slow_start
        try:
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                code = exp.main(["run", "--name", "starting", "--", *job])
        finally:
            subprocess.Popen = real
            os.chdir(here)
            for signum, handler in handlers.items():
                signal.signal(signum, handler)
        self.assertEqual(code, 128 + signal.SIGTERM)
        (record,) = self.records()
        self.assertEqual((record["status"], record["exit_code"]), ("interrupted", -signal.SIGTERM))

    def test_a_failed_launch_leaves_no_claimed_run_id_behind(self):
        done = self.exp("run", "--name", "nodir", "--runs-dir", "/dev/null/runs", "--", PY, "-c", "pass")
        self.assertNotEqual(done.returncode, 0)
        self.assertEqual(os.listdir(os.path.join(self.repo, "experiments", "ledger")), [])
        self.assertEqual(self.records(), [])

    def test_a_filesystem_that_refuses_flock_does_not_stop_the_ledger(self):
        import fcntl
        exp, real = load_exp(), fcntl.flock

        def refuse(*_args):
            raise OSError(38, "Function not implemented")

        fcntl.flock = refuse
        try:
            with exp.locked(self.repo):
                entered = True
        finally:
            fcntl.flock = real
        self.assertTrue(entered)

    def test_record_changes_wait_for_each_other(self):
        import fcntl
        self.exp("run", "--name", "one", "--", PY, "-c", "pass")
        with open(os.path.join(self.repo, ".git", "exp.lock"), "w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)  # another process is in the middle of changing a record
            decide = subprocess.Popen([PY, EXP, "decide", "one", "keep"], cwd=self.repo, env=self.env,
                                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(2)
            self.assertIsNone(decide.poll())
            self.assertIsNone(self.records()[0]["decision"])
        self.assertEqual(decide.wait(timeout=30), 0)
        self.assertEqual(self.records()[0]["decision"], "keep")

    def test_tee_into_a_closed_pipe_still_closes_the_record(self):
        noisy = "import sys\nfor i in range(20000): print('line', i)"
        subprocess.run(f"{PY} {EXP} run --name pipe --tee -- {PY} -c \"{noisy}\" | head -1", shell=True,
                       cwd=self.repo, env=self.env, capture_output=True)
        (record,) = self.records()
        self.assertEqual((record["status"], record["exit_code"]), ("finished", 0))
        with open(os.path.join(record["run_dir"], "log.txt")) as stream:
            self.assertEqual(len(stream.read().splitlines()), 20000)  # the log is complete even though the reader left

    def test_records_survive_cleaning_the_working_tree_and_sync_restores_them(self):
        self.exp("run", "--name", "kept", "--", PY, "-c", REPORT)
        self.exp("decide", "kept", "keep", "--note", "worth it")
        (before,) = self.records()
        path = os.path.join(self.repo, "experiments", "ledger", before["id"] + ".json")
        git(self.repo, "clean", "-fdq")  # what a careless discard does
        self.assertFalse(os.path.exists(path))
        listing = self.exp("ls")
        self.assertIn("worth it", listing.stdout)
        self.assertIn("exp.py sync", listing.stderr)
        self.assertEqual(self.records(), [before])
        self.assertEqual(self.exp("sync").returncode, 0)
        with open(path) as stream:
            self.assertEqual(json.load(stream), before)
        self.assertEqual(self.exp("ls").stderr, "")

    def test_record_pins_stay_local_so_pushing_the_executed_commits_keeps_working(self):
        remote = os.path.join(self._scratch.name, "remote.git")
        subprocess.run(["git", "init", "-q", "--bare", remote], check=True)
        self.exp("run", "--name", "shared", "--", PY, "-c", "pass")
        (record,) = self.records()
        self.assertEqual(git(self.repo, "for-each-ref", "--format=%(refname)", "refs/exp"), f"refs/exp/{record['id']}")
        git(self.repo, "push", "-q", remote, "refs/exp/*:refs/exp/*")
        self.exp("decide", "shared", "keep")  # rewrites the record and its pinned copy
        self.exp("run", "--name", "second", "--", PY, "-c", "pass")
        git(self.repo, "push", "-q", remote, "refs/exp/*:refs/exp/*")  # raises if any ref is rejected
        self.assertEqual(len(git(remote, "for-each-ref", "refs/exp").splitlines()), 2)
        self.assertEqual(git(remote, "for-each-ref", "refs/exp-records"), "")

    def test_a_run_of_another_branch_is_listed_but_its_file_is_not_written_here(self):
        git(self.repo, "checkout", "-q", "-b", "exp/a")
        self.exp("run", "--name", "on-a", "--", PY, "-c", "pass")
        (record,) = self.records()
        relative = f"experiments/ledger/{record['id']}.json"
        git(self.repo, "add", relative)
        git(self.repo, "commit", "-qm", "record on-a")
        git(self.repo, "checkout", "-q", "-b", "exp/b", "main")
        self.assertFalse(os.path.exists(os.path.join(self.repo, relative)))

        listing = self.exp("ls")
        self.assertIn(record["id"], listing.stdout)
        self.assertIn("other branches", listing.stderr)
        self.assertNotIn("exp.py sync", listing.stderr)
        self.assertIn("wrote 0 record", self.exp("sync").stdout)
        decided = self.exp("decide", "on-a", "discard", "--note", "judged from b")
        self.assertIn("belongs to branch exp/a", decided.stderr)
        self.assertEqual(git(self.repo, "status", "--porcelain"), "")  # nothing was written on exp/b

        git(self.repo, "checkout", "-q", "exp/a")  # would fail on an untracked copy of the record
        self.assertIn("exp.py sync", self.exp("ls").stderr)
        self.exp("sync")
        with open(os.path.join(self.repo, relative)) as stream:
            self.assertEqual(json.load(stream)["note"], "judged from b")

        git(self.repo, "checkout", "-q", "--", relative)
        git(self.repo, "checkout", "-q", "exp/b")
        self.assertIn("wrote 1 record", self.exp("sync", "on-a").stdout)  # a named run is written anywhere
        self.assertTrue(os.path.exists(os.path.join(self.repo, relative)))

    def test_a_run_that_ends_on_another_branch_writes_no_record_file_there(self):
        git(self.repo, "checkout", "-q", "-b", "exp/a")
        run = self.start("long", 3, "--isolate")
        (record,) = self.records()
        relative = f"experiments/ledger/{record['id']}.json"
        git(self.repo, "add", relative)
        git(self.repo, "commit", "-qm", "record the running run")
        git(self.repo, "checkout", "-q", "main")  # the run is still alive in its exported copy
        self.assertEqual(run.wait(), 0)
        self.assertEqual(git(self.repo, "status", "--porcelain"), "")
        self.assertEqual(self.records()[0]["status"], "finished")  # known from the pinned copy
        git(self.repo, "checkout", "-q", "exp/a")  # would be refused if main held an untracked copy
        self.assertIn("exp.py sync", self.exp("ls").stderr)
        self.exp("sync")
        with open(os.path.join(self.repo, relative)) as stream:
            self.assertEqual(json.load(stream)["status"], "finished")

    def test_an_unreadable_record_does_not_break_the_ledger(self):
        self.exp("run", "--name", "good", "--", PY, "-c", "pass")
        self.write(os.path.join("experiments", "ledger", "broken.json"), "{ not json")
        listing = self.exp("ls")
        self.assertEqual(listing.returncode, 0, listing.stderr)
        self.assertIn("skipped unreadable record broken.json", listing.stderr)
        self.assertEqual([r["name"] for r in self.records()], ["good"])

    def test_decide_ls_and_diff(self):
        self.exp("run", "--name", "a", "--", PY, "-c", REPORT)
        self.write("train.py", "print('v2')\n")
        git(self.repo, "commit", "-qam", "v2")
        self.exp("run", "--name", "b", "--", PY, "-c", "pass")
        done = self.exp("decide", self.records()[1]["id"][-9:], "keep", "--note", "better", "--metric", "acc=0.95")
        self.assertEqual(done.returncode, 0, done.stderr)
        first, second = self.records()
        self.assertEqual((second["decision"], second["note"], second["metrics"]), ("keep", "better", {"acc": 0.95}))
        listing = self.exp("ls").stdout
        self.assertIn("keep", listing)
        self.assertIn("acc=0.95", listing)
        diff = self.exp("diff", first["id"], second["id"]).stdout
        self.assertIn("train.py", diff)
        self.assertIn("acc\t0.9\t0.95", diff)


if __name__ == "__main__":
    unittest.main()
