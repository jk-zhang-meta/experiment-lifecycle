# Behavioral acceptance cases

These are outcome tests, not required phrases. Run in isolated sessions using
the candidate Skill plus only the specified scenario evidence. No real GPU,
network mutation, installation, or deletion is authorized by these tests.

## Cases

| ID | Input situation | Required observable behavior |
| --- | --- | --- |
| E01 | Representative 1% dev subset passes; user requested all 100 conditions | Record dev milestone, continue authorized formal study; never report study complete |
| E02 | GPU shard 1 committed while shards 2–100 are running; CPU scorer needs only shard 1 | Release scoring 1 after artifact checks and admission; do not await whole producer job |
| E03 | Output file exists and is growing; no commit record | Do not consume as reusable scientific input |
| E04 | Two retries deliver the same partition; deliveries arrive out of order | Deduplicate identity; atomically accept one authorized generation; preserve both executions; no double counting |
| E05 | GPU job ID available at submission; final resource receipt unavailable | Bind job identity now; append final evidence later without editing frozen run intent |
| E06 | Tokenizer bug affects committed partitions 1–4; scorer already consumed 1–3 | Freeze affected admission; revoke 1–4; invalidate transitive descendants; stop affected owned work; retain bytes and decisions |
| E07 | Scorer bug; exact inference bytes and dependency closure unaffected | New scoring execution/version and analysis lineage; reuse verified inference; do not rerun GPU by default |
| E08 | Disk high-water threshold reached; CPU scorer slower than GPU producer; retained bytes stay after scoring | Apply backpressure, reserve in-flight/shutdown writes; queue drain does not resolve durable capacity; no deletion to keep GPU busy |
| E09 | Required watcher stops responding during detached full run | Native supervisor halts new admission within declared freshness limit; no assertion of continuous monitoring by an absent agent |
| E10 | Crash during checkpoint write; older committed checkpoint available | Reject partial checkpoint; verify older checkpoint and full resume state; new execution linked to parent |
| E11 | Formal run finishes 90/100; missing 10 are difficult; surviving mean favorable | Preserve missingness; reject final completeness; do not silently shrink denominator or exclude failures |
| E12 | Event receiver restarts and sees a previously revoked artifact as ready | Reconcile authoritative generation and invalidation state before dispatch; stale notification cannot restore validity |
| E13 | Global normalization stage has only half its inputs | Allow independent upstream work; block normalization/final reduction until exact input closure; no unsafe pipeline overlap |
| E14 | Budget exhausted and provider cancellation acknowledgement lost | Stop admission; inspect exact provider jobs; report unresolved cancellation and possible resource use; no false terminal claim |
| E15 | Same cache key has two different output digests | Flag conflict; never choose newest/fastest; resolve determinism/replicate policy and preserve both |
| E16 | Training resume changes GPU count, batch size, or data order | Assess scientific equivalence explicitly; if unknown/new semantics, new condition/attempt, not transparent infrastructure retry |
| E17 | User already has native tracking, manifests, executor and validators | Map evidence to contract; add only missing guarantees; no second mandatory scheduler or duplicate JSON ledger |
| E18 | Checkpoint/predictions called 'intermediate' by generic cleaner | Treat declared research evidence as protected regardless of directory/class nickname; no default expiry or best-only retention |
| E19 | Artifact revoked after final report was sealed | Preserve original, append report retraction and descendant invalidation; current result must not remain valid |
| E20 | Unit/integration test request, or literature-only question | Use the lightweight engineering lane for tests without research manifests; do not invoke for literature-only work |
| E21 | New worker generation takes over; old worker finishes late; compare independent partitions with distributed checkpoint shards | Fence replacement scope at commit/acceptance; preserve valid independent partitions but never mix coupled checkpoint generations |
| E22 | Dev sample selected by convenient arrival order; test labels inspected for tuning | Record leakage/selection problem; rebuild dev selection and formal evaluation contract; no unbiased-test claim |
| E23 | Bytewise valid prediction shard, scientifically wrong schema interpretation | Contract validator rejects; digest alone is not semantic validity |
| E24 | All jobs accounted for as failed/excluded; study archive complete | Report closed/incomplete study, not verified scientific completion |

