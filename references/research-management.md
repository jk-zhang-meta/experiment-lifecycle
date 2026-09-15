# Research goals, milestones and learning cycles

Read for all repository-based research management. This reference owns the
planning and decision layer; [scientific workflow](scientific-workflow.md) owns
scientific execution and [lifecycle](lifecycle.md) owns evidence guarantees.
[GitHub workflow](github-workflow.md) defines the required collaboration mapping.
Before delegating to multiple people/agents or changing an owner, apply the
[collaboration contract](collaboration.md) to claims, review and handoff.

## Contents

1. Establish or recover the research goal
2. Use the right unit of work
3. Define milestone acceptance before activity
4. Run a bounded learning cycle
5. Compare and evolve without losing history
6. Manage defects, questions and partial achievements
7. Reconcile, report and close

## 1. Establish or recover the research goal

Identify the intended research outcome, scope/non-goals, decision owner, success
oracle, constraints, budget and exact GitHub repository. Distinguish a useful
method, a tested hypothesis, a reproducible benchmark and a publishable claim;
they need different evidence. A numerical improvement target must specify the
comparison, uncertainty and evaluation conditions. Never promise a positive
finding as the completion condition of an otherwise valid study.

Create or locate one goal Issue. Resolve existing studies, milestone plans,
experiment records and trackers before adding structure. Preserve existing IDs
and useful conventions. Do not copy a project's entire notebook into new forms.
For an inherited project, perform bounded metadata discovery first: inventory
known records and links, inspect only evidence needed for a specific decision,
and label unproven code/result mappings as unknown. Folder names, timestamps,
old prose summaries and peak scores do not establish provenance. Do not infer
that undocumented historical runs satisfied today's contract.

Return a recovery map: known valid evidence, unverified legacy evidence,
unresolved incidents, live jobs, missing links, remaining budget, and the next
safe decision. Preserve historical bytes. Import or link incrementally; no mass
rename, delete, rerun or retroactive manufacture of hypotheses. A user's request
to review management does not authorize reading every experiment or its code.

## 2. Use the right unit of work

These are relationships, not mandatory separate files or a new database:

| Unit | Meaning and ownership | Required relation |
| --- | --- | --- |
| Research goal | Long-lived question and desired outcome | Goal Issue; milestone acceptance records |
| Milestone | A decision or demonstrated capability that unlocks useful work | Acceptance record; prerequisites; contributing studies and blockers |
| Hypothesis | Falsifiable proposition with scope and revision | Studies that test it; evidence seen before revision |
| Study / comparison cohort | Frozen comparison basis and required membership | Milestone; experiment Issue; study revision |
| Trial | One intended condition/configuration/replicate under a study | Recipe and study revision; all physical attempts |
| Execution | One physical attempt, including retry/resume | Native job identity; trial; exact input/output versions |
| Observation / partial achievement | A verified fact, anomaly or usable artifact | Evidence locator, coverage, validity and implication |
| Problem | A bug, scientific uncertainty, data fault or resource blocker | Affected identities; owner; unblock oracle |
| Decision | Continue, select, reject, revise, pause or stop with reasons | Complete considered evidence; criterion; next action |

A condition/recipe in the existing artifact contract can represent a trial;
do not duplicate it merely to introduce the word. A milestone can contain many
studies; a study can contribute evidence to several milestones. Use one primary
planning owner and explicit secondary links. Hypotheses, code changes and studies
have many-to-many relations. Distinguish planning dependencies (what decision
blocks work) from evidence dependencies (what exact bytes a result consumed).

Use a stable study/experiment Issue for a coherent research question or campaign.
Keep high-volume trials, seeds, partitions and retries in the existing tracker
or immutable evidence manifests linked from that Issue. Do not create an Issue,
branch, PR or human review for every run. Promote an observation to its own Issue
when it needs independent ownership, blocks other work, or requires a distinct
decision. Small observations stay in batch summaries with exact evidence links.

## 3. Define milestone acceptance before activity

For each milestone record:

- the uncertainty to resolve or capability to demonstrate, and why it advances
  the goal;
- measurable acceptance criteria, required comparisons/coverage and evidence
  quality, including negative or inconclusive outcomes when scientifically valid;
- prerequisites, contributing study Issues, owner and review point;
- time/compute/storage bounds, stopping conditions and remaining budget;
- decision alternatives and the next work each would unlock.

