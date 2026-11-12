# Run ledger

`scripts/exp.py` binds every run to the exact commit it executed and leaves one
small JSON record in the repository. It needs only Git and Python 3.8+, so the
same commands work from any agent and on any server. It records runs; it does
not schedule them, and it does not replace a tracker's curves.

## The loop

1. Work on a branch named `exp/<topic>`. Before the first run, write down the
   hypothesis and the metric that decides it: in the experiment Issue when one
   exists, otherwise in the branch's first commit message.
2. Change one thing.
3. Launch through the ledger:

   ```sh
   python3 <skill>/scripts/exp.py run --name <slug> -- <command>
   ```

   A committed tree runs as that commit. For a quick trial of uncommitted work
   add `--snapshot`: the run is bound to a snapshot commit of the working tree,
   untracked files included, and the branch, index and files are left alone.
4. Read the result with `exp.py ls`, `exp.py show <run>` or
   `exp.py diff <run-a> <run-b>`. The output is in the run's `log.txt`; search
   or tail it instead of streaming it into the conversation.
5. Record the verdict:

   ```sh
   python3 <skill>/scripts/exp.py decide <run> keep|discard --note "<what was learned>"
   ```

   Keep: commit the change if it was a snapshot trial. Discard: put back the
   files you changed with `git restore -- <paths>` and delete the files you
   added. Crashed, interrupted and negative runs stay in the ledger; they are
   results.
6. Commit the new files under `experiments/ledger/` with your next commit.

Report a number only from a run whose commit is on a pushed branch; rerun a
snapshot trial from the committed tree before citing it.

## What a run gets and leaves

- Environment: `EXP_RUN_ID`, `EXP_RUN_DIR`, `EXP_COMMIT`. Write checkpoints and
  outputs under `EXP_RUN_DIR`. Write final numbers to
  `$EXP_RUN_DIR/metrics.json` as one flat JSON object; they are copied into the
  record. A tracker run URL can go in the same file.
- Record: `experiments/ledger/<run-id>.json` with commit, branch, command,
  working directory, times, exit code, host, GPUs, metrics, tags, verdict and
  note. One file per run, so runs made on different branches or machines
  merge without conflict. The record holds the command line as typed: pass
  secrets through the environment.
- A copy of each record is pinned inside this clone under
  `refs/exp-records/<run-id>`. A `git clean`, `git stash -u` or
  `git reset --hard` can remove the file but not the copy: `exp.py ls` still
  shows the run, and `exp.py sync` writes the files back. The copies are local
  and are not pushed; records reach other clones as committed files.
- `exp.py ls` lists every run this clone has made, on any branch. A record
  file belongs to the branch the run was launched from, so commit it there.
  `exp.py sync` writes back only that branch's files, and `exp.py sync <run>`
  writes a named run wherever you are; use the second form after a branch was
  renamed and for runs made on a detached HEAD. A verdict given, or a run
  that ends, while another branch is checked out updates the record file only
  where that branch already holds a copy; otherwise it is saved in the clone
  and enters the file at the next `sync` on its own branch. If Git cannot
  store that copy, the file is written where you are instead: move it to
  its branch and commit it there.
- Pinned source: `refs/exp/<run-id>` points at the executed commit, so a reset,
  rebase or deleted branch cannot lose the code behind a result.
- `git push <remote> 'refs/exp/*:refs/exp/*'` shares the pinned commits and
  snapshots, and the same refspec fetches them. A snapshot contains every
  file Git does not ignore, so push these refs only to a remote where that
  source may go.
- To drop a run for good, delete its record file and both references:
  `git update-ref -d refs/exp-records/<run-id>` and
  `git update-ref -d refs/exp/<run-id>`.

## What it refuses, and why

A run is refused, before anything executes, when its source could not be
recovered from the recorded commit:

- uncommitted changes without `--snapshot`;
- files hidden from Git with skip-worktree or assume-unchanged, which rules
  out a sparse checkout;
- with `--snapshot`: a submodule with uncommitted changes, a nested repository
  Git does not track, or untracked files named like secrets (`.env`, `*.pem`,
  `*.key`, `credentials*`); ignore or commit them first;
- a ledger directory that `.gitignore` covers, or a run directory inside the
  repository that it does not.

A run that shares the checkout is only as fixed as the checkout stays. At
launch and at exit the wrapper compares the committed files outside the
ledger and the size and modification time of every uncommitted file, so
committing records while a run is alive changes nothing. When they differ the
record says
`"source_changed": true`, and the result needs a rerun before it is cited. An
edit made and undone in between is not seen: use `--isolate` when the checkout
will not stand still.

## Placement and long runs

- Run directories default to `<repo>/runs/`, which must be in `.gitignore`.
  Set `EXP_RUNS_DIR` to host-local or data-disk storage when the repository is
  in synchronized storage or the outputs are large. A run directory is
  evidence: put it where routine cleanup of scratch space does not reach.
- For a long or detached run, start the same `exp.py run` command inside
  `tmux`, `nohup` or the batch script: the wrapper is the job, and it records
  the exit status when the job ends. An interrupt, a termination or a closed
  terminal is passed on to the command and recorded as `interrupted`; one
  that arrives before the record is written undoes the launch and leaves no
  record. A signal the launcher had ignored, as `nohup` does with a hangup,
  stays ignored for the wrapper and the command. A record
  still marked `running` after its process is gone means the wrapper was
  killed outright; decide it as a discard and say why.
- Add `--isolate` when you will keep editing while the run is alive. The
  command then executes in a plain exported copy of the commit under the run
  directory; no worktree is registered, so this is safe in a synchronized
  checkout. Use relative paths in the command, pass absolute paths for ignored
  files such as local datasets, and note that a repository with submodules
  cannot be isolated this way. Git finds no repository inside the copy: code
  that stamps its results with a commit reads `EXP_COMMIT`.
- A sweep is one `exp.py run` per configuration from the same commit, told
  apart by arguments and `--tag key=value`. Launches with the same name in the
  same second get a numeric suffix.
- When runs happen on machines that do not have this Skill installed, copy
  `scripts/exp.py` into the project (for example `tools/exp.py`) and commit
  it; the file has no dependencies.

## With a tracker and with formal studies

Weights & Biases, MLflow, ClearML or TensorBoard stay optional and unchanged:
name the tracker run with `EXP_RUN_ID` so both sides share one identity.

When a result will be claimed, compared across methods or reported, continue
with the repository-research route. Its study and batch records cite run ids
from this ledger; do not copy run data into a second place.