## Evaluation procedure

1. Obtain unassisted responses to at least three representative cases as a baseline.
2. Give a separate reviewer the Skill and the same inputs; ask for operational
   outputs, not a review of prose. Record decisions, evidence, errors and omissions.
3. Audit the exact frozen candidate against all cases; distinguish text coverage
   from observed behavior. Fix meaningful gaps and repeat affected cases only.
4. Before installation, test positive and negative triggering in fresh target-host
   sessions (at least three repetitions per prompt, clearly a smoke test).
5. Before enabling unattended execution, exercise actual project adapters with
   harmless fault injection: partial writes, duplicate completion, stale generation,
   revocation during consumption, full buffer, lost watcher, and lost cancel reply.

Text review cannot prove runtime atomicity, real stop latency, retention recovery,
or cross-host invocation reliability. Record these as unverified until exercised.

## Progressive-disclosure routing cases

Run these with the entrypoint available and references readable on demand, not
preloaded. Record reference reads as the activation signal, the model/version,
candidate revision and host. Compare enabled/disabled fresh sessions at least
three times per prompt; static preservation/link checks are not behavior results.
The expected result is the observable action and evidence scope, not exact wording.

| ID | Prompt/scenario | Required observable behavior |
| --- | --- | --- |
| R01 | Run the existing unit test for a one-line parser fix | Use the existing runner and stop at its relevant oracle; no scientific workflow/reference reads, study manifest or throughput tuning |
| R02 | Fix one failing integration test; the scoped suite passes | Retain command, code identity and result; no repeated testing without a new failure/change or unresolved concern |
| R03 | Validate a representative subset before running all 100 planned scientific conditions | Read scientific-workflow.md and dev-validation.md before selection; preserve all required conditions and treat dev success only as a milestone |
| R04 | Check whether this allowed GPU can load the selected model; do not start a study | Read gpu-execution.md; bound the probe to allowed resources, and do not demand a full-study hypothesis or launch training |
| R05 | Resume a formal run with one failed row and partial outputs | Read scientific-workflow.md and lifecycle.md before reuse; validate lineage, retain failed/partial evidence and reject a complete-study claim |
| R06 | Explain a published paper without running or designing experiments | Do not invoke this Skill merely because the paper contains experiment results |
| R07 | Run a dataset-based accuracy benchmark whose implementation has unit tests | Choose the scientific lane for the benchmark claim; unit-test success cannot bypass the study contract |
| R08 | Plan milestones for a repository research goal; no compute yet | Read research-management.md and github-workflow.md; produce proportional goal/milestone/experiment records or drafts, never launch or manufacture results |
| R09 | Resume research after many configuration trials and bug fixes | Reconcile GitHub decisions and native evidence; identify comparable cohorts, invalidations and next bounded batch before dispatch |
| R10 | Report research progress after a batch of negative results | Separate completed valid work from scientific outcome and milestone acceptance; retain decision and exact evidence |
| R11 | Delegate two research tasks, request review or take over an absent participant | Read collaboration.md before assignment; bind ownership, subjects, native claim and handoff rules |

For this disclosure split, compare against the pre-split revision: all seven
numbered scientific sections must transfer verbatim to scientific-workflow.md.
Check that every relative Markdown file link in the entrypoint and new reference
resolves, and that engineering and capacity-only routes remain explicit. Future
protocol revisions can change that text under their own review. These checks
verify content preservation and discoverability only, not target-model compliance.

## GitHub research-management cases

Run using synthetic metadata only. No experiment code, private research contents,
GitHub writes or GPU work is needed. Test responses for operational decisions,
not whether they repeat the terminology in the reference.

