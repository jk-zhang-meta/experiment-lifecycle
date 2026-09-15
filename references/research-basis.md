# Research basis and adoption limits

Primary sources consulted 2026-09-09. This is a targeted engineering synthesis,
not an exhaustive literature review or a benchmark proving this Skill superior.
The contract is our design inference from the sources and the user's requirements.
The GitHub research extension below makes GitHub mandatory for repository-based
research. Other listed products remain optional, and no citation authorizes an
installation or external mutation.

| Source fact | Adopted design inference | Boundary |
| --- | --- | --- |
| Ray Data executes operators with buffered blocks and backpressure; memory hints guide scheduling rather than impose OS limits | Pipeline partition-ready artifacts, bound buffered bytes and reserve actual resources | Native streaming buffers alone do not supply durable research retention or scientific validation. [Ray Data internals](https://docs.ray.io/en/latest/data/data-internals.html) |
| Nextflow resume uses task identity plus preserved work outputs; inputs/scripts/environment affect caching | Reuse needs dependency identity and retained bytes; avoid nondeterministic unkeyed joins | Default file identity can include path/mtime/size; our evidence contract additionally requires content integrity. [Nextflow caching and resume](https://docs.seqera.io/nextflow/cache-and-resume) |
| Snakemake's between-workflow cache includes steps, parameters, software and inputs through a Merkle tree | Stage-level dependency fingerprints allow selective reuse across experiment revisions | Documentation marks the feature experimental and warns that its default shared cache is not for private data. Do not adopt that storage configuration for private research. [Snakemake caching](https://snakemake.readthedocs.io/en/stable/executing/caching.html) |
| OpenLineage distinguishes jobs, executions and datasets, with additive observations when information becomes available | Keep immutable launch intent, early job binding and later terminal/resource evidence distinct | Lineage events describe observations; they do not by themselves guarantee atomic acceptance, trustworthy scientific validation or cancellation. [OpenLineage object model](https://openlineage.io/docs/spec/object-model/) |
| Beam triggers expose latency/completeness/cost tradeoffs and distinguish early results from later data | Allow provisional incremental results while requiring exact bounded membership for final scientific closure | A stream watermark is not proof that all planned research samples exist. We use explicit expected membership. [Beam triggers](https://beam.apache.org/documentation/programming-guide/#triggers) |
| MLflow records runs, parameters, metrics, artifacts and dataset inputs | Map existing tracking records to provenance instead of duplicating the platform | Tracking alone does not establish artifact readiness, invalidation propagation or the scientific oracle. [MLflow tracking](https://mlflow.org/docs/latest/ml/tracking/) |
| PyTorch's general checkpoint guidance includes optimizer state in addition to model weights | Declare checkpoint purpose and capture the full state required by the project's resume semantics | Additional RNG/sampler/distributed state depends on the workload; a file load alone does not prove equivalent continuation. [PyTorch checkpoint guide](https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html) |
| scikit-learn documents leakage from inappropriate preprocessing and use of test data | Separate engineering dev, tuning and confirmatory evaluation; freeze membership and selection decisions | Representative engineering coverage is not proof of statistical representativeness. [Common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html) |
| Nextflow distinguishes retry, terminate and finish error strategies | Make cancel versus bounded drain an explicit trigger action; verify native behavior | Finish can leave submitted work running; selecting a strategy is not proof of measured stop latency. [Error strategy](https://docs.seqera.io/nextflow/reference/process/directives/error-strategy) |

## Synthesis specific to this Skill

The new integration is an artifact-driven scientific lifecycle: representative
dev, monitored formal execution, independently committed intermediate evidence,
bounded overlap, lineage-aware invalidation/reuse, and full retained closure.
These are protocol requirements, not a claim that any cited product implements
all of them together. In particular, revocation propagation and complete
retention must be verified in the selected project backend.

No universal best executor is selected. Keep an existing engine if it can prove
the contract. Consider a workflow engine for coarse scientific DAGs, a streaming
data engine for heterogeneous partition processing, native training facilities
for distributed checkpoints, and a tracker for metadata only when an actual
project gap justifies that component. Do not install all of these as a stack.

Performance claims require project measurements: first trustworthy dev latency,
full-study wall time, useful GPU-hours, detection-to-stop latency, wasted work,
cache reuse correctness, rerun scope and retention/restore coverage. The equal-slot
pipeline example is explanatory only; no speedup has been measured for this Skill.

## Dataset-specific example and scope update

The MindCube example in dev-validation.md uses official taxonomy descriptions and
data layout as evidence for checking multiple axes, not as a measured class
histogram. Actual sampling needs the chosen immutable dataset version and split.
[MindCube dataset card](https://huggingface.co/datasets/MLL-Lab/MindCube/blob/main/README.md),
[MindCube code and update notice](https://github.com/mll-lab-nu/MindCube).

The quota/coverage contract is our design: a distribution core plus separately
tagged purposive coverage/stress cases, group-aware isolation, required joint
cells, explicit feasibility and a predeclared readiness report. It is not a
claim that the cited systems supply this contract automatically.

## GitHub research management: evidence review, 2026-09-15

Question: how should a repository research goal retain useful progress across
milestones, many trials, code/config evolution, defects and decisions without
turning GitHub into a high-volume run database?

This is a bounded primary-source evidence review for design input, not a
systematic review or proof of a world's-best process. Source lanes: official
GitHub workflow documentation; MLflow/W&B tracking and lineage; DVC experiment
versioning. Searches included `site:docs.github.com issues milestones sub issues
dependencies projects`, `site:docs.github.com actions security untrusted
pull_request_target self hosted runners`, followed by direct official docs and
an independent tracking-source lane. Include directly documented mechanisms;
exclude unsourced superiority claims and third-party tutorials. The coordinator
checked the material GitHub, tracking, grouping and lineage sources below.
No private project data was used in public queries or incorporated into this
protocol. A proposed private case inspection was stopped when the user narrowed
the task to a generic Skill; no case-specific findings underlie these rules.

| Primary source and locator | Documented fact | Design adopted here / limitation |
| --- | --- | --- |
| [GitHub milestones](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones), milestone details | Milestones group Issues/PRs and report open/closed counts and percentage | Add explicit evidence acceptance; activity percentage is not scientific completion |
| [GitHub Projects practices](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/best-practices-for-projects), break down issues and communicate | Link work, assign owners, use sub-issues, dependencies and status views | Goal/milestone/experiment hierarchy with meaningful problem ownership; optional Projects views |
| [GitHub issue dependencies](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies), blocking relationships | Issues can declare blocked-by/blocking relationships | Plan around prerequisites; exact artifact dependencies still belong to the evidence contract |
| [MLflow Tracking](https://mlflow.org/docs/latest/ml/tracking/), concepts | Experiments organize runs with parameters, metrics and artifacts | Use native trial/run records under a durable research unit; no mandatory second tracker |
| [W&B grouping](https://docs.wandb.ai/models/runs/grouping), groups and job types | Shared-purpose groups organize runs; job types describe their function | Distinguish study/cohort from stage role; grouping alone cannot establish fair comparison |
| [W&B lineage](https://docs.wandb.ai/models/registry/lineage), lineage graphs | Artifact lineage links run inputs and outputs | Preserve exact input/output lineage through promotion and correction; visualization is not invalidation enforcement |
| [DVC experiment management](https://doc.dvc.org/user-guide/experiment-management), overview | Experiments preserve a baseline commit connection outside ordinary Git history to avoid temporary branch/commit bloat | Do not require one Issue/branch/commit per trial; retain complete recoverable source by native snapshots and promote reviewable changes |
| [GitHub workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), pull_request | PR workflows can use a merge ref/SHA | Capture actual tested checkout as well as head/base; old evidence cannot silently follow rewritten branches |
| [GitHub reruns](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs), privileges and original SHA/ref; [variables](https://docs.github.com/en/actions/reference/workflows-and-actions/variables), GITHUB_RUN_ATTEMPT | A rerun preserves original triggering SHA/ref and has attempt identity | Distinguish logical trial from physical attempts; GitHub retries do not prove new independent evidence |
| [GitHub artifact removal](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/remove-workflow-artifacts), retention and deleted runs | Artifacts expire; deleting a run deletes its artifacts | Require independently verified durable retention; Actions upload alone cannot close an archive |
| [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use), untrusted checkout and self-hosted runners | Privileged untrusted workflows and persistent runners expose credentials/environment | Explicit trusted dispatch and scoped authority; no automatic untrusted GPU execution |

The learning cycle, separate execution/validity/outcome/acceptance dimensions,
milestone acceptance decisions and defect-to-claim correction rules are our
synthesis. These sources document mechanisms, not evidence that adopting this
exact combined process improves research velocity. No quantitative effect size,
formal bias rating, exhaustive scholarly search or project performance study was
performed. Validate improvements with decision latency, coverage, avoidable
repeated compute and recovery outcomes in authorized future project use; do not
substitute experiment counts for those outcomes.

## Collaboration extension: primary-source review, 2026-09-15

Question: how can multiple humans and agents work on a shared research milestone
without losing ownership, provenance, independent review or expensive compute?
Bounded evidence-review lanes were GitHub-native ownership/review/identity and
GitHub concurrency/events plus research contribution attribution. Searches used
`site:docs.github.com code owners required reviews stale approvals merge queue`,
`site:docs.github.com actions concurrency group pending running cancel-in-progress`,
`site:docs.github.com webhooks best practices X-GitHub-Delivery redelivery`, and
`site:credit.niso.org contributor roles taxonomy`, followed by official pages.
An independent source lane checked review/identity mechanisms; the coordinator
verified the material primary pages below. No private project was inspected for
this extension. Non-primary tutorials and unsupported productivity claims were
excluded; no exhaustive systematic-review or empirical superiority claim is made.

| Source and exact topic | Fact | Adoption and limits |
| --- | --- | --- |
| [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners), base branch and branch protection | Base-branch ownership routes reviews; any one eligible co-owner can satisfy the required code-owner review | Verify actual required perspectives/settings and protect policy files; file ownership does not establish scientific review |
| [Protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), required PR reviews | Stale approval dismissal and most-recent-push approval restrictions are configurable | Bind review to source and evidence; inspect enabled settings and bypasses instead of assuming enforcement |
| [Merge queues](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue), CI configuration | Required CI must support merge_group for queued integrations | Prefer verified native integration queue when needed; manually serialize otherwise; combined code tests do not certify research evidence |
| [GitHub Apps](https://docs.github.com/en/apps/overview), permissions and tokens; [App authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/about-authentication-with-a-github-app), actor types | Apps have scoped access and short-lived tokens, with app/user authentication roles | Distinguish credential actor, agent task and responsible human; separate bots are not independent human approval |
| [Actions concurrency](https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency), pending requests | Default pending replacement can cancel earlier pending work; explicit queuing is available | Verify actual chosen mode and keep required intent accounting; this is not cross-repository GPU allocation or a detached-job lock |
| [Webhook practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks), secret, event/action and delivery ID | Verify authentic deliveries and event/action; redelivery retains delivery ID | Deduplicate delivery separately from logical effect, reconcile partial failures; delivery identity alone does not supply exactly-once processing |
| [CRediT descriptors](https://credit.niso.org/contributor-roles-defined/), scope and role definitions | Roles describe contributions such as software, methodology, curation and validation; taxonomy does not determine authorship | Retain actual contributions including negative work; avoid commit-count rankings or assigning authorship to agents |

The scoped-coordinator, native exclusive-claim, handoff acknowledgment and
fencing/quiescence requirements are design inferences consistent with the existing
artifact/executor contract. GitHub Issues are not presented as transactional
locks. No universal coordinator count, heartbeat interval, review quorum or
mandatory extra service is prescribed. Source facts establish platform mechanisms,
not whether reviewers actually reasoned independently or the team became faster.
Measure duplicate compute, handoff failures, review/decision latency and correction
coverage in authorized project use before making improvement claims.
