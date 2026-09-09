# Research basis and adoption limits

Primary sources consulted 2026-09-09. This is a targeted engineering synthesis,
not an exhaustive literature review or a benchmark proving this Skill superior.
The contract is our design inference from the sources and the user's requirements.
No listed product is a mandatory dependency or an authorized installation.

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
