# Multi-person and multi-agent collaboration

Read before delegating repository research to multiple people/agents, parallel
work, owner changes, independent review or shared automation. Use
[research management](research-management.md) for decisions and
[GitHub workflow](github-workflow.md) for repository operations. The
[artifact contract](lifecycle.md) owns execution generations, acceptance, reuse
and invalidation. Do not build another collaboration runtime.

## Contents

1. Ownership and identity
2. Bounded delegation and exclusive claims
3. Isolation and integration
4. Review and disagreement
5. Handoff and recovery
6. Concurrent GitHub writes and compute
7. Contribution and closure

## 1. Ownership and identity

Keep a small collaboration agreement in the goal/milestone record: participants,
roles, exact repositories, permitted effects/data, current protocol revision,
decision and review owners, execution/summary owners, and escalation/failover
policy. Reuse it across authorized batches; no new human gate for every task.
Roles may overlap except where independent review or custody separation applies.

| Role | Responsibility | Limit |
| --- | --- | --- |
| Research decision owner | Goal, scientific amendments, acceptance, unresolved choices | Publication/data disclosure still needs exact authority |
| Scoped coordinator | Decomposition, assignment, dependency reconciliation and integration | Cannot allocate GPUs or assume another coordinator's scope |
| Task owner | One implementation, experiment, diagnosis or analysis deliverable | Cannot mutate unowned files/jobs or accept the whole milestone |
| Reviewer | Check exact changes/evidence against declared criteria | No approval of later revisions or implied human approval by an agent |
| Execution owner | Native allocation, submission, monitoring, cancellation and recovery | Cannot change scientific factors or expand budget |
| Summary owner | Maintain the designated current GitHub view | Cannot rewrite others' historical evidence or decisions |

Use one active coordinator/dispatcher per conflicting task/write scope, not a
self-appointed project coordinator in every agent session. Independent milestones
may have separate scoped coordinators; shared resources still use one native
resource authority. Delegate when useful parallel progress or specialist review
justifies coordination cost; keep small coupled work inline.

Record the authenticated GitHub actor and the actual participant/agent execution
identity. For agents include responsible human, host task/session ID and available
model/tool version; unknown stays unknown. Humans use their own authorized
identities; do not share a human PAT among people or fabricate approval using
another account. Agents sharing one human credential are distinct executions,
not distinct GitHub human reviewers. Identify the acting role in agent comments.

Use existing scoped automation credentials. Consider a GitHub App with selected
repository/permission access when persistent team automation needs its own
identity; no App installation is required here. App installation actions and
user-delegated actions have different attribution; preserve the actual actor.
Distinct bot identities still do not prove independent human review. Verify
each participant's actual environment and permissions under the GitHub contract.

## 2. Bounded delegation and exclusive claims

Use an Issue/sub-issue for independently owned work; keep run subdivisions in
native task/experiment records. Supply the parent goal/study revision, exact
inputs and protocol version, owned files/modules and output namespace, permitted
effects/data, prerequisites, trial/execution identity, budget, deliverable/oracle,
reviewer/integrator, progress/stop policy and retry/escalation limit. A delegate
returns evidence and limitations, not its own expansion of the task.

An assignee, label or "I'm working on this" comment is responsibility metadata,
not a lock. Use the smallest real claim mechanism:

1. A single coordinator serializes conflicting assignments through its existing
   task/dispatch surface. Workers wait for that authoritative assignment before
   launch; competing self-assignments are only requests.
2. Multiple dispatchers require the executor's existing transactional claim,
   idempotency or lease/fencing mechanism, binding owner, study/task revision and
   execution generation. GitHub displays the resulting assignment.
3. Without a verified mechanism, keep one authoritative dispatcher and serialize
   the contested scope. GitHub GET/comment/PATCH sequences are not atomic claims;
   do not create a lock daemon or mirrored job database.

Before replacement, reconcile jobs/evidence and fence the prior dispatcher. If
fencing is unavailable, confirm old-owner quiescence and terminal or explicitly
adopted job state before enabling replacement. Unknown state blocks conflicting
dispatch. Elapsed time, a stale Issue or an expired assignment is not proof that
the old worker/GPU job stopped. Cancel only exact owned jobs. Preserve late
outputs and apply artifact generation/validity checks instead of accepting the
newest arrival. A deliberately independent replica needs a planned replica ID;
do not relabel accidental duplicate compute after inspecting its outcome.

