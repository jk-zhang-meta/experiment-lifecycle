# Compact research records

Use these as field guides for native Issues, versioned Markdown/contracts and
tracker records. They are not a mandatory schema or a second ledger. Fill facts
from available evidence, mark unknowns, and avoid asking the user to transcribe
metadata the agent can collect. Keep private evidence within its allowed store.

## Goal Issue

```markdown
## Goal and scope
Question / desired outcome:
Non-goals and constraints:
Decision owner:
## Milestones
| Acceptance record | Required evidence / decision | Dependencies | Status |
## Current state
Current study revisions and latest decisions:
Verified achievements (exact evidence links):
Blockers and remaining uncertainties:
Next bounded action / owner / remaining budget:
Last reconciled GitHub, execution and evidence timestamps:
```

## Milestone acceptance record

```markdown
Milestone URL / goal Issue:
Purpose: which decision or capability this unlocks
Acceptance revision: exact commit/path or digest
Required criteria and evidence:
Prerequisites / contributing experiment Issues:
Owner / review point / budget / stopping conditions:
Decision alternatives (including negative/inconclusive outcomes):
Acceptance decision: pending | met | not met | closed incomplete | superseded
Evidence and uncovered criteria:
Decision owner/time / next action:
Amendment or invalidation links (preserve earlier decisions):
```

## Experiment Issue / batch plan

```markdown
Goal / milestone acceptance / study ID and revision:
Question / hypothesis / exploratory or confirmatory role:
Frozen protocol locator and digest:
Comparison basis: baseline, population/split, evaluator, metrics, uncertainty
Expected conditions/replicates or bounded adaptive policy:
Source snapshot and effective configuration references:
Trial/attempt records and durable artifact location:
Dev readiness / affected code-config PRs:
Resource budget, monitoring owner, retry and stop policy:
Expected decision after this batch:
Prior decision, blockers and dependencies:
```

## Server evidence binding (for remote execution)

Use [storage alignment](storage-layout.md) and equivalent existing tracker fields;
keep private resolver details outside unauthorized GitHub payloads.

```markdown
Repository/study revision, Experiment Issue and native trial/execution IDs:
Storage namespace and mapping revision; retained source/config/input references:
Exclusive output namespace, owner/claim and provider job discovery identity:
Exact collection version/digest; native receipt and validity references:
Scratch transfer policy/loss window; retention/restore coverage and gaps:
Last storage/provider/GitHub observations; pending reports and next reconciliation:
```

## Batch result and decision

```markdown
Study revision / batch / exact output collection:
Coverage: planned, valid completed, failed, pruned, pending, unknown
Results: comparable metrics + denominator + uncertainty + limitations
Observations: partial achievements, anomalies, null/negative findings
Validity: validator evidence and current invalidations
Resources: actual/unknown costs, reuse and failed/repeated work
Decision: continue | select | reject | revise | pause | stop
Criterion, alternatives, complete considered evidence and rationale:
Owner/time, changed understanding, next bounded action:
Milestone criteria advanced / still unmet:
```

Separate work status, evidence validity and scientific outcome. A failed job
cannot refute a hypothesis; an unfavorable valid result is not a failed job.
Do not average incomparable rows or hide difficult missing samples.

## Problem / incident

```markdown
Class: implementation | evaluator | data | science | resource | observation
Symptom and exact evidence:
Affected studies/recipes/attempts/artifacts/claims/milestones:
Known impact and uncertainty:
Owner / priority / blocked-by and blocking links:
Next diagnostic action and budget:
Unblock oracle / regression evidence:
Fix PR and replacement/revalidation evidence:
Current invalidation and cancellation state:
```

## Source PR evidence section

```markdown
Research Issue / milestone:
Scientific factors changed and reason:
Actual tested source snapshot; candidate head/base when relevant:
Affected stages; reused evidence and equivalence basis:
Checks and experimental evidence (with scope/coverage):
Unverified requirements / required follow-up experiments:
```

Use closing keywords only for work actually completed by merging this PR.
Keep the experiment/milestone open until its evidence acceptance is recorded.

## Collaboration agreement (only for shared work)

```markdown
Goal / milestone / protocol revision:
Participants: GitHub actor, human/app role, responsible human, agent task/session
Decision owner / scoped coordinator / execution owner / backup:
Permitted repositories, effects and data boundaries:
Required review perspectives and independence; who may accept what:
Authoritative claim/dispatch mechanism and conflict scope:
Integration owner / per-summary writer:
Progress freshness, review/escalation and takeover conditions:
```

## Task assignment and handoff

```markdown
Task Issue / native task ID / assignment revision and current owner:
Goal, milestone/study revision and required decision:
Exact inputs, applicable protocol, owned files/modules/output namespace:
Dependencies / start condition / permitted effects and data:
Budget, native claim/generation, job handles and stop/retry policy:
Deliverable/oracle / reviewer / integration owner:
Verified achievements with exact evidence and limitations:
Open problems, remaining budget, pending effects and retained partial outputs:
Next bounded action:
Outgoing owner / recipient / acknowledgment and reconciled state:
Claim transfer or old-owner quiescence/fencing receipt:
```

GitHub assignment reflects responsibility; the native task/dispatch record owns
exclusivity. Omit irrelevant execution fields for non-execution tasks. A pending
handoff is not accepted ownership. Preserve both previous and new assignments.

## Review or disagreement record

```markdown
Reviewer actor/role and actual human or agent provenance:
Source head/base/tested integration, study/analysis revision and evidence digests:
Review scope / required expertise or independence:
Findings and supporting checks, limitations and unresolved disagreements:
Decision: approve scoped artifact | changes required | inconclusive
What changes require reassessment:
Decision owner, rationale and preserved dissent / next discriminating check:
```

Approval applies only to its exact subjects and scope; code approval, evidence
acceptance, human authorization and publication permission remain distinct.

## Final closure

```markdown
Goal / exact study and milestone revisions:
Accepted results and analysis versions:
Required criteria and coverage reconciliation:
Scientific conclusions, uncertainty, negatives and deviations:
All attempt accounting / unresolved jobs or incidents:
Retention inventory, durable locators, digests and restore-check scope:
GitHub synchronization / code snapshot recoverability:
Outcome: completed | closed incomplete (unmet criteria and reason)
Publication status and separately authorized destination, if any:
Correction/retraction path and current validity revision:
```

## Example: a milestone contains many experiments

Synthetic planning example, not measured evidence: M2 asks whether a new method
improves the frozen baseline. Experiment E1 validates measurement and baseline;
E2 screens configurations under a fixed budget; E3 confirms selected candidates.
Each experiment links its many trial/attempt records. A scorer defect becomes
problem B1 and blocks affected comparisons. Valid raw predictions remain reusable
only with proven unaffected lineage. M2's acceptance cannot pass until the
corrected baseline and candidates satisfy the declared comparison. A negative
E3 may complete the study while leaving M2's improvement criterion unmet. The
decision may stop or revise the direction without discarding the evidence.
