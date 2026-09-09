# Study design and representative dev validation

## Contents

1. Study identity and scientific boundaries
2. Representative development and formal closure
3. Dev inventory, quotas, interactions, sampling and acceptance
4. MindCube example

## A study remains the unit of the user's objective

Record a versioned research contract containing question, hypothesis, intended
comparison/estimand, conditions, baseline, metrics, uncertainty, expected item and
replicate membership, exclusions, stopping rules and final artifacts. Include
analysis/model-selection procedures before confirmatory evaluation. Preserve
every amendment with its cause and the evidence already seen at that time.

Choose explicit membership manifests or a bounded versioned membership rule with
verifiable counts/digests. A percentage alone cannot identify the evaluated set.
Declare join keys, order requirements, failure denominators, grouping and paired
baseline/candidate membership. Deterministic IDs do not imply deterministic data.

An exploratory result may legitimately change the next question. Create a linked
revision instead of rewriting the original hypothesis to fit the observation.
Infrastructure controls may adapt within the frozen scientific contract; any
change that can alter sample selection, precision, batching, data order or model
behavior must be assessed and recorded as a scientific change when applicable.

## Representative development

Distinguish an engineering dev subset from a statistical model-selection set.
They may overlap if declared, but neither automatically remains an untouched test
set. Choose strata relevant to the actual task: input length, modality, class,
source site, rare formats, empty/corrupt input policy, difficult examples and
memory/latency extremes. Use stratified deterministic sampling where useful;
preserve selection code, membership, random seed, counts and known gaps.

Do not choose only first-arriving or easy inputs. Include the minimum baseline
and candidate paths needed to test comparability. Keep real preprocessing,
inference/training, serialization, validation and scoring. A stub can test a
launcher but cannot establish resource viability or scientific correctness.

Dev evidence must cover the actual risks before the dependent scale increase:

- known-answer/domain checks and real end-to-end output validation;
- measured setup/compute/validation/transfer/storage demand and tail behavior;
- committed artifact handoff, digest and schema checks;
- cancellation, partial-write rejection and compatible checkpoint recovery;
- error and no-progress detection plus retention feasibility.

Use the smallest workload covering those risks, then increase coverage or
concurrency as evidence permits. No universal dev percentage or doubling ladder
is required. Record why a subset is adequate for the next launch, not a claim
that it predicts all full-run failure modes. Include uncertainty and contingency
in GPU-time/storage forecasts; dev throughput is not guaranteed full-run speed.

## Formal execution and continuous checks

Formal execution starts with a frozen input set and recipe. A canary prefix can
be part of that formal set when it uses exactly the formal scientific contract,
is not selected based on favorable results, and is not counted twice. Otherwise
keep it as dev evidence. Changes after canary inspection require an amendment
and an impact/reuse assessment.

Monitor operational correctness and scientific invariants across the full run.
Inspect samples stratified over inputs/stages/time, including long-tail inputs.
Quality sampling supplements deterministic checks on every partition; it does
not certify unobserved rows. Record sampling coverage and residual uncertainty.

Do not use repeated peeking at a provisional superiority metric as an undeclared
early-stopping procedure. Pruning, adaptive sampling, stopping for efficacy or
futility, and model selection require the declared scientific method. Operational
stops for NaNs, corruption, resource exhaustion or missing progress are distinct
from a claim of statistical success. Preserve observations from both.

## Exact closure

Reconcile expected keys/conditions/replicates against accepted artifact versions:
no missing keys, unauthorized extras, duplicate acceptance or accidental mixing
of incompatible recipe versions. Define which stage outputs and analyses are
required per condition. Keep terminal accounting for failed/blocked/excluded work,
but all required scientific rows must satisfy the declared completion rule.

Distinguish:

- **dev-ready**: declared development gate passed;
- **artifact-ready**: one exact artifact is safe for its declared consumers;
- **stage-complete**: that stage's required coverage and validator passed;
- **study-completed**: all required stage/analysis/scientific/retention gates passed;
- **study-closed-incomplete**: work stopped and evidence archived, with gaps.

Formal raw-output validation precedes analyses that consume those outputs.
Analysis versions capture method/code/config, exact input collection, exclusion
decisions, uncertainty computation and derived tables/figures. A final report
references their immutable versions and current validity. Reanalysis may reuse
raw data; it does not rewrite past analyses or create independent replicates.

Include favorable, negative and null results. If failures concentrate among
difficult samples, expose that missingness instead of reporting the surviving
mean as the full population estimate. Corrections to shared scorers also apply
to baseline artifacts where comparability requires it.


## Dev selection and readiness contract

