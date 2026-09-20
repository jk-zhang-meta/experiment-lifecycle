---
name: experiment-lifecycle
description: "Manage repository-based research experiments end to end through GitHub: goals, milestones, hypotheses, trial batches, code/config evolution, collaboration, bugs, decisions, verified results and archive closure. Use when starting, planning, delegating, resuming, comparing or completing research experiments, benchmarks, training, evaluation, ablations and sweeps. Also route ordinary software tests, representative dev validation and GPU capacity checks to proportional evidence lanes. Dev success never substitutes for full-study completion. Do not use for literature-only work or prose-only paper drafting."
---

# Experiment lifecycle

Use this Skill as the testing and experiment entrypoint. Choose the smallest
applicable evidence scope before loading detailed references. An engineering
pass proves implementation behavior; a dev pass proves only its declared
coverage/readiness gate; a formal empirical claim requires the full study.

For research-project initialization/onboarding or experiment-related code/config
changes, first use [project readiness](references/project-readiness.md) to map
project bindings and assess change impact. Keep ordinary edits proportional;
setup does not imply provisioning services or launching a study.

For repository-based research, this is the required lifecycle entrypoint and
GitHub is required from study planning through archive closure. Start with
[research management](references/research-management.md) and
[GitHub workflow](references/github-workflow.md), including when resuming,
changing a hypothesis/configuration, triaging a blocker or reporting progress.
Manage the goal and milestone decisions as well as the individual runs. Pure
planning may produce drafts before GitHub writes are authorized; it must not
claim registration or launch readiness. Ordinary software tests and isolated
capacity checks do not require research Issues or Milestones.

This Skill specifies behavior and evidence. The project executor enforces
scheduling, monitoring and cancellation; the artifact store owns durable bytes.
It does not install a scheduler, grant compute access, or make a prose instruction
into an unattended watchdog. Use existing project facilities when they satisfy
the contracts; filenames and tracking products are not scientific guarantees.
Before assessing project support, wiring an integration or declaring launch
readiness, read [project readiness](references/project-readiness.md). Separate
specified requirements, concrete bindings, static evidence and runtime evidence;
a code-only assessment never authorizes a probe or experiment.
Keep one authority per fact: GitHub for collaborative planning and review,
versioned contracts for scientific commitments, the executor for job state,
and the artifact store for evidence. ClearML is the first-choice management
platform for new research integrations: measurements, comparisons and artifact
indexes link to those same study/trial/execution identities. It does not replace
GitHub decisions or scientific acceptance. Preserve compliant existing platforms;
ordinary engineering tests need no tracking server. Do not introduce a second
scheduler or mirror ledger. GitHub usage does not authorize unspecified writes, publication,
compute or data disclosure; bind the exact repository and authorized actions.

For independent work, validated durable handoff is mandatory at the finest useful
artifact boundary: item, frame, entity, tool request or iteration—not merely a
whole entrypoint. The core model is one input-to-output computation DAG: each
node accepts declared inputs and returns named outputs; edges carry committed
artifact versions. No stage hierarchy is required. Trace and draw that graph,
commit each independently complete output, and immediately make its own
successors eligible. Never wait for
an unrelated item, shard or stage. Preserve genuine coupled computations and
declared joins. Runtime-discovered members/iterations expand the graph from
committed decisions; do not claim arbitrary Python has a fully known static DAG.
Read [artifact concurrency](references/artifact-concurrency.md), then bind it to
the existing [artifact lifecycle](references/lifecycle.md) and
[storage layout](references/storage-layout.md); do not create a separate framework
results tree or evidence ledger.

Reuse a compliant project executor. For new integrations, prefer ClearML native
Pipeline components when dependencies are known and task overhead is suitable;
choose Ray Core for dynamic fine-grained Python execution or resident models,
or Snakemake for file/command/HPC graphs. Select one executor for each computation
DAG, never require stage boundaries. Read [framework selection](references/framework-selection.md)
and [ClearML integration](references/clearml-integration.md) before wiring the
management/execution boundary. Keep computation-only nodes, declared ports and
project-owned validation/commit independent of the backend. Ray-to-ClearML node
tracking and durable recovery require explicit project bindings; they are not
automatic native integration. The executor owns task dependencies;
the shared quota controller owns API admission. Futures and worker counts do not
prove durable evidence or provider limits. Fill the measured envelope without
fixed dataset groups or LLM decisions for each dispatch. The older asyncio
reference remains a behavioral fixture, not a second project scheduler.

## Choose the validation lane

- **Ordinary software tests:** identify the behavior/change, use the project's
  existing runner and smallest relevant unit/integration/end-to-end checks,
  retain exact command/code identity, result and useful failure evidence, and
  stop when the engineering oracle is met. Do not manufacture scientific
  hypotheses, dataset splits, research manifests or GPU runs. Respect applicable
  UI isolation and resource controls. The scientific references below are not
  required for this lane.
- **Dataset-based development or scientific claims:** before design, dev
  selection or execution, read [scientific workflow](references/scientific-workflow.md)
  in full after the research-management and GitHub references, then the applicable
  contract references below. Preserve its complete
  study, monitoring and retention requirements; a dev milestone never replaces
  the requested full experiment.
- **Model loading or GPU capacity only:** read [GPU execution](references/gpu-execution.md)
  before probing or placement. Bind device/model allowlists and resource budgets;
  capacity evidence does not authorize a scientific study. If the task also
  supports dataset-based dev or scientific claims, use the scientific lane.

Use targeted test-first/debugging methods when requested or needed, without
creating another lifecycle owner. Use available canonical-state, resource-guard,
runtime-hygiene and project verification facilities only for applicable surfaces.
A graph coordinator may manage durable dependencies; it must not impose a second
completion rule or schedule individual GPU work against the project's executor.

## Read what the task needs

These contracts apply to the selected task scope, not every software test:

- Before repository research planning, resumption, progress or closure:
  [research management](references/research-management.md) and
  [GitHub workflow](references/github-workflow.md).
- When creating project records: [record templates](references/research-records.md).
- Before multi-person/agent assignment, parallel work, shared review or handoff:
  [collaboration](references/collaboration.md).
- Before experiment design or dev selection: [study protocol](references/dev-validation.md).
- Before remote execution, server directory setup, storage relocation or result reconciliation:
  [server storage and GitHub alignment](references/storage-layout.md).
- Before producing, consuming, reusing, recovering, or retaining research artifacts:
  [artifact contract](references/lifecycle.md).
- Before parallel, expensive, detached, or long experiment execution:
  [execution and monitoring](references/lifecycle.md).
- Before model loading, GPU capacity probing, placement or GPU scheduling:
  [GPU execution](references/gpu-execution.md).
- Before expensive scale-up or throughput/concurrency tuning:
  [measured performance control](references/performance-control.md).
- Before item/shard/API concurrency or delayed intermediate handoffs:
  [executable artifact concurrency](references/artifact-concurrency.md).
- Before choosing or wiring experiment-management and execution components:
  [project readiness](references/project-readiness.md),
  [framework selection](references/framework-selection.md) and, for the default
  management platform, [ClearML integration](references/clearml-integration.md).
- For current helper support and deployment boundaries:
  [compatibility and migration](README.md).
- For rationale and source limits: [research basis](references/research-basis.md).
- For Skill/adaptor validation: [acceptance cases](references/evaluation.md).
