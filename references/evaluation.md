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