### 1. Inventory the actual population before sampling

Pin the dataset provider/revision/content digest, configuration and exact split
(full, train, validation, test or published tiny subset). Preserve the loader,
filters, deduplication and preprocessing versions. Define the target population
and sampling unit: question, image, scene, video, patient, document or episode.
Determine the grouping unit separately. Never infer the population from a folder
name, an advertised total or the first rows.

Inspect the actual schema and official task taxonomy. Profile the full bounded
metadata manifest where feasible, without loading expensive image/model payloads:
category counts/proportions, hierarchy and multi-label membership, unique groups,
missing/unknown labels, duplicates, split overlap, input sizes and resource tails.
If only sampled profiling is feasible, record uncertainty and do not certify
complete category coverage. Provider revision metadata and local data can differ.

Separate classification axes instead of collapsing all notions of “type”:
task/reasoning category, scene/source, viewpoint/motion, modality, difficulty,
answer class, number of views/objects, language, prompt/condition, and input length
may describe different properties. Use axes supported by metadata and relevant
to the actual hypothesis or execution risk; do not invent unavailable labels.

Preserve group isolation between all development/tuning data and the held-out
evaluation set, including near-duplicates and questions sharing a scene/image.
Engineering dev and tuning may overlap when explicitly declared; any separately
claimed independent validation split must retain its declared independence.
The isolation verdict checks those declared boundaries. Several questions from one
scene do not provide the same independent coverage as several scenes. Report
both item and independent-group counts. Formal baseline and candidate runs must
use the same required item IDs (and declared pairing/randomness).

### 2. Choose proportions and coverage deliberately

Construct one versioned dev manifest with tagged roles, not extra repositories:

- **Population core:** stratified probability sample approximating the target
  population proportions, within group/split and budget constraints.
- **Coverage additions:** enough distinct examples/groups from every mandatory
  category and high-risk subcategory or interaction missing from the core.
- **Stress/regression additions:** resource extremes, supported boundary formats,
  representative known failures and their expected handling.

A sample may have multiple roles but is executed/counts once per declared
condition. Preserve role membership so distributional metrics do not accidentally
include purposive stress cases. Stress cases outside the normal valid population
have their own expected rejection/recovery oracle.

For exclusive strata with population counts N_h and total N, target shares are
p_h = N_h / N. For a core budget n, start with quotas proportional to n * p_h,
round deterministically (for example largest remainder with a stable tie order),
cap by available eligible independent units and document redistribution. Choose
minimum distinct-item/group coverage per mandatory stratum based on its risks;
one item proves a path was exercised, not robust behavior or a precision target.

If minimum coverage cannot fit the budget, report infeasibility. Increase the
authorized budget, stage coverage within it, or narrow the next-step readiness
claim explicitly; never drop a category silently. A genuinely absent stratum is
a population fact. A present but unselected stratum is a coverage gap. A
technically unsupported category blocks any claim requiring its coverage.

Quota rules for grouped or overlapping/multi-label strata must account for
shared membership: marginal proportions need not sum to one, and independent
rounding of all marginal quotas can double-count items. Use a constrained
selection method with recorded priorities and residual deficits; do not promise
every marginal/joint quota is simultaneously feasible.

### 3. Cover relevant interactions, not just marginal categories

Cover all mandatory top-level categories and predeclared critical combinations,
such as task type × input-length tail or category × model/prompt condition.
Matching each marginal alone can miss a failing combination. Inventory joint
cell availability and report uncovered mandatory cells.

Do not require the full Cartesian product of every field. Rank scientifically
relevant and implementation-risk interactions, use pairwise coverage for useful
remaining axes, and record residual gaps. Unsupported labels/difficulty estimates
are unknown; model errors observed during tuning are not an independent
predeclared difficulty label. Include long-tail cost cases for each relevant
execution path, not just one global maximum.

Run dev on every scientifically distinct required model/code/prompt branch, or
record explicit equivalence evidence for a shared path. One model's dev pass
cannot certify a different architecture, tokenizer, preprocessing or context
limit. Budget allocation should use per-stratum measured cost and tail headroom,
while preserving mandatory coverage rather than favoring only cheap examples.

### 4. Choose sample size for the decision

Engineering dev size is determined by path/stratum/group coverage, failure risks
and resource budget. Statistical estimation additionally needs a declared
precision/power/error-rate target and appropriate sampling/variance method.
There is no universally adequate 1%, 10%, 100 samples or one-per-class rule.