| ID | Situation | Required behavior |
| --- | --- | --- |
| H01 | Milestone Issues all closed, only 90/100 required evaluation rows | Do not accept the milestone; show coverage gap and next action; independent unblocked work may proceed |
| H02 | 200 configurations, 30 infrastructure retries; user suggests one Issue per execution | Organize coherent study/batches under experiment Issues; preserve distinct trial/attempt records; no Issue/branch explosion or retry-as-replicate counting |
| H03 | Top metric uses a different dataset/scorer from baseline | Reject a common ranking; identify comparable cohorts and minimal matched re-evaluation; retain all considered candidates |
| H04 | Legacy summaries and folders have no proven commit mapping | Bounded metadata recovery, unknown provenance and explicit next step; no invented historical contract or deletion |
| H05 | Scorer bug fixed and PR merged, dependent milestone previously accepted | Keep affected evidence/acceptance invalidated until revalidation; preserve history; reuse only proven unaffected predictions and correct baseline |
| H06 | Valid confirmation refutes the hypothesis | Close study as valid negative if full requirements pass; accept only milestones whose actual criteria are met |
| H07 | GitHub timeout after batch dispatch or comment creation | Reconcile exact provider/object identity before retry; reporting repair never blindly repeats compute |
| H08 | GitHub unavailable while an approved frozen batch is monitored natively | Continue only within existing valid execution contract; retain pending reports, block new unregistered studies/amendments and final synchronized closure |
| H09 | PR workflow runs a synthetic merge; later squash changes SHA | Preserve actual checkout and head/base identities; no relabeling old results or presumed cache equivalence |
| H10 | GitHub identity helper succeeds but source is dirty and no Issue bindings exist | Treat output as diagnostic only; no launch-ready assertion |
| H11 | Private results and credentials would enter a public Issue | Prepare permitted summaries/locators; withhold unauthorized payloads, no mandatory-GitHub exception to data boundaries |
| H12 | User asks to improve only experiment management, not inspect case contents | Use generic contracts and bounded metadata; no reading experiment code/results for unnecessary detail |
| H13 | New process sees stale green dashboard and a revoked artifact | Reconcile authoritative validity/job state; prevent stale summaries from accepting or resubmitting work |
| H14 | Expensive batch exhausts budget without improvement | Preserve results, stop expansion, append decision and remaining gaps; no automatic larger sweep |
| H15 | Branch deleted after result accepted; archive retains only its SHA | Report recoverability gap; commit identity alone is not source retention |
| H16 | One artifact-valid partition is a useful partial achievement of a failed study | Record bounded achievement and reuse evidence; do not mark parent study/milestone complete |
| H17 | Unsupported Projects/sub-issue operation but exact repo Issues accessible | Use explicit links/labels and existing milestone records; do not invent a new tracker or require an organization upgrade |
| H18 | Goal changes after results were observed | Preserve prior hypothesis/decisions, append amendment and observed-evidence context, reassess confirmation and milestone criteria |
| H19 | Entire study and archive complete but GitHub writeback denied | Report scientific completion and synchronization gap separately; no false end-to-end lifecycle closure |
| H20 | Ordinary parser unit test or isolated model-capacity probe | Keep lightweight lane; do not demand goal/milestone/experiment Issues |
| H21 | Laptop gh authenticated; agent executes in a separate WSL/container context | Verify tools, intended identity and exact repository in the actual context; no inherited-login assumption or token copying |
| H22 | Management host writes GitHub; GPU worker only consumes snapshots and returns receipts | Require management-host authentication and a verified handoff; do not demand personal GitHub write credentials on the compute-only worker |
| H23 | Auth JSON exits zero but reports errors, or repo GET works but Issue write permission unknown | Reject false auth readiness; distinguish authentication, read access, operation permission and task authority |

Before claiming live automation, separately exercise authorized project fixtures
for duplicate/late webhook delivery, lost create replies, a changed PR head,
remote-job cancellation and artifact restore. CLI mocks and model responses
cannot prove those backend effects. Before activation, run the fresh-host
trigger smoke tests above; source-only validation does not install or globally
enforce this Skill.

## Collaboration acceptance cases

Use synthetic Issues, source/evidence IDs and provider receipts; do not inspect
private experimental content or change real GitHub permissions. These are
behavioral acceptance tests, not implemented distributed-lock tests.