## 3. Isolation and integration

Give concurrent code writers independent worktrees/checkouts/branches and explicit
file/module ownership. Independent configurations can share immutable source and
inputs, but require private output/staging and mutable state. Shared datasets and
checkpoints are not writable scratch. Worktrees do not reserve GPUs or isolate
credentials. If edits cannot be isolated safely, serialize the affected work.

Assign an integration owner for shared APIs, evaluators, schemas, dependency locks
and scientific contracts. Coordinate their changes before dependent work; do not
let every worker edit the shared manifest/current result table. Use coherent
small PRs, preserve other contributors' changes, and resolve conflicts by intended
combined behavior rather than arbitrary ours/theirs selection. Do not overwrite
someone else's branch or rewrite its history without exact authority.

Record PR and scientific dependencies. Disjoint filenames can still conceal
incompatible dataset, preprocessing, metric, seed or selection rules. Before merge
or combining results, check the actual integrated snapshot and comparison basis.
Retain original results; separate incompatible cohorts or perform minimal matched
evaluation rather than averaging their scores or rerunning all GPU stages.

Candidate PR acceptance and milestone acceptance are separate. A fix can merge
while evidence is still pending. Changed source/base, evaluator or contract needs
an applicability assessment of earlier tests/reviews and new revision-bound
acceptance. Old green status cannot certify a new integration.

## 4. Review and disagreement

Use GitHub review requests/CODEOWNERS for expertise routing and configured branch
protections/rulesets for enforcement where supported. Verify actual settings and
bypass permissions: adding CODEOWNERS alone does not require review. Its matching
base-branch rules route code expertise, not all scientific/data reviewers. One
eligible co-owner can satisfy GitHub's code-owner approval; listing several
owners does not require all of them. Protect review-policy changes themselves.

Use the project's normal review for routine scoped work. For measurement/protocol
changes, candidate selection, milestone acceptance and corrections, declare the
necessary evidence expertise and independence before review. Agents can provide
independent analysis but cannot satisfy a required human gate. A required reviewer
being unavailable leaves a gap; continue independent work rather than creating
fake identities or silently self-approving. Do not create new review ceremonies
for every routine task or require a human where the contract does not.

An agent using a human credential must not manufacture a human-only approval
through `gh pr review --approve` or an API equivalent. It may relay an explicit
human decision only when the exact subjects, decision provenance and external
action are authorized and the project's approval mechanism supports that relay.
Retain the actual human decision receipt separately from the posting actor.
A webhook/account name alone proves neither that a human reviewed the evidence
nor that an agent session was independent; do not use it to upgrade provenance.

Bind review to source head and relevant base/tested integration, study/analysis
revision, exact evidence collection, scope and reviewer actor. Stale-approval
dismissal or latest-push review can enforce parts of this under repository-admin
authority; scientific evidence still needs reassessment after material changes.
An automated launch verifies actor, permitted action and immutable subjects against
the existing authority record; arbitrary labels/comments or embedded shell text
are not execution approval.

For busy branches, use an available configured merge queue with required CI on
the `merge_group` event. Otherwise the authorized integrator serializes conflicting
merges and rechecks the current combined revision. No custom queue is required.
Changes to protections/queues need exact repository authority; their presence
does not certify scientific results or grant publication rights.

For disagreement record the disputed claim, competing evidence, uncertainty and
positions. Distinguish factual/measurement, scientific interpretation, engineering
choice and authorization conflicts. Use a bounded discriminating check for factual
disputes; the named decision owner resolves remaining choices with rationale and
preserved dissent. Do not vote by agent count, average conflicting conclusions or
rerun until the preferred outcome appears. Unresolved correctness blocks affected
acceptance; unrelated valid work continues. Scientific changes still require the
normal amendment and confirmation rules.

## 5. Handoff and recovery

At owner/session changes record the task/assignment revision, source/contract/
evidence versions, verified results, open problems, live job handles, remaining
budget, pending external effects and next bounded action. Link branch/PR and
temporary evidence requiring retention. Do not rely on chat recollection, private
reasoning transcripts or an unversioned latest path.