An illustrative progression is baseline trustworthiness, method feasibility,
comparative evidence, robustness, and reproducible synthesis. Adapt it to the
question; do not force every project through that sequence or make a canary a
separate milestone when it is only a stage check.

GitHub's percentage of closed Issues is activity accounting. Milestone acceptance
requires a versioned acceptance decision referencing the necessary study
closures and currently valid evidence. If all Issues are closed but a required
comparison is missing, report the acceptance gap. Do not silently lower criteria,
remove difficult rows or change the baseline to make a milestone pass.

Keep these dimensions separate:

| Dimension | Example states |
| --- | --- |
| Work / execution | planned, ready, running, blocked, finished, failed, cancelled |
| Evidence validity | unverified, valid for declared scope, invalidated |
| Scientific outcome | supported, not supported, inconclusive, not assessed |
| Acceptance | pending, met, not met, closed incomplete, superseded |

A negative completed study can meet a milestone whose purpose was to decide
feasibility. It cannot satisfy a milestone promising a demonstrated improvement.
A closed-incomplete milestone remains visibly not achieved. Independent work
may proceed if it does not require the missing evidence; do not freeze the
entire project merely because one branch is blocked.

## 4. Run a bounded learning cycle

1. **Orient.** Read the current goal/milestone summary, last decision, relevant
   problems and authoritative run/validity state. Identify the exact unresolved
   question; search earlier trials before repeating work.
2. **Choose.** Select the smallest informative study/batch using scientific
   relevance, discriminating power, prerequisites, measured cost and uncertainty.
   Prefer diagnosing a broken evaluator to launching more candidates. Set a
   project-appropriate work-in-progress limit; drain useful existing work before
   expanding the queue. Do not invent numeric information-gain estimates.
3. **Freeze.** Record the hypothesis/revision, comparison basis, trial membership
   or bounded adaptive search policy, baseline, selection/stopping rules, budget
   and next decision. Save effective configs and code/data/model/evaluator
   identities. Dynamic proposals append actual trial specifications before
   dispatch within that policy; never rewrite earlier proposals.
4. **Validate and execute.** Apply representative dev, resource, source, GitHub
   and artifact gates. Use the native executor, monitored dispatch and correct
   retry semantics. Track planned, admitted, completed, failed, pruned and pending
   work against the declared denominator. Do not expand budget because hardware
   is idle or keep launching after the question is answered.
5. **Assess.** Validate outputs and compare only compatible cohorts. Record
   partial achievements, anomalies, null/negative findings and deviations. A
   provisional result states its exact coverage and cannot select a final winner
   unless the frozen adaptive procedure permits it.
6. **Decide.** Append a compact evidence-backed decision: what changed in our
   understanding, alternatives considered, evidence/limitations, decision owner,
   selection or rejection reason, remaining uncertainty, next bounded action.
   Apply existing authorization; do not require a new human approval for each
   routine authorized batch. Scientific or external-effect gates still apply.
7. **Reconcile.** Update the GitHub summary and dependencies from authoritative
   evidence, preserve prior decisions, and reassess milestone acceptance. Continue
   authorized dependent work until its actual oracle is met or a real blocker
   remains. A batch finishing does not finish the user's research objective.

Review at meaningful boundaries: batch completion, blocking incident, material
protocol change, candidate promotion, budget threshold and milestone decision.
Long batches also need a declared status freshness interval. Neither a fixed
daily report nor a comment for every minibatch is universally required.

## 5. Compare and evolve without losing history

A comparison cohort binds population/split, item and replicate membership,
baseline identity, metrics/direction, evaluator, uncertainty and selection rule,
and resource constraints when relevant. Code/config differences under study
are intended factors; accidental differences in measurement are confounders.
Group labels and a common metric name do not prove comparability.

Before ranking, verify each row's basis and validity. Separate incompatible
cohorts; identify the minimal matched re-evaluation needed to bridge them.
Re-score retained valid predictions where possible, including baseline. Retain
all candidates considered, failed/pruned work and the selection history; never
report a chosen seed as the whole replicate distribution. A retry is not an
independent observation. Use held-out confirmation according to the frozen
protocol after selection; repeated test-set selection changes the claim.