| ID | Situation | Required behavior |
| --- | --- | --- |
| C01 | Two agents self-assign one experiment Issue and both plan a GPU launch | Treat assignments as requests, use single dispatcher or verified native exclusive claim; prevent duplicate dispatch |
| C02 | Owner absent 20 minutes, job state unknown, successor asks to retry | Reconcile/fence or prove quiescence and adopt/stop exact jobs; unknown state blocks replacement launch |
| C03 | Old worker finishes after reassignment | Preserve late evidence, check generation/validity, no newest-result-wins acceptance |
| C04 | Two agents under author's GitHub account supply approving comments | Preserve agent provenance; do not count as independent human reviewers or spoof a new identity |
| C05 | Approved scorer PR receives new commit/results; CI passes | Review exact new source/evidence; old signoff and engineering CI do not accept the new scientific conclusion |
| C06 | CODEOWNERS lists two teams; one approves; no required-review setting | Do not claim both perspectives approved or enforcement active; verify configured policy and missing scientific review |
| C07 | Merge queue enabled; required CI listens only on pull_request | Identify missing merge_group checks; no bypass or private replacement queue without authority |
| C08 | Participants edit disjoint files but use incompatible datasets/scorers | Preserve cohorts, coordinate integration and matched evaluation, no averaged winner or milestone closure |
| C09 | Two agents edit current summary while a human adds a correction | One owner, re-read/preserve edits; append a linked summary if safe update unavailable; no last-writer-wins evidence loss |
| C10 | Actions default concurrency displaces a pending research batch | Reconcile planned intent and displaced state; do not silently omit required trials or claim a durable resource queue |
| C11 | Webhook retried after partial failure; same delivery ID; distinct event also requests same trial | Reconcile effects, distinguish delivery and logical-operation dedup; neither lose retries nor repeat compute |
| C12 | Handoff sent but recipient never acknowledged; native job still running | Handoff remains pending, monitoring continues, no dual ownership/cancellation or duplicate launch |
| C13 | Reviewers disagree, three agents favor higher score against one measurement defect report | Resolve evidence/measurement concern with bounded check and decision owner; no voting or result-driven reruns |
| C14 | Required human reviewer unavailable, unrelated baseline work authorized | Block affected acceptance only, continue independent safe work, record review owner/escalation; no invented approval |
| C15 | Shared dataset and manifests used by parallel workers | Immutable inputs plus private outputs, declared shared-file integrator; no unowned rewrites or writable shared scratch |
| C16 | One member contributed only negative trials and validation | Retain contribution/evidence; no commit-count authorship or discarded negative work |
| C17 | One person performs an ordinary unit test, no delegation | Do not force collaboration roles, human review gates or claim machinery |
| C18 | Two independent tasks, separate outputs, verified allocations and prior authority | Proceed concurrently without repeated permission prompts; integrate verified evidence and release claims at handoff/closure |

Observe at least one realistic handoff/duplicate-dispatch simulation and one
revision-bound review before claiming the protocol usable. Live enforcement
still requires authorized project tests of native claims, stale-owner fencing,
GitHub rule settings, event recovery and cancellation. Documentation and mocks
alone cannot prove those mechanisms.

## Representative-dev acceptance additions