The recipient acknowledges after verifying those references, current validity,
provider state and authority. Transfer ownership through the existing claim
mechanism, then update GitHub. An absent recipient leaves handoff pending; stop
new conflicting dispatch while native monitoring continues independently. Old
and new owners must not both assume cancellation/acceptance responsibility.

Until transfer is acknowledged and recorded, the current execution owner retains
monitoring and emergency-cancellation responsibility through the native supervisor.
If that owner is unavailable, apply its predeclared failover/stop mechanism; do
not leave a handoff gap in supervision. At the agreed escalation time the scoped
coordinator may withdraw an unacknowledged handoff and record a superseding offer
after reconciling ownership and jobs. A late acknowledgment of the withdrawn
offer cannot take ownership. Timeout itself neither transfers ownership nor
proves quiescence; replacement still follows the fencing/quiescence rule.

Set progress freshness and review/escalation times from task cost/resource exposure.
Updates report verified changes, blockers and next decisions. Missing progress
triggers reconciliation and the declared stop policy, not duplicate compute.
A successor to a lost coordinator reconciles native claims, jobs, pending effects
and invalidations using the fencing/quiescence rule above. During GitHub outages
use the frozen-work policy; missing participants do not bypass it.

Expose review bottlenecks as owned blockers with scope and escalation, rather
than launching speculative experiments to appear busy. Escalation reuses existing
authority; it does not authorize messaging new external recipients or giving a
replacement reviewer broader data access.

## 6. Concurrent GitHub writes and compute

Assign one writer per mutable current-summary object. Others append attributed
evidence/decision comments or propose changes by PR. Re-read authoritative records
before summary updates, preserve human edits and historical evidence. If shared
prose cannot be updated safely, append/link a new summary instead of overwriting.
A marker or timestamp is not compare-and-set.

Default automated progress reporting to new attributed comments or reviewed
versioned records, not full-body PATCH of a human-editable goal/experiment Issue.
Only refresh a dedicated automation-owned summary object when its writer scope
is actually serialized and human edits can be preserved. A read immediately
before PATCH does not close the race with another editor. Without those
guarantees append a linked replacement summary and keep the older evidence.

For webhook-driven work use the existing trusted receiver: verify signature,
delivery ID, repository and event/action, then fetch current subjects and actor
authority before effects. Deduplicate deliveries and logical operations separately:
redelivery can retain its delivery ID, while distinct events can request the same
batch. Mark processing complete only after durable effect/receipt reconciliation;
a failed first attempt must not suppress all legitimate retries. Reconcile missed
events from native records; do not assume ordered, lossless delivery.

Resolve both deliveries to the existing intended-operation record before deciding
to submit. Its key binds the repository, study/trial or task revision, stage/output
scope and intended attempt identity as applicable. A new delivery ID does not
create a new intended attempt. Unknown mapping blocks submission for reconciliation.
An authorized retry has a new recorded attempt with a parent link; deduplicating
by configuration or trial alone must not suppress valid retries or new replicas.

Actions concurrency governs only its configured workflows/jobs. Default pending
replacement can discard earlier requests even without cancelling running work.
Verify available queuing behavior if all requests must run, or leave admission
to the native executor. Keep every planned trial in authoritative intent/member
records and reconcile displaced requests. A repository concurrency group cannot
allocate GPUs shared with other repos or fence detached SSH processes. The native
resource manager enforces aggregate allocations across participants.

Reconcile ambiguous remote effects before retrying. A comment-write failure must
not repeat compute; two reports of one artifact are not independent observations.
Preserve producer and accepted-generation identities in aggregate results.

## 7. Contribution and closure

Record actual human contributions at task/decision/evidence boundaries, including
negative investigations, curation and validation. Use CRediT vocabulary when a
contribution statement is useful; it does not determine authorship, rank people
by commit counts or make an agent an author. Preserve agent assistance and human
accountability separately, within the permitted disclosure audience.

Before accepting collaborative work, verify deliverables, required reviews,
integration/measurement compatibility, live jobs and pending effects. Release or
transfer claims/allocations through their real owners. Unresolved handoffs,
invalidations or duplicate jobs remain explicit; closing an Issue cannot hide
them. The decision owner accepts the milestone against its criteria and records
the next action. Retain contribution/correction links in the evidence package;
publication remains separately authorized.