When an evaluator defect influenced adaptive proposal, pruning, early stopping
or candidate selection, trace those decision dependencies too. Re-scoring only
surviving candidates does not repair biased search history. Mark affected
decisions and downstream acceptance invalid, preserve all proposals/exposures,
and determine the minimal authorized replay or new study revision before
promoting a winner. If discarded branches cannot be reconstructed, report the
selection limitation; do not retroactively claim a valid full comparison.

Baseline reuse requires validity of its generation as well as scoring. A changed
upstream dependency/environment needs the stage equivalence assessment; rerun
affected generation when equivalence is unproven, not merely the scorer. If
required baseline bytes are unavailable or cannot support the corrected
measurement, mark the comparison blocked/unavailable and identify the evidence
gap. An authorized matched rerun or explicit study amendment can establish a
new baseline/cohort. Do not silently substitute one or mix corrected candidates
with invalid historical scores; independent valid work may continue.

| Change | Required action |
| --- | --- |
| Infrastructure loss, same scientific inputs | Fresh execution with retry/resume parent and bounded budget |
| New seed/config/model/prompt | New relevant trial/recipe, appended under the authorized study policy |
| Changed hypothesis, population, endpoint or stopping rule | Study amendment/new revision; record evidence already observed and impact on confirmation |
| Evaluator defect | Invalidate affected scores/claims; re-score proven-valid inputs; correct baseline too |
| Plot-only change | New presentation artifact; reuse valid analysis inputs |
| Merge/rebase/cherry-pick | Preserve source history, capture actual new snapshot; assess stage dependency equivalence |
| Shared component changed | Trace actual consumers; rerun affected stages; unknown impact blocks a conservative scope |
| Direction abandoned or superseded | Preserve evidence and rationale, link replacement; do not delete the losing branch's evidence |

Do not use full-repository SHA alone as a cache key for every stage. Retain it as
provenance, then apply the stage dependency rules in [lifecycle](lifecycle.md).
Integrating two separately tested methods does not prove their combined behavior.

## 6. Manage defects, questions and partial achievements

Classify a problem before responding: implementation, measurement/evaluator,
data, scientific uncertainty, infrastructure/resource, or missing observation.
Poor performance is not automatically a bug. Capture symptom, exact affected
study/recipe/attempt/artifact, evidence, impact, owner, next diagnostic action
and unblock criterion. Link a fixing PR to the problem and impacted experiments.
Recurring failures should share a root-cause Issue instead of spawning duplicates.

For correctness faults, the artifact contract owns revocation, cancellation and
descendant invalidation. GitHub must expose the affected claims/milestones and
the correction status. Merging a fix is only implementation progress: closing
the incident requires its regression check and affected evidence revalidation.
Reopen or mark affected milestone acceptance as invalidated when necessary,
without erasing its historical acceptance record.

Small valid achievements have value even when their parent study fails: a
working loader, a reusable prediction partition, a falsified sub-hypothesis,
a resource bound or an identified measurement defect. Record scope, evidence,
reuse conditions and the decision they enable. Promote them to a milestone
criterion only through an explicit amendment, never by relabeling activity as
success after the fact.

## 7. Reconcile, report and close

At session resume, refresh the pinned GitHub records, provider job handles,
accepted artifact versions and invalidations. Adopt known running work rather
than resubmitting. If sources disagree, report the conflict and use the owner
for that fact. A stale dashboard is not an execution receipt.

Maintain one compact goal/milestone status view with:

- current revision and decision, verified achievements and their evidence;
- required coverage versus valid completed coverage, failures and unknowns;
- open blockers, affected dependencies and exact unblock conditions;
- next bounded batch/action, owner and resource budget;
- source/observation timestamps and unresolved synchronization gaps.

Report progress using decisions resolved, required evidence covered and remaining
uncertainties, alongside compute/time spent, useful reuse, failure/repeated work
and decision latency where measured. These are diagnostics, not targets to game;
experiment count, closed-Issue percentage and best score alone are insufficient.

Close a study under the scientific artifact/analysis/retention rules. Close a
milestone only with its acceptance record. Close the goal only after all required
milestones and the final comparison/synthesis, accounting and restore checks
are satisfied, or explicitly as stopped/closed incomplete with unmet criteria.
Record which deliverables remain private and which have separate publication
authority. A GitHub Release is optional unless requested; research completion
does not require public disclosure or a publication ceremony. Future corrections
append new validity decisions and visibly update current conclusions.