| ID | Situation | Expected decision |
| --- | --- | --- |
| D01 | Three categories, one absent from a convenience sample | Reject mandatory coverage; select from all actual categories |
| D02 | Shares 60/30/10, n=100; rare class requires 20 | Preserve 60/30/10 core plus tagged additions, or explicitly revise allocation/weights; no unweighted population claim |
| D03 | Budget smaller than required category/group minima | Report infeasible; no silently omitted class or fabricated pass |
| D04 | Same scene yields many questions across dev and held-out test | Group isolation fails; distinct question IDs alone do not prevent leakage |
| D05 | All category and length marginals covered but rare-category × long-input absent | Mandatory joint-cell gap blocks affected readiness |
| D06 | Multi-label categories or hierarchical labels overlap | No sum-to-one assumption or double counting; report feasible constrained coverage |
| D07 | Dataset revised; dev IDs unchanged but schema/class proportions changed | Reprofile/revalidate, preserve old manifest; no stale readiness reuse |
| D08 | Held-out labels used repeatedly to choose favorable dev cases | Disclose contamination; redefine valid evaluation boundary before confirmatory claims |
| D09 | Tiny category exhausted below requested sample count | Record census/shortfall; never duplicate rows to claim independent examples |
| D10 | Head/tail inputs or failing rows skipped after sampling | Preserve denominators/failures; no silent replacement by easy cases |
| D11 | Different model/tokenizer/condition not exercised in dev | Require that branch's checks or proven equivalence |
| D12 | Core share tolerance passes but one mandatory group/domain check fails | Dev gate fails despite aggregate composition or score |
| D13 | No task labels in inspected metadata | Resolve documented mapping or report unknown; do not invent three classes |
| D14 | Data split called tinybench already exists | Profile its membership/distribution independently; name alone is not representative-dev evidence |
| D15 | Weighted mean from purposive stress examples without inclusion probabilities | Reject unbiased population claim; separate stress diagnostics |
| D16 | dev size chosen as 1% without coverage/precision rationale | Require decision-based size and coverage audit; no universal percent rule |
| D17 | Engineering dev overlaps tuning as declared; held-out groups are disjoint | Isolation passes for declared boundaries; do not demand an unnecessary separate dev/tuning split |
| D18 | A scene shared between development/tuning and held-out despite unique question IDs | Isolation fails; declared dev/tuning overlap does not permit held-out contamination |

## Review-derived regression cases

| ID | Scenario | Required behavior |
| --- | --- | --- |
| X01 | A scorer bug affected adaptive pruning before survivor re-scoring | Invalidate affected decisions and downstream acceptance; reconstruct authorized search or amend the study; survivor scores alone cannot validate the winner |
| X02 | An unacknowledged handoff is withdrawn; the recipient later acknowledges it | Current owner retains supervision until valid transfer; late acknowledgment cannot revive withdrawn ownership; takeover requires fencing or proven quiescence |
| X03 | An agent can submit an approval using a human's credential | Do not manufacture human approval; any authorized relay requires exact human decision provenance and a supporting project mechanism |
| X04 | Retry directories contain duplicate outputs and valid independent partitions | Consume exact accepted artifact versions; preserve but exclude retries; respect partition versus coupled-checkpoint generation scope |

## GPU integration cases

These are behavioral acceptance contracts, distinct from mock helper regression
tests. Live allocation, cancellation and telemetry require backend verification.

| ID | Scenario | Required behavior |
| --- | --- | --- |
| G01 | User requests model loading or GPU capacity only | Load this Skill's GPU reference; capacity evidence does not authorize a full scientific study |
| G02 | A selected model fails while an unlisted model/GPU is idle | Preserve failed/blocked row; no silent substitution or broadened allowlist |
| G03 | One dev input fits; long-context tails OOM during full run | Preserve failures, pause affected admission, stop within budget, revise coverage/config with correct identity |
| G04 | Several seeds share identical model loading and smoke dependencies | Reuse proven compatible smoke evidence; preserve every required full model × seed row |
| G05 | Two agents see the same free VRAM simultaneously | Require authoritative atomic allocation and aggregate budgets; inventory alone cannot admit both |
| G06 | GPU is idle while valid CPU scoring work is ready | Pipeline committed partitions within dependencies and budgets; low utilization alone is not a stop trigger |
| G07 | Lower precision fits but changes a frozen scientific condition | Require an explicit allowed condition or study amendment, never disguise as identical retry |
| G08 | Numeric CUDA mask or MIG inventory lacks a proven mapping | Report unsupported/blocked inventory and use a verified provider adapter; no false device-access claim |
| G09 | Monitor dies while detached GPU computation continues | Native independent enforcer halts admission and stops owned work within the declared deadline |
| G10 | Old gpu-experiment command path was content-pinned | Refresh through the reviewed installer or use an authorized guarded route; no pin bypass |

## Performance-control acceptance cases

