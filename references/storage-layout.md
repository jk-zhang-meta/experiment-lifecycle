# Server storage and GitHub alignment

Read before remote research execution, shared result writes, storage relocation,
recovery or archive closure. The [artifact contract](lifecycle.md) owns acceptance,
invalidation and retention; [GitHub workflow](github-workflow.md) owns repository
binding and reporting; [collaboration](collaboration.md) owns execution claims.
This reference maps those contracts to storage. It introduces no scheduler,
mirrored job database, mandatory tracking product or new v1 helper schema.

## Contents

1. Establish the storage binding
2. Map identities to directories
3. Bind execution and reporting
4. Reconcile without guessing
5. Relocate, retain and restore
6. Minimal handoff example

## 1. Establish the storage binding

Before launch, reuse or create one small project storage binding in the existing
versioned project configuration/record. Record:

- GitHub host, immutable repository ID, goal and experiment references; preserve
  source-repository and collaboration-repository roles when different.
- Stable storage namespace ID, backend and declared durable root; compute scratch,
  editable checkout and retained evidence roots have distinct roles.
- How authorized hosts resolve that namespace to an actual mount/object prefix;
  record mapping revision, storage owner, permitted readers/writers and check time.
- Native job/attempt discovery, artifact commit and acceptance records, retention
  protection, capacity reservation and recovery mechanisms actually available.
- Which redacted locator fields may reach GitHub, report owner/freshness and the
  location of pending reports in existing durable execution records.

Keep private mount paths, SSH routing and access procedures in authorized private
configuration; never publish credentials or expiring signed URLs as evidence
identities. A public Issue can carry an opaque evidence ID and access limitation
when authorized; it must not expose private hostnames/paths or promise readers
access they lack. Repository access does not imply server-storage access.

Verify the intended storage is mounted/accessible under the actual execution
identity and is the declared store, not a same-named fallback directory on the
node root disk. Verify write/commit/read behavior using a bounded probe under
normal authority before expensive work. A directory existing or an NFS-looking
path is not proof of durability, locking semantics or recoverability. Record
unsupported guarantees and use a bounded supported path or block dependent work.

## 2. Map identities to directories

Identity is independent of location. Use project-native IDs with an explicit
namespace: repository/study revision, trial, physical attempt, artifact and
analysis version. A config digest identifies a recipe, not an independent seed
or a retry. Allocate intended attempt identity before submission using the
existing exclusive claim/dispatch mechanism. Independent nodes must not invent
colliding local counters; a unique directory alone does not prevent duplicate
scientific work. See the collaboration contract for fencing and takeover.

Default logical layout when no equivalent structure exists:

```text
<retained-project-root>/
  project-record                 # identity and references to native authorities
  sources/<snapshot-id>/         # retained source or verified archive reference
  studies/<study-id>/
    study-record                 # GitHub links and protocol revisions
    protocols/<revision>/        # frozen plan or exact versioned reference
    trials/<trial-id>/
      trial-record               # condition, replicate and effective recipe
      attempts/<attempt-id>/
        execution-record         # intent, native job binding and receipt links
        logs/                    # retained logs/events, including failed runs
        staging/                 # exclusive incomplete output namespace
        outputs/                 # committed immutable versions/manifests
    analyses/<analysis-id>/       # exact accepted input collection and outputs
    decisions/                   # evidence or references to authoritative decisions
  shared/                        # retained immutable reusable artifacts/references
```

These names are illustrative roles, not required filenames or duplicate copies.
An ML tracker, object store or current flat run layout may already supply them.
An existing native record can cover several roles; map its fields and links once.
Use opaque safe IDs as path components, not raw Issue titles/config strings.
Resolve paths against the authorized root, reject traversal, and verify any link
or mount boundary before writes. Shared input symlinks are not write isolation.

Do not nest physical results under mutable branch names, participants or milestone
names. Milestones have many-to-many evidence links; changing one must not move
results. Keep editable worktrees and node scratch outside retained source/output
namespaces. Never run against an actively edited worktree. Shared source/inputs
are immutable; each attempt owns its staging and mutable state. If distributed
ranks write parts of one attempt, give them disjoint producer/rank namespaces
and a designated bundle committer; they do not become independent replicas.

A retry gets a new physical attempt and parent link, even when resuming a
checkpoint. Preserve the bundled v1 distinction: its semanticAttemptId is not
this physical attempt; executionId supplies that identity. Do not change old
sealed records to adopt these illustrative names. Scratch is not accepted durable
evidence; declare continuous transfer/checkpoint cadence and its possible loss
window before using ephemeral nodes. Node loss before transfer is an explicit
retention gap, not an excuse to invent a complete receipt.

## 3. Bind execution and reporting

Use existing native records, with one writer per conflicting scope:

1. Resolve registered GitHub study/protocol and source; validate storage identity,
   capacity, input availability, permissions and monitoring. Record intended
   attempt, trial, producer namespace and remaining budget durably before submit.
2. Submit with the native operation identity; bind provider/cluster plus job ID
   and native creation/run identity as available. A PID or reusable scheduler
   number alone is insufficient across restarts. After an ambiguous response,
   reconcile the exact intent with the provider before any resubmission. If the
   provider proves no effect and supports idempotent resubmission of that intent,
   retain its intended identity; do not fabricate a physical execution that never
   occurred. A real new physical retry gets its own identity and parent link.
3. Producers commit complete partitions under the artifact contract. An upload,
   directory rename or process exit is not acceptance by itself. The destination
   manifest binds exact members, digests, sizes, parents and validation receipts.
   Preserve incomplete bytes separately. Consumers read accepted exact versions.
4. Persist terminal execution evidence separately from coverage/validity. Analysis
   binds a collection version and current invalidations; its result cannot derive
   membership from a directory glob, `latest`, or a highest-score filename.
