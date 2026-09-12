---
name: experiment-lifecycle
description: Plan and verify software tests, representative dev validation, and full scientific experiments in one lifecycle. Use for unit/integration/end-to-end checks, dataset sampling, model loading, GPU capacity and scheduling, benchmarks, training, evaluation, ablations, sweeps, monitored parallel runs, recovery, reusable intermediates, and complete evidence retention. Scale evidence to engineering versus scientific claims; dev success never substitutes for formal completion. Do not use for literature-only work.
---

# Experiment lifecycle

Use this Skill as the testing and experiment entrypoint. Choose the smallest
applicable evidence scope before loading detailed references. An engineering
pass proves implementation behavior; a dev pass proves only its declared
coverage/readiness gate; a formal empirical claim requires the full study.

This Skill specifies behavior and evidence. The project executor enforces
scheduling, monitoring and cancellation; the artifact store owns durable bytes.
It does not install a scheduler, grant compute access, or make a prose instruction
into an unattended watchdog. Use existing project facilities when they satisfy
the contracts; filenames and tracking products are not scientific guarantees.

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
  in full, then the applicable contract references below. Preserve its complete
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

- Before experiment design or dev selection: [study protocol](references/dev-validation.md).
- Before producing, consuming, reusing, recovering, or retaining research artifacts:
  [artifact contract](references/lifecycle.md).
- Before parallel, expensive, detached, or long experiment execution:
  [execution and monitoring](references/lifecycle.md).
- Before model loading, GPU capacity probing, placement or GPU scheduling:
  [GPU execution](references/gpu-execution.md).
- Before expensive scale-up or throughput/concurrency tuning:
  [measured performance control](references/performance-control.md).
- For current helper support and deployment boundaries:
  [compatibility and migration](README.md).
- For rationale and source limits: [research basis](references/research-basis.md).
- For Skill/adaptor validation: [acceptance cases](references/evaluation.md).