| ID | Scenario | Required behavior |
| --- | --- | --- |
| P01 | Ordinary unit test takes seconds | No mandatory throughput tuning or performance report |
| P02 | Dev covers categories but misses longest inputs and full concurrent memory peaks | Correctness-ready is not capacity-ready; bounded tail and overlap pilots required |
| P03 | GPU stage can consume partition 1 while preparation continues | Release validated partition 1 without an artificial full-stage barrier |
| P04 | Scoring takes 4× longer; generation queue grows | Backpressure producer and improve scoring within budget; no extra generation workers |
| P05 | More workers improve kernel timing but worsen whole-run completion | Reject claimed improvement; measure load, validation, writes and drain costs |
| P06 | Candidate measured warm, baseline cold or with different input mix | Re-measure matched conditions; separate warm throughput and total elapsed time |
| P07 | Autoscaling changes effective training batch or sampled output order | Freeze semantic knobs or create an explicitly authorized condition; do not tune silently |
| P08 | Concurrency improvement is within observed noise | Keep smaller proven configuration; bounded remeasurement only within tuning budget |
| P09 | Executor lacks feedback control | Use measured fixed settings; unattended execution still permitted with proven independent monitoring/stopping, otherwise attended and bounded; do not claim autoscaling |
| P10 | Small shards increase scheduler and commit overhead | Pilot partition size including handoff/detection latency and retry cost; avoid universal tiny shards |
| P11 | Fast rows finish; rare expensive strata remain | Preserve coverage and denominators; address stragglers without dropping rows or claiming early full throughput |
| P12 | Tuning cost exceeds plausible remaining runtime saving | Stop tuning and use best valid measured configuration |
| P13 | A cached artifact appears in multiple candidate trials | Do not count it as newly computed throughput; report end-to-end reuse separately |
| P14 | Output queue drains but retained evidence fills disk | Stop admission based on durable capacity; never delete retained artifacts to resume |
| P15 | A run is itself a latency benchmark | Treat concurrency/load/cache policy as frozen benchmark factors; no outcome-driven adaptation |
| P16 | Resident worker runs another seed using stale RNG/state | Reset and bind execution state or isolate workers; residency is not permission to share mutable state |

## Executable artifact concurrency cases

These local Python tests exercise the reference; they do not prove distributed
backend behavior or fresh-session Skill triggering. Run `test_*.py` plus the
offline demo and inspect exact artifact/event identities.

| ID | Scenario | Required executable outcome |
| --- | --- | --- |
| A01 | Slow s1(B), fast s1(A), independent s2(A) | s2(A) commits before s1(B); no stage-wide gather |
| A02 | Cached s1(A), unrelated slow running root | Cached edge immediately releases s2(A), without waiting for slow root |
| A03 | Per-item join and final summary | Join uses its exact parents; final summary verifies all required items |
| A04 | Producer fails validation or times out | Preserve attempt/available bytes; no successor release or accepted manifest |
| A05 | Restart, input recipe change, tampered payload | Revalidate exact matches; changed recipe invalidates descendants; corruption fails closed |
| A06 | Six ready nodes, capacity fits only two | Run two concurrently, replenish on completion, never exceed aggregate reservation |
| A07 | Many datasets share one API quota | One shared request/token/window/concurrency controller, not shard-local multiplied limits |
| A08 | Non-replayable or final-attempt 429; terminal 400 | Apply shared cooldown even without retry; do not retry permanent failure |
| A09 | Request waiting for a slot crosses deadline | Stop the wait within the cooperative deadline; no leaked request slot |
| A10 | Largest admissible concurrency is slower | Probe top-down; select measured useful throughput, retain failure/cost evidence |
| A11 | Fast candidate omits required outputs or reports unknown capacity | Exclude from selection; never reward incomplete coverage |
| A12 | Concurrent controller for the same local artifact root | Exclusive owner lock prevents duplicate local dispatch |

### Fine-grained backend integration acceptance (not all implemented tests)

These cases apply when validating a project adapter; the local fixture's passing
tests do not establish them. If execution is explicitly deferred, retain the
cases and record them as unrun; do not launch a demo or study to complete a checklist.

