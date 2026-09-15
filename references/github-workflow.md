# Required GitHub research workflow

GitHub is the mandatory collaboration surface for repository-based scientific
work managed by this Skill. No additional tracking SaaS is required. The native
executor and artifact store remain the authorities for job and evidence state.
Read with [research management](research-management.md); use the
[record templates](research-records.md) when equivalent records do not exist.
For multiple participants or shared automation, read
[collaboration](collaboration.md) before assignment or dispatch: assignees are
not locks, reviews bind exact revisions, and owner changes require reconciliation.

## Contents

1. Bind the repository and operation scope
2. Map research work to GitHub
3. Bootstrap and move through a research cycle
4. Pin source and handle code evolution
5. Automate without duplicating execution state
6. Reconcile, retain and recover

## 1. Bind the repository and operation scope

Resolve the exact source top-level, remote host/owner/repository, immutable
repository ID, visibility and authenticated access. Do not infer ownership from
the current login, a local folder or a guessed repository name. Resolve forks
and multiple remotes explicitly: the collaboration repository, execution source
repository and PR base/head may differ; record each exact role. Verify redirects
and repository transfers instead of silently changing the authorized target.

Use `gh` or an available native GitHub connector; check its installed capabilities
and permissions before choosing commands. An unavailable optional Projects field
or sub-issue operation can use explicit links/labels. Missing access to the exact
repository is a real dependent-work blocker, not permission to substitute a
local-only research lifecycle or a different repository.

### Prepare each actual execution environment

For shell-based management hosts, use installed Git and `gh` as the standard
interface and require working authentication before GitHub-dependent operations.
Verify the actual OS user, shell/container and GitHub host used by the agent;
a browser login or another machine's working CLI is not this environment's
authentication. Agents sharing an OS user/configuration may reuse it. Windows,
WSL, containers, remote SSH sessions and CI can have different executable paths
and credential contexts; do not assume one login covers all of them.

| Role | Required readiness |
| --- | --- |
| Management host | Git/gh callable by the agent; authenticated intended identity; exact repository access; permissions for planned operations |
| Compute-only node | Verified source/input delivery and receipt/return path to the management host; GitHub login not required if it performs no GitHub operations |
| Node that independently manages GitHub | Same checks as a management host, in its actual execution user/session |
| CI / headless automation | Noninteractive scoped token or app identity supplied by its secret mechanism; declared workflow permissions |
| Connector-only host | Verified native connector with equivalent exact-repository operations; missing required operations block that branch of work |

On a management host, inspect command availability/version, then use:

```sh
gh auth status --active --hostname github.com
gh api --hostname github.com --method GET repos/OWNER/REPO
```

Replace the host and repository with the verified target. Use the installed
CLI's supported flags. Never use `--show-token` or persist raw authentication
output. `gh auth status --json` can exit zero despite authentication errors;
inspect its fields if using JSON, rather than treating exit zero as success.
Record a redacted readiness result: environment role, tool versions, GitHub
identity/host, repository ID, required operations, verified/unknown permissions
and check time. A read API success does not prove Issues/PR/Actions/Projects
write permissions or human authorization; check each operation when needed.

