---
name: experiment-lifecycle
description: Manages repository research from planning through verified closure, including scientific code changes, representative dev validation, benchmarks, training, sweeps and GPU capacity checks. Use for research lifecycle or model execution work; not ordinary software tests, literature-only work or prose-only drafting.
---

# Experiment lifecycle

Choose the task's evidence scope before reading references. An engineering pass
proves implementation behavior; a dev pass proves only its declared readiness
gate; a scientific claim requires the applicable study evidence.

## Choose the route

- **Ordinary software tests:** this Skill is not required solely to run or explain
  them. If already loaded or explicitly invoked, use the project's existing
  runner and smallest relevant checks; retain command, code identity, result and
  useful failure evidence, then stop at the engineering oracle. Do not load
  scientific references or create study records. Applicable UI isolation and
  resource controls still apply.
- **GPU capacity or model loading only:** read [GPU execution](references/gpu-execution.md)
  before probing or placement. Bind device/model allowlists and resource budgets;
  capacity evidence does not authorize a scientific study.
- **Repository research:** before planning, resumption, progress or closure, read
  [research management](references/research-management.md) and
  [GitHub workflow](references/github-workflow.md). GitHub is required from study
  planning through archive closure. Without write authority, produce drafts and
  report the binding gap; do not claim registration or launch readiness.
- **Dataset-based development or scientific claims:** use the research route,
  then read [scientific workflow](references/scientific-workflow.md) in full and
  [study protocol](references/dev-validation.md) before design, dev selection or
  execution. A dev milestone never replaces the requested full study. GPU work
  that also supports these claims must satisfy both applicable routes.

For research initialization, onboarding or experiment-related code/config changes,
first read [project readiness](references/project-readiness.md) to map bindings
and assess scientific change impact. Behavior-preserving engineering work stays
proportional; setup does not imply provisioning services or launching a study.

## Shared boundaries

Keep one authority per fact: GitHub for collaborative decisions, versioned
contracts for scientific commitments, the executor for job state and the artifact
store for durable evidence. Preserve compliant project facilities. ClearML is the
first-choice management platform for new integrations; it does not replace
scientific acceptance. Do not add a second scheduler or mirror ledger.

Bind exact repository, compute and disclosure authority. A read-only assessment
does not authorize edits or probes. Distinguish specified requirements, concrete
bindings, static checks and runtime evidence; before assessing integration or
claiming launch readiness, use [project readiness](references/project-readiness.md).
This Skill specifies behavior; an installed helper or prose instruction does not
establish an unattended watchdog, durable store or working backend integration.

For dataset work, persist each independently completed record immediately in
retained intermediate files, before expensive semantic checks. Never wait for
peers, batch/shard completion, a flush timer or final export. Retention alone is
not scientific acceptance: release consumers only after valid acceptance of their
exact dependencies. Preserve genuine coupled computations and joins. Reuse
natural project boundaries; further splitting must justify its full overhead.

Reuse applicable completed proofs while checking current identity/validity and
revalidating affected scope. Final collection acceptance remains separate. Measure
preparation, recovery, validation and finalization as well as computation before
scale-up. Approved bounded rules use programmatic guards, not per-item LLM
approval; material changes and final acceptance retain their required review.

## Load the relevant contract

| Task | Required reference |
| --- | --- |
| Create research records | [Record templates](references/research-records.md) |
| Delegate, share review or hand off research | [Collaboration](references/collaboration.md) |
| Produce, consume, reuse, recover or retain research artifacts | [Artifact lifecycle](references/lifecycle.md) |
| Remote execution, server setup, storage relocation or result reconciliation | [Storage layout](references/storage-layout.md) |
| Parallel, expensive, detached or long execution | [Execution and monitoring](references/lifecycle.md#execution-and-monitoring) |
| GPU loading, probing, placement or scheduling | [GPU execution](references/gpu-execution.md) |
| Expensive scale-up or throughput/concurrency tuning | [Performance control](references/performance-control.md) |
| Item/shard/API concurrency or delayed intermediate handoffs | [Artifact concurrency](references/artifact-concurrency.md), bound to the artifact lifecycle and storage layout |
| Choose or wire management/execution components | [Project readiness](references/project-readiness.md), [framework selection](references/framework-selection.md) and the selected platform's integration contract; for ClearML, [ClearML integration](references/clearml-integration.md) |
| Check bundled helper support or migrate | [Compatibility and migration](README.md) |
| Review rationale and evidence limits | [Research basis](references/research-basis.md) |
| Validate this Skill or an adapter | [Acceptance cases](references/evaluation.md) |

Select one executor for each computation DAG. Framework selection owns the
ClearML Pipeline/Ray/Snakemake decision and integration constraints; the older
asyncio reference is a behavioral fixture, not a second project scheduler.
The executor owns dependencies and cancellation; the shared quota controller
owns API admission. Futures and worker counts do not prove durable evidence or
provider limits. A graph coordinator must not duplicate these responsibilities
or impose a second completion rule.

Use engineering, canonical-state, resource and runtime controls only for their
applicable surfaces. Reuse existing project records and evidence storage rather
than introducing a parallel framework results tree.