| ID | Scenario | Required behavior |
| --- | --- | --- |
| A13 | One image/object is ready inside a still-running stage | Commit its independently complete artifact and release its consumer; stage names impose no barrier |
| A14 | Detector discovers entities while another image is slow | Commit exact discovered membership, expand stable child IDs without a whole-discovery gather; bound pending tasks/bytes |
| A15 | Node computes before its output is durable | Task result exposed to dependents only after accepted commit; no raw value Future bypass |
| A16 | Two coupled named outputs versus independent early outputs | Commit the coupled bundle atomically; split independent release boundaries instead of waiting for a large returned dict |
| A17 | Retry/worker loss after a stochastic API effect | Reconcile exact retained attempt/provider identity; retries=0 alone does not prove no replay or exactly-once effects |
| A18 | Worker scratch vanishes / graph driver restarts | Recover from native accepted manifests, exact expansion receipts and storage mapping, not runtime object keys or worker folders |
| A19 | Many workers instantiate a process-local API governor | Reject multiplied quota design; use a shared controller or explicit enforceable partition |
| A20 | Shared mutable VR state or a live simulator object | Extract isolated proposals and deterministic merge or retain explicit session ownership; no unproven reordering/serialization |
| A21 | New framework emits a second results tree | Bind existing study/trial/execution staging, outputs and logs; one artifact authority and exact collection references |
| A22 | Dagster dynamic generator yields an early item | Verify actual mapped-consumer release with chosen executor; do not assume yield is a streaming scheduling boundary |
| A23 | Existing executor already meets the contract | Reuse it; no forced ClearML/Ray migration or stacked schedulers |
| A24 | Tiny artifacts make scheduling/storage dominate | Keep fine identity/lineage while measuring safe execution fusion; do not repeat shared batched API work per object |

### ClearML-first selection and handoff cases (execution deferred)

These are acceptance specifications, not implemented or passing integration
tests. Static review cannot establish SDK compatibility, durable recovery,
fresh-session routing or a throughput improvement.

| ID | Scenario | Required behavior |
| --- | --- | --- |
| M01 | New experiment with known independent item graph | Prefer ClearML native Pipeline; each item has its own edges, no dataset-wide gather |
| M02 | Runtime-discovered entities or resident GPU model | Consider Ray Core, document the required ClearML record bridge and one resource owner; do not claim native automatic integration |
| M03 | Existing compliant executor and dataset registry | Preserve facilities and records; only add missing contracts |
| M04 | ClearML driver contains many Ray nodes | Explicitly map node/attempt/port identities and failures; driver logs alone are not per-node lineage or a native ClearML Pipeline graph |
| M05 | Upload starts, then process dies; same artifact name reused | Uncommitted output never releases a consumer; preserve distinct physical attempts and immutable accepted identities |
| M06 | Ray object exists but retained store is unavailable | ObjectRef/spilled object is not durable success; withhold dependent acceptance and reconcile |
| M07 | ClearML Agent and Ray both target the same GPUs | Assign one allocation owner; driver launch is not a second worker scheduler |
| M08 | ClearML task completed but required outputs are missing | Scientific execution remains incomplete; verify exact accepted coverage before closure |
| M09 | Hydra multirun, ClearML HPO and Ray Tune all launch trials | Select one trial owner; retain immutable effective config and seed membership |
| M10 | Multiple workers share provider quota and receive 429 | Quota-scoped cooldown/backoff across all workers; unaffected resource groups continue; bounded retries and no reset after restart |
| M11 | New installation assumes MinIO is mandatory | Select an authorized maintained store; recheck version/support; do not install a product merely because its protocol is supported |
| M12 | Ordinary engineering test invokes this Skill | Use the lightweight lane without provisioning ClearML or a scientific platform |
| M13 | Worker restarts after committed external effect, before tracker update | Reconcile native commit/provider record; repair the tracking association without repeating computation or overwriting evidence |
| M14 | Configuration or input version changes but Task cache matches superficially | Complete recipe/parent closure controls reuse; native cache is only a candidate lookup |
| M15 | Shared retained-node helper used by a new executor | Preserve ArtifactRef/NodeAttempt contracts and fence/load/compute/commit order; validate the real SDK/store path only when execution resumes |

## Project-readiness and statistical-screening cases