Reuse valid credentials. If authentication is missing, an authorized interactive
setup can use `gh auth login --hostname github.com`; headless environments use
the existing secure token mechanism instead of waiting for a browser prompt.
API authentication and Git transport authentication are separate: verify the
chosen SSH or HTTPS transport too. `gh auth setup-git --hostname github.com`
configures the CLI as Git's credential helper when that is the intended HTTPS
setup; do not overwrite a working SSH/credential configuration by default.
Never copy a personal token onto every compute node or place it in the Skill,
repository, manifests or logs. Environment setup is complete only after a real
exact-target operation verifies readiness; missing credentials block dependent
work, not independent local planning. See the official
[status](https://cli.github.com/manual/gh_auth_status),
[login](https://cli.github.com/manual/gh_auth_login) and
[Git setup](https://cli.github.com/manual/gh_auth_setup-git) contracts.

The bundled `scripts/github-context.mjs` offers a read-only identity check for
the common single-repository, `origin` case. Its command/output contract is in
[README](../README.md). More complex fork/remote mappings use explicit native
inspection with equivalent evidence. A successful identity check proves neither
source retention, scientific validity, write permission nor launch authority.

Before external writes bind permitted repository/actions, source versus results
visibility, report payload classification and compute limits where applicable.
Reuse that authorization throughout the declared scope. Do not ask permission
for every authorized comment/update; do not infer push, merge, Release or private
data disclosure merely from mandatory GitHub usage. If authority is missing,
prepare concrete drafts and continue independent read-only work.

Before a new research launch require verified repository binding, an existing
goal and experiment Issue, a milestone acceptance-criteria reference, a frozen study
revision accessible through GitHub, and a verified retained source snapshot.
The same contract covers research dev runs with proportional record detail.
Pure planning may prepare these records without launching. Historical evidence
is linked as legacy until its provenance is established, not backdated as a
newly registered experiment. GitHub must not receive secrets or unauthorized
private payloads; use permitted summaries and durable evidence locators.

## 2. Map research work to GitHub

| GitHub mechanism | Research purpose | Important limit |
| --- | --- | --- |
| Goal Issue | Goal, non-goals, milestone map and current decision | One discoverable entrypoint; historical decisions remain linked |
| Milestone + acceptance Issue/record | Group work toward one measurable decision/capability | Native closed-Issue percentage is not evidence acceptance |
| Experiment Issue | One coherent study/comparison campaign, including batches | Link trials and attempts; do not create an Issue per seed/run |
| Sub-issues | Independently owned subquestions, implementation and problems | A planning hierarchy does not encode all artifact dependencies |
| Issue dependencies | Blocking prerequisites and explicit unblock conditions | Absence of a link does not prove readiness; avoid cycles |
| Labels / issue types | Small stable vocabulary for experiments, bugs, decisions and blockers | Use types only when supported; keep high-cardinality run IDs out of labels |
| Branch / PR | Isolated implementation or protocol change and its review | Not a scientific hypothesis ID or a per-configuration container |
| Checks / Actions | Engineering/dev validation, verified summaries and authorized dispatch | Green CI is not milestone acceptance or proof a remote job stopped |
| Projects | Optional filtered views across milestones, work and blockers | Rebuildable planning view; not a second run database |
| Release / tag | Optional reviewed deliverable snapshot | Tag names and expiring artifacts alone are not immutable archives |

A native milestone groups Issues/PRs within a repository; use acceptance Issues
and explicit cross-repository links when a goal spans repositories. An Issue
has one primary milestone assignment; secondary contributions use links, not
duplicate experiments. Keep the hierarchy shallow enough to navigate. Begin
with Issues and Milestones; add Projects only if its views reduce real navigation
work. Do not require an organization plan or unsupported fields to start.

At bootstrap record one authoritative acceptance-record URL per milestone in
the goal Issue and milestone description. By default use an acceptance Issue
linking versioned criteria and decision evidence; reuse an equivalent existing
versioned record instead of mirroring it. For a cross-repository milestone,
place this coordinating record in the goal's declared tracking repository and
link remote Issues/PRs explicitly. Never create a native cross-repository
Milestone or interpret its open/closed state as the evidence verdict.

## 3. Bootstrap and move through a research cycle

1. **Inspect.** Locate existing goal/milestone/study records using bounded exact
   repository queries. Record pagination/filters and distinguish uninspected
   records from absence. Reuse equivalent structures; never bulk-reorganize an
   active repository merely to match a template.
2. **Register.** Under write authority create/link the goal, milestones and their
   acceptance records. Commit the small scientific contracts and configs through
   the project's reviewed Git workflow. Record GitHub IDs/URLs plus exact
   contract revision/digest; editable Issue prose is a navigation/decision view,
   not the only frozen scientific commitment.
3. **Prepare an experiment.** Link the hypothesis, milestone, comparison basis,
   required coverage, resource/stop policy and prior decision. Reuse an existing
   experiment Issue for another bounded batch answering the same question.
   Create a new linked study revision for scientifically material amendments.
4. **Implement and validate.** Link code/config PRs to the experiment and relevant
   bugs. State changed scientific factors, affected stages, applicable dev
   evidence and expected rerun/reuse scope. Validate the actual checkout, not a
   branch label. Ordinary CI runs within its own scope; expensive compute needs
   the study's explicit dispatch and resource contract.
5. **Launch and observe.** Persist intent and bind provider job identities before
   any summary claims running. Post one bounded batch summary with an exact
   manifest/record pointer. Let the native monitor observe jobs; update GitHub
   at declared significant events and freshness intervals, not each log line.
6. **Review evidence.** Post comparable results with denominator, uncertainty,
   missing/pruned/failed rows, validity and limitations. Append the decision and
   next action; link independent problems and candidate PRs when useful. A
   results-only update need not create a code PR, and a code PR need not wait for
   unrelated research to finish unless the project requires that evidence.
7. **Accept or amend.** Verify the milestone criteria and artifact/analysis/
   retention closures. Attach the immutable decision evidence, then update
   acceptance status and close the relevant work within authority. A merged
   implementation PR should auto-close only its actual implementation task;
   do not use closing keywords to inadvertently close the research goal or an
   experiment that still needs evidence.

For each snapshot/summary link both directions: GitHub points to exact evidence;
run/study records carry repository ID, goal/milestone/experiment references and
the frozen contract version. Use immutable references for decisions and input
identities. A latest-status comment may be updated as a rebuildable summary,
but preserve the underlying append-only decisions and earlier evidence versions.

## 4. Pin source and handle code evolution

Capture source repository and actual commit/tree, relevant submodule/dependency
identities, complete effective config, data/model/evaluator versions and semantic
environment. Branch names and mutable artifact aliases are context only. Keep
runtime work isolated from worktrees under active editing.

For PR execution record head/base repositories and SHAs, actual checkout SHA
and workflow revision. `pull_request` may run a synthetic merge commit rather
than the candidate head. After squash/rebase/merge, relate old and new snapshots;
do not relabel old experimental results as runs of the new commit. Establish
stage equivalence before reuse. A new integration can require targeted tests
even when both parent branches passed independently.

A clean committed snapshot is the default and is required by the v1 helper.
Project-native tracking can preserve a complete immutable workspace snapshot
including uncommitted inputs if its byte recovery is verified. A dirty flag or
patch digest alone is insufficient. This avoids forcing an ordinary branch or
commit for every configuration trial while preserving executed code. Missing
remote source commits need an authorized push or another verified archive and
explicit GitHub provenance link before launch; never silently launch from
unretained code. Retain snapshots independently of branch deletion or Git GC.

## 5. Automate without duplicating execution state

Use existing GitHub workflows and the project's executor. Add an adapter only
for a verified gap and implement only the missing operation. Do not install a
custom scheduler, polling daemon, or mirrored job database as part of this Skill.

| Event | Expected operation |
| --- | --- |
| PR change | Scoped tests, contract/config validation, impact/reuse summary |
| Authorized batch dispatch | Validate frozen study/source and remaining budget; submit once; bind native job |
| Batch progress/terminal event | Verify receipt/coverage; update one current summary; append material decision/incident |
| Integrity fault | Native invalidation/stop first; mark affected evidence and acceptance in GitHub |
| Session/controller recovery | Reconcile provider and evidence state before dispatch or status correction |
| Milestone closure request | Check immutable acceptance evidence, not Issue count or CI green alone |

Persist intent with a stable operation key before remote effects in the existing
provider/record facility. For GitHub summary writes include a stable marker such
as `study ID + revision + summary role`; locate existing objects before creating
replacements. After an ambiguous timeout, reconcile the exact object/operation
before retry. Serialize per-object writers through the existing workflow or use
the backend's concurrency controls. Markers and search alone do not prevent
simultaneous duplicate creates; do not claim exactly-once effects.

Treat event payloads as notifications. Verify their repository, immutable source,
study/attempt identity and current authoritative state; deduplicate and reject
stale updates. Preserve Github workflow `run_id`, `run_attempt` and job identity
when used; retries are distinct physical attempts even when GitHub reuses a
workflow run ID. Cancelling Actions must propagate to the exact remote provider
jobs and confirm terminal state/resource release. Actions concurrency settings
alone do not cancel detached SSH/GPU jobs.

Pin executable workflow dependencies appropriately, pass untrusted strings as
data rather than shell code, and use least-scoped tokens. Do not run untrusted PR
code with privileged credentials or automatically place it on persistent GPU
runners. Never use `pull_request_target` plus untrusted checkout as a shortcut
for dispatch permissions. Store credentials outside source, reports and inputs.
Scientific approval and fork trust are independent checks.

## 6. Reconcile, retain and recover

For server directory roles, portable evidence locators, execution-to-Issue links
and scoped discrepancy handling, apply [storage alignment](storage-layout.md).

GitHub holds small contracts, configs, decision evidence and searchable links.
Raw datasets, predictions, checkpoints and full retained logs stay in the declared
durable store. References need immutable versions/digests and verified accessible
bytes. Actions artifacts have expiry/deletion behavior and are a transfer or
convenience copy unless an explicitly verified archive contract covers them.

Declare synchronization ownership and a freshness limit before unattended work.
GitHub outages do not erase existing authorization: already approved frozen work
may continue only under its independent native monitor, resource and retention
contract. Preserve pending reports in existing durable records and show the last
verified synchronization time. No new unregistered studies, scientific amendments
or closure decisions may silently bypass required GitHub binding. Native retries
within an already registered policy remain subject to its budget and idempotency.
Reconcile after recovery; do not resubmit compute to repair a reporting failure.

Closure requires current GitHub links/summaries, exact study and milestone
decisions, valid retained evidence and explicit remaining gaps. If writeback is
blocked, distinguish scientific execution completion from incomplete lifecycle
synchronization. Publication has its own exact-target authority. Later corrections
retain prior reports and visibly retract affected current conclusions.