5. At meaningful events report a compact GitHub summary: study/revision, coverage,
   native run/collection references, evidence status, decision and observed time.
   Server study/attempt records link back to the repository and experiment; GitHub
   points to an exact manifest version/digest and its resolvable storage namespace.
   Do not mutate sealed artifact manifests merely to add a later comment URL;
   append that association in the existing study/report record.
6. Record synchronization receipt and pending updates through the existing record
   surface. Distinguish terminal compute, valid evidence, milestone acceptance,
   retention and GitHub freshness. A reporting retry cannot launch compute.

The small versioned evidence index exposed through GitHub should resolve the
accepted collection and its storage mapping; large per-file inventories stay in
the store. Include schema/version, content digest and locator of that inventory.
Link referenced source/config/protocol versions rather than copying all of them
per attempt. Reuse requires retained, accessible bytes and valid lineage; links
alone are not recoverability. No new service is needed for an index of pointers.

## 4. Reconcile without guessing

At session resume, owner handoff, node failure, suspected corruption or closure,
reconcile the pinned study and declared attempts against native provider records,
accepted manifests, validity decisions, storage mappings and GitHub summaries.
Record scope, observation times, inaccessible locations and uninspected ranges.
Start from declared identities; do not recursively read all experiment payloads.
Metadata checks establish inventory; use targeted byte/digest/restore verification
for decisions that require it. Old digests are not fresh proof of accessibility.

| Observation | Required response |
| --- | --- |
| Submission uncertain; no job ID received | Query native intent/job discovery; unknown blocks conflicting dispatch, not grounds for a blind retry |
| GitHub says running; provider is terminal | Inspect receipts and output coverage; update compute status separately from result acceptance |
| Provider terminal; required transfer incomplete | Preserve staging/partials, finish verified transfer if possible; evidence closure remains incomplete |
| GitHub says complete; node/store unreachable | Mark availability unknown with time/scope; withhold new use/closure, investigate without declaring bytes deleted or science disproved |
| Required bytes confirmed lost or corrupt | Record incident and retention/integrity gap; reassess affected acceptance and descendants, preserve old verdict history |
| Live job or folder lacks a proven study link | Record an unassociated observation under scoped discovery; do not adopt, kill, move, delete or count it based on its name |
| Two attempts wrote the same logical result | Preserve both; use existing accepted-generation/fence rules, never timestamp or best score to choose |
| GitHub update failed after valid result commit | Retain pending report; reconcile/update reporting once authorized, with no repeat compute |
| Storage mapping changed | Resolve the current authorized mapping and verify identity; do not silently rewrite historical content manifests |

Persistent unknown availability follows the declared freshness/escalation policy:
record an owned incident and bounded recovery action when that threshold is met.
Escalation does not turn unknown into confirmed loss, authorize deletion, or
silently grant replacement compute. Independent valid work can continue.

An unassociated legacy folder may be linked incrementally once provenance is
established. Keep uncertainty explicit; do not retroactively claim registration.
Reconciliation is a scoped operation at declared boundaries, not permission to
install a periodic daemon or claim exactly-once effects from filesystem markers.

## 5. Relocate, retain and restore

Treat a storage namespace as a logical store, not a mutable hostname alias.
Moving bytes adds/revises a location mapping while artifact identity stays fixed.
For an authorized migration:

1. Inventory the exact immutable versions, pins, access policy and writers. For
   live logs/staging either quiesce through the execution owner or use a proven
   snapshot/transfer facility with an explicit cutover boundary. Do not copy a
   changing directory and call it complete.
2. Copy to a separate destination; verify manifest membership, bytes/digests and
   required restore behavior using destination access. Keep scientific content
   manifests intact; preserve old locator history in a separate location record.
3. The scoped owner publishes a new mapping revision only after verification;
   reconcile pinned readers and GitHub evidence pointers. Existing receipts keep
   their original mappings; readers can resolve verified replacement locations.
4. Retain the source until consumers/pins and the retention policy are satisfied.
   Relocation never implicitly authorizes source deletion or changing ownership.

A symlink, another mount of the same disk, or a second folder on that disk is not
an independent recovery copy. Record actual failure domains and verified replica
coverage, or explicitly the single-copy loss exposure. Before expensive work,
resolve that exposure against the agreed recovery contract; do not mandate an
arbitrary copy count or silently claim server retention proves backup. A GitHub
manifest protects neither large bytes nor unpushed source by itself.

Closure accounts for all produced research evidence, including failures, partials,
logs, proposals and intermediate artifacts. Report inventory/digest coverage,
access checks and actual restore scope separately. Sampling a restore cannot
certify every byte; unavailable verification remains a gap. Protect required
sources, shared artifacts and input dependencies after branch or study closure.
Directory cleanup, scratch defaults and tracker expiry cannot override retention.

## 6. Minimal handoff example

Synthetic example, using project-native field names where available:

```text
GitHub: repository ID R, experiment Issue E, study S/revision 2
Trial: T7 (recipe K, seed 3); execution: A2, retry parent A1
Provider: cluster C, job J plus native creation identity; ownership receipt O
Source/config: exact retained versions; consumed artifacts: exact parent list
Output: storage namespace N, relative key studies/S/.../A2, collection V + digest
Analysis: AN3 consumes V; validity decision revision Q
Compute: finished; evidence: incomplete (one required partition missing)
GitHub: last verified report receipt G; pending update P
```

From E an authorized reader can locate V and its actual bytes; from A2 an agent
can recover the exact study, source, owner and job without relying on chat.
AN3 is provisional if it lacks required coverage. This example is a contract,
not an installed writer, reconciler or server migration tool.