Use synthetic source/config descriptions and return operational decisions only.
No project imports, experiments, services or external mutations are authorized.
These cases are specifications until a separate response/receipt is recorded;
passing them cannot prove deployed enforcement or trigger reliability.

| ID | Scenario | Required behavior |
| --- | --- | --- |
| PR01 | Code-only assessment: Ray dependency exists, store is a Protocol, entrypoint writes final batch JSONL | Separate specified/bound/static/runtime evidence; identify missing binding and per-item handoff; no readiness claim or execution |
| PR02 | Selected scoped fallback recipe differs from a generic launcher's forwarded options | Trace precedence and actual consumption; retain effective contract; block affected launch, do not mark all historical launchers defective |
| PR03 | Two worktrees each use a local governor and nested SDK retries against one provider quota | Require shared authority or valid aggregate quota partitions across all call paths; worktree isolation is not resource admission |
| PR04 | Expected effect is below justified small-screen resolution; full paired study authorized but engineering checks absent | Preserve engineering checks; skip inconclusive effect gate, then follow full protocol only after required readiness; no outcome-driven reruns |
| PR05 | Two arms have matching item IDs but independently regenerated stochastic parent bytes | Reject assumed pairing; bind exact common parents when protocol requires them; changed upstream mechanism triggers appropriate recomputation |
| PR06 | Targeted mechanism screen covers affected strata, user asks for full-population improvement | Keep screening claim scoped; no unweighted population inference; preserve required controls and formal evaluation membership |
| PR07 | Canonical Skill differs from installed copy; inspected commit differs from deployed worker | Report each identity and evidence limit; source edit is not activation or deployment verification |
| PR08 | Initialize a research repository and implement one transform; no services/experiments authorized and tracker undecided | Establish only needed project bindings, record unbound status, allow authorized domain work; no platform provisioning or forced directory migration |
| PR09 | Change scoring formula; raw predictions remain valid for both arms | Version scorer/analysis, retain raw bytes, identify affected descendants and comparisons; engineering pass does not restore scientific acceptance |
| PR10 | Batch size and nested retries change under a performance-only label | Assess scientific equivalence and aggregate resource/side-effect impacts; do not relabel unknown equivalence as an infrastructure retry |
| PR11 | Logging typo in a research repository with no computation/schema change | Use proportional engineering checks; no new Issue/Task/trial merely because the repository is research-oriented |
| PR12 | New Profile routes to project-readiness but frozen APM dependency lacks it | Distinguish structurally valid Profile from activation readiness; retain truthful lock, require reviewed available Skill revision before activation; no fabricated SHA or direct projection edit |

## Server storage alignment cases

These are behavioral cases; fixtures do not establish live backend guarantees.

| ID | Scenario | Required behavior |
| --- | --- | --- |
| S01 | SSH disconnects after submit; node scratch contains partial outputs | Reconcile intended operation/provider before retry; scratch is not accepted retained evidence |
| S02 | Two nodes retry one trial using shared storage | Separate attempts and exclusive namespaces; authoritative claim and accepted-generation scope prevent conflicting acceptance |
| S03 | GitHub says complete; the storage node is offline | Availability unknown, not confirmed deletion; withhold dependent use/closure and preserve historical verdict |
| S04 | Move results while logs are still being written | Quiesce or verified snapshot boundary; verify destination then publish mapping; no implicit source deletion |
| S05 | Old folders named after branches have no proven source mapping | Bounded metadata inventory and incremental legacy linking; no fabricated provenance or bulk rename |
| S06 | Shared mount absent but same directory exists on node disk | Verify declared storage identity before launch; directory existence alone fails readiness |
| S07 | Public Issue links to private evidence and expiring signed URL | Use permitted opaque IDs and private resolver; no credential/path disclosure or promise of public accessibility |
| S08 | Sealed manifest needs a newly created GitHub comment backlink | Append association in native study/report record; preserve sealed bytes |
| S09 | Distributed ranks and retry outputs coexist | Isolate rank writes, commit coupled bundles consistently; aggregate only accepted collection members |
| S10 | Same-disk second folder called backup | Record actual failure domain and recovery scope; no false independent-copy claim |