Keep proportional-core summaries, per-category metrics, macro averages,
population-weighted estimates and purposive stress results distinguishable.
For a valid probability sample within exclusive strata, a population mean can
use sum(p_h * stratum_mean_h); uncertainty must respect sampling design,
clustering and finite population when applicable. With unequal sampling
probabilities, record them and use an appropriate estimator. Weighting cannot
repair unknown inclusion probabilities or outcome-based convenient selection.

If oversampling a rare class, disclose the changed dev share and weights.
If including every eligible item in a tiny class, distinguish census coverage
from replicated evidence. The same cached response is never another replicate.
A zero-observed-error dev test does not prove a zero failure rate.

### 5. Reproducible, nested selection without selection bias

Record deterministic selection implementation/version, seed, ordered eligible
membership, grouping constraints, exclusions and selected IDs. Prefer stable
per-ID keyed ranking or another reproducible stratified method independent of
directory/worker order. Reject duplicate identities and missing IDs before launch.

Support staged dev expansion using immutable manifests with parent links.
Keep existing selections when compatible; when quotas/groups/taxonomy force a
reselection, preserve both versions and explain the change. Expand because of
coverage/risk/uncertainty, not to choose favorable metrics. Adding failure cases
to regression coverage is valid but changes the sample's role and may no longer
support an unqualified population estimate.

After code/model/data/split/schema/filter changes, determine which dev evidence
is still applicable. Reprofile changed populations, recheck quotas and leakage,
and rerun affected paths. A cached “dev passed” flag without the same effective
contract cannot authorize a new formal launch.

### 6. Deterministic dev acceptance report

The project sampler and validator must produce a machine-readable report
containing, in native fields or equivalent:

| Evidence | Required content |
| --- | --- |
| Population | Dataset revision/digest, split, filter/loader and taxonomy versions, item/group totals |
| Selection | Manifest digest, ID list, seed/method, role tags, exclusions and inclusion probabilities where used |
| Stratum audit | N_h, p_h, selected item/group counts, selected share, min coverage, quota deviation, missing labels/cells |
| Interaction audit | Required combinations, available/selected counts, uncovered combinations and rationale |
| Isolation | Declared split boundaries, allowed dev/tuning overlap, duplicate/near-duplicate/group checks and held-out overlap verdict |
| Execution | Exact model/code/config/environment identities, outputs and required per-path/per-stratum checks |
| Resource | Setup/compute/validation/transfer/storage measurements, tails, remaining budget and forecast limitations |
| Decision | Pass/fail/blocked for a specific next step; failed/missing items; residual coverage and statistical limitations |

Before looking at results, set proportion-deviation tolerances and mandatory
coverage/checks for the intended next step. For exclusive strata one diagnostic
is total variation, 0.5 * sum(abs(dev_share_h - p_h)); use it alongside maximum
per-stratum deviation and minimum/group coverage, not instead of them. Do not
interpret this population-composition diagnostic as proof of accuracy or power.
Exact proportionality may be impossible at small n; record integer constraints.

A dev gate passes only when mandatory categories/interactions and group minima
are satisfied, proportion deviations meet the declared core tolerance (or a
reviewed contract amendment), leakage/identity checks pass, all required
correctness/artifact/recovery/stop checks pass, and the next resource budget is
feasible. A good aggregate score cannot hide a failing or untested stratum.
Incomplete metadata or infeasible constraints produce a bounded gap report.

### 7. MindCube example: validate taxonomy before assigning quotas

MindCube's official description names cognitive mapping, perspective-taking and
mental simulation. Its published data card also lists viewpoint/motion-related
image directories, including around, among, rotation and translation. These are
different descriptions; do not assume that a particular JSON field has exactly
three values, that directory names are the reasoning classes, or that their
frequencies are equal. The repository also reports a data correction, making
revision pinning important. Inspect the exact selected full/train/tinybench
metadata and category mapping before calculating a dev sample.
[Official dataset card](https://huggingface.co/datasets/MLL-Lab/MindCube/blob/main/README.md),
[official repository](https://github.com/mll-lab-nu/MindCube).

If the chosen split actually contains three mutually exclusive task categories,
cover all three and their relevant subtypes/groups. As an explicitly synthetic
illustration, a population with 60%/30%/10% shares and a 100-item proportional core
would target 60/30/10. If the rare category needs 20 distinct coverage examples,
add ten tagged coverage examples (if available) or explicitly redesign the
allocation. Do not report the combined 60/30/20 sample's unweighted mean as the
original population estimate. Keep official weighting/evaluation rules when
they prescribe a different aggregation.

No actual MindCube rows were downloaded or sampled for this Skill change; these
are selection requirements and an illustrative allocation, not a measured dev set.
