# Recovering offline edits for the v396staging → prod iOS cohort (content-diff / re-anchor plan)

**Status:** implemented on branch `feat/preserve-offline-edits-on-server-switch` (off `origin/main`); checks
green (`tsc` 0 errors; sync-area unit tests 95/95). **Not yet committed — under review.** §3 and §7 are the
authoritative, corrected (revisionId-based) mechanism.
**Scope of problem:** iOS only. `v396staging` (commit `bf3bf626`, build 396) was accidentally released to
customers built against **staging**. The prod fix build they auto-update to must recover the edits they made
while on staging. Android correctly shipped `v395` prod and is unaffected.

---

## 1. Objective

When a `v396staging` user updates to the prod fix build and re-authenticates against prod, **their local
edits must land in their prod account** — covering both data buckets:

- **Never-synced** offline edits (created offline, never reached any server).
- **Synced-to-staging** edits where prod's copy is **absent or stale** (the subtle gap).

In scope: **all sites the user created or can write** (personal *and* project sites they own/created), plus
their **soil data** and **soil metadata**. Out of scope: offline **deletions** (no tombstones), and any
server-side concurrency/version guard.

---

## 2. Facts we rely on (verified in code)

- **No wipe on this path.** `backendSwitch.ts` is absent in `bf3bf626`; the stale-token auth failure calls
  the shared `signOut` (clears **tokens only**), never `performLogout`/`userLoggedOut`;
  `patchPersistedReduxState` preserves the sync records (its `merge(..., {siteSync: {}})` is a lodash deep-merge
  no-op on populated maps). **Local data survives.**
- **Ownership is server-inferred from the auth token.** The site push payload (`unsyncedSitesToMutationInput`)
  carries **no owner field**, so prod attaches pushed sites to the **re-authenticated prod user** automatically.
- **The gap.** The client pushes only `isUnsynced` records (`revisionId != lastSyncedRevisionId`). Records
  already synced to staging look "clean" locally → never pushed to prod. **And** the prod pull *clobbers*
  local-newer with prod-stale: `mergeUnsyncedEntities` does `mergedData = {...prodData}` then overlays only the
  *unsynced* locals, so a synced-but-stale local record is overwritten by prod's copy on the first pull.
- **Migration composes.** The server-side staging→prod copy is idempotent, UUID-preserving, skip-existing, and
  composes with client pushes without duplicates.

---

## 3. Core mechanism — one-time "re-anchor to prod"

**Important correction to the naive framing:** "dirty" is **not** `lastSyncedData != data`. A record is unsynced
iff `revisionId !== lastSyncedRevisionId` (`isUnsynced` → `revisionIdsMatch`). Local edits bump `revisionId`
via `nextRevisionId`; a successful push sets `lastSyncedRevisionId = revisionId`. So the re-anchor must
**explicitly set the record's revision + `lastSyncedData`** — it does not fall out for free.

On the first prod sync, we fetch prod's current data and, **only for records the client currently thinks are
synced** (`!isUnsynced`), reconcile each against prod:

| case | record transition | resulting push |
|---|---|---|
| prod **absent** | `modifiedRecord({...r, lastSyncedData: undefined, lastSyncedRevisionId: undefined})` | **CREATE** (`isNew`, client UUID) |
| prod **present & differs** | `modifiedRecord({...r, lastSyncedData: prod, lastSyncedRevisionId: r.revisionId})` | **UPDATE** — delta is `getChangedSiteFields(local, prod)` |
| prod **present & equal** | *(untouched)* | none |
| record **already unsynced** | *(untouched — normal push handles it)* | normal |

Why these are correct:
- `modifiedRecord` sets `revisionId = nextRevisionId(prev)` (defined, > any prior), so `revisionId !==
  lastSyncedRevisionId` → **unsynced** → it will push.
- `lastSyncedData = undefined` → `isNew` → **CREATE**; `lastSyncedData = prod` → not-new → **UPDATE**, and
  because the update delta is computed against `lastSyncedData`, anchoring it to prod makes the push send exactly
  **local − prod**.
- **"Differs" reuses the existing diff functions** (`getChangedSiteFields` + the note-diff helpers; the soil
  equivalents): empty diff ⇒ equal ⇒ skip. **No new comparator** — and guaranteed consistent with what the push
  would actually send.

**Scope note:** acting only on currently-*synced* records means normal users' in-flight edits (already unsynced)
are never disturbed, and never-synced offline creates keep flowing through the normal push unchanged. The
re-anchor touches **only the gap**: records the client believes are synced but prod is missing or stale.

---

## 4. Why it must be ONE-TIME (correctness, not just optimization)

The re-anchor deliberately makes **local win over prod** — correct *only* for the staging→prod transition,
where the device holds the user's authoritative edits and prod only has migration copies.

In **steady state that semantic is wrong**: prod can legitimately be newer (another device, or server-side
change), and the normal pull *should* bring those down (prod wins for clean records; local wins only for
genuinely dirty records). If the re-anchor ran on every sync, this device would **perpetually overwrite prod /
other-device updates with its own local copy** — a permanent clobber loop.

After one successful run the bookkeeping is honestly anchored to prod, and normal sync is correct forever.
So:

- It runs **until it first succeeds** (retried on prod-fetch failure — the "done" flag is set *only after* a
  successful re-anchor), then **never again**.
- Push failures *after* a successful re-anchor need no re-run: the dirty flags persist and the normal
  `PushDispatcher` retry (60s) finishes the job. The mechanism is resumable without repeating the re-anchor.

---

## 5. Sequence on first prod launch

1. Stale staging token → 401 → token-only `signOut` → user re-logs into their **prod** account.
2. First successful prod auth, `prodReanchorDone` flag unset → run the **re-anchor pass** while the normal
   (clobbering) pull is held off by the `!reanchorPending` gate:
   1. Fetch prod's current in-scope sites/soil/metadata (`syncService.pullUserData`).
   2. For each record the client currently thinks is **synced** (`!isUnsynced`), apply the §3 transitions:
      prod-absent → recreate (`modifiedRecord` + `lastSyncedData = undefined`); prod-present-&-differs → anchor
      `lastSyncedData = prod` + `modifiedRecord` (→ unsynced UPDATE, delta `local − prod`); prod-present-&-equal
      → leave untouched. Already-unsynced records (never-synced creates, pending edits) are left for normal push.
3. `PushDispatcher` flushes the now-dirty records (create/update, server-inferred owner, retry, partial-failure
   surfaced to the user).
4. Normal pull resumes once `unsyncedSiteIds.length === 0`; its merge preserves what we just pushed.
5. Set the persisted `prodReanchorDone` flag → never runs again.

---

## 6. Scope — which sites (updated per review)

Recover **everything the user can write**, not just personal sites:

- **Never-synced sites (created offline)** — always push as CREATE, personal *or* in a project. **No clobber
  risk** (prod doesn't have them). Server enforces project-create permission; a rejection surfaces as a
  partial failure.
- **Synced sites the user owns / can edit** — re-anchor + push (create if prod-absent, update if prod-differs).
- Soil data and soil metadata follow their parent site's scope.

**Determination of "can write":** the client attempts the push for in-scope local records; **the server is the
final authority** on permission (`NOT_ALLOWED` is surfaced, not silently dropped). "Created offline" is a
reliable local signal (`lastSyncedData === undefined`); ownership of already-synced sites is ultimately decided
server-side on the authenticated prod user.

**Caveat on shared/project sites:** for a site with *multiple editors*, "local wins" is **last-writer-wins** and
could overwrite a collaborator's newer prod edit. That matches the app's current LWW behavior; the proper fix
(a server-side version guard) is explicitly out of scope. For sole-authored sites (the common case here) this
is safe.

---

## 7. Implementation — Option B (dedicated thunk), confirmed

Chosen because **`syncService.pullUserData(userId)`** (terraso-client-shared `soilId/syncService.ts`) is
**fetch-only** — it returns `{sites, soilData, soilMetadata, ...}` with **no merge** — so re-anchor can fetch
prod data without touching the generic pull/merge path. Option A (patch the three `mergeUnsyncedEntities`
call-sites) was rejected: it burdens the hot path used by every normal sync forever.

### Files

| # | File | Change |
|---|---|---|
| 1 | `dev-client/src/model/sync/reanchorThunk.ts` *(new)* | `createAsyncThunk` wrapping `syncService.pullUserData(userId)`; returns prod data |
| 2 | `dev-client/src/model/sync/reanchorReducer.ts` *(new)*, or extend sync slice | Reducer that applies the §3 transitions to `siteSync` / `soilSync` / `soilMetadataSync` |
| 3 | `dev-client/src/store/sync/ReanchorDispatcher.tsx` *(new)* | Mirrors `PullDispatcher`; fires once when logged in + `!reanchorDone`; sets the flag on success |
| 4 | `dev-client/src/store/sync/PullDispatcher.tsx` | Add `!reanchorPending` to the `pullAllowed` condition (lines ~45-49) |
| 5 | sync slice (`syncSlice`) + `dev-client/src/persistence/kvStorage.ts` flag | `reanchorDone`/`reanchorPending` state; persisted via a `prodReanchorDone` MMKV bool (mirror `backendSwitch.ts`) |
| 6 | `dev-client/src/app/AppContent.tsx` | Mount `<ReanchorDispatcher/>` ahead of `PullDispatcher` |
| — | `PushDispatcher`, `pushUserData`, partial-failure notifications, retry | **reused unchanged** — the newly-dirtied records flush automatically |

### Re-anchor reducer algorithm (per entity type: site, soilData, soilMetadata)

```
now = Date.now()
for id in Object.keys(localData):               // state.site.sites, soilData.soilData, soilMetadata.soilMetadata
  record = records[id] ?? initialRecord(undefined)
  if isUnsynced(record): continue               // leave in-flight edits to normal push
  prod = prodData[id]
  if prod === undefined:
    records[id] = modifiedRecord(               // → CREATE (isNew), client UUID
      {...record, lastSyncedData: undefined, lastSyncedRevisionId: undefined, lastSyncedError: undefined}, now)
  else if DIFF(localData[id], prod) is non-empty:   // DIFF = getChangedSiteFields + note diffs / soil equivalents
    records[id] = modifiedRecord(               // → UPDATE, delta = local − prod
      {...record, lastSyncedData: prod, lastSyncedRevisionId: record.revisionId, lastSyncedError: undefined}, now)
  // else equal → untouched
```

### Control flow

1. Prod login completes (`PullRequester` already detects `currentUserID` undefined→defined).
2. `ReanchorDispatcher` sees logged-in + `prodReanchorDone` flag unset → sets `reanchorPending`, dispatches
   `reanchorThunk` (fetch prod).
3. On fulfilled: reducer applies the transitions above across the three `*Sync` maps; set `prodReanchorDone`
   (MMKV) + clear `reanchorPending`. On failure: leave the flag unset so it retries next launch.
4. `PullDispatcher` was blocked (`!reanchorPending`) during step 2-3, so no clobber.
5. Newly-dirtied records trip `PushDispatcher.needsPush` → flush (create/update, server-inferred owner, retry,
   partial-failure surfaced). Normal pull resumes once `unsyncedSiteIds.length === 0`.

---

## 8. Server dependency — and exactly when the staging→prod migration is needed

### 8.1 The two data buckets
- **Bucket A — never-synced offline edits.** Created on the bad app while offline; never reached *any* server.
  Exist **only on the device**.
- **Bucket B — synced-to-staging data.** Pushed to staging successfully; exist **on staging** (and on the device
  until local state is wiped).

### 8.2 What wipes the device's local copy (on the bad `v396staging` app)
- **Manual sign-out** → `performLogout`/`userLoggedOut` → MMKV wipe. **Wipes.**
- **Uninstall / reinstall.** **Wipes.**
- In-place app update (stay logged in), and the stale-token auth-failure `signOut` (tokens only) → **do NOT
  wipe.**

### 8.3 Who can recover what

| Bucket | Client re-anchor recovers it? | Server migration recovers it? |
|---|---|---|
| **A** (never-synced) | ✅ **only** if local survived (in-place update, no logout/uninstall) | ❌ never — it never reached staging |
| **B** (synced-to-staging) | ✅ if still on the device | ✅ always, while staging still holds it |

### 8.4 Cases where the server migration IS needed (its unique value)
The migration is the **only** path to prod for **Bucket B** whenever the device copy is gone or the device
won't run the re-anchor:

1. **User signed out on the bad app before updating** → local wiped → B lives only on staging → migration
   recovers B. *(Bucket A is already lost — see 8.6.)* **← the case you identified.**
2. **User uninstalled, then installed the fix build fresh** → local gone → same as (1): B via migration.
3. **User moves to the fix build on a different device** (new iPhone, or Android/web on prod) → the new device
   never had the local data → re-anchor has nothing to push → B via migration.
4. **Staging decommission / future-proofing** → preserves B in prod for users who haven't moved yet (they won't
   *see* it until they move, but it isn't lost when staging is retired).
5. **Backstop** for in-place users (case in 8.5) if the client re-anchor fails on some records (push errors,
   bugs) — migration independently guarantees B reaches prod.

### 8.5 Case where the migration is NOT needed (client alone suffices)
- **In-place update, stayed logged in, same device.** Local holds both buckets. Re-anchor pushes all
  device-resident A **and** B (create where prod-absent, update where prod-stale). Migration would be redundant
  here (and composes without dups anyway: UUID-preserving + idempotent + skip-existing).

### 8.6 Unavoidable loss — call this out to stakeholders
**Bucket A for any user who signed out or uninstalled the bad app before updating is permanently
unrecoverable** — it never reached staging (so migration can't help) and the local copy is gone (so the client
can't either). No mechanism recovers it.

### 8.7 Client-side server contract (unchanged from before)
- **None required against current prod** for the re-anchor: "present-but-stale" → UPDATE to an existing site
  works; "synced-but-absent" → forced CREATE with client UUID works. Create-vs-update is derived from **prod
  presence**, not staging's stale `lastSyncedData`.
- **Optional:** pairing with the pending "update → true upsert" removes any create/update ordering fragility.

### 8.8 Net
Ship **both**: the client re-anchor is the *only* way to save Bucket A (for the in-place cohort), and the
migration is the *only* way to save Bucket B for the logged-out / reinstalled / different-device cohorts. They
cover disjoint gaps and compose without duplicates.

---

## 9. Base branch — DECIDED: `main`

Implemented on **`feat/preserve-offline-edits-on-server-switch`**, branched from **`origin/main`**. Rationale:
main is the maintainable home (no orphan branch; benefits from the in-flight upsert / `remove-isNew` work), and
its extra commits are cleared for release.

*Considered and rejected:* basing on `bf3bf626` (396b) for minimal blast radius — rejected because it would be
an orphan requiring a forward-port, and main is acceptable to ship.

---

## 10. Complexity

**Moderate-small.** Net new code ≈ one thunk + one reducer + one dispatcher component + one flag + one
`pullAllowed` gate. **All the hard parts (fetch, push, ownership, upsert, retry, partial-failure) are reused
unchanged**, and the "content comparison" reuses the existing per-entity diff functions (no new comparator).
Riskiest elements, now narrowed:

1. The **ordering guard** — `!reanchorPending` must reliably block the pull until re-anchor completes (holds for
   *every* user's first launch, since the trigger is unconditional).
2. Applying the transitions **uniformly across all three entity types**. Diff helpers (confirmed in
   implementation): sites → `getChangedSiteFields` + note diffs (`siteDiff.ts`); soilData →
   `getChangedSoilDataFields` + `getChangedDepthIntervals` / `getChangedDepthDependentData` /
   `getDeletedDepthIntervals` (`soilDataDiff.ts`); soilMetadata → **no field-diff helper** (its push sends the
   whole `userRatings`), so `soilMetadataDiffers` compares normalized ratings (drop null ratings → `{soilMatchId,
   rating}` → sort → `isEqual`).
3. Resolved risks: fetch **is** separable (`pullUserData` is fetch-only); scope is "all local writable, server
   governs permission" so no client-side permission filter is needed.

**Test list**
- Reducer unit tests per entity type: prod-absent→CREATE, prod-present-&-differs→UPDATE(delta=local−prod),
  prod-present-&-equal→no-op, already-unsynced→untouched.
- Revision-transition assertions: after transition `isUnsynced` is true and `isNew` is correct.
- Gate test: pull does not dispatch while `reanchorPending`.
- Idempotency: second launch (flag set) does nothing; interrupted fetch (flag unset) retries.
- **TestFlight the real upgrade path:** device carrying v396staging state → install fix build → re-login to prod
  → confirm never-synced creates *and* synced-but-stale updates both land in prod; confirm a normal prod user
  sees a no-op pass.

---

## 11. Pros / Cons

**Pros**
- No server change required; works against current prod.
- **Self-terminating** — no flag-lifecycle loops (unlike a server "migrated" marker).
- Reuses the already-verified push path end to end.
- **Minimal churn** — only genuinely-different records re-push (little timestamp/history noise).
- Precise: correctly distinguishes absent / stale / equal.

**Cons**
- Needs the **pull-ordering guard** — the one genuinely fiddly piece.
- **Can't disambiguate** "prod stale-migration" from "prod legitimately newer (another device)" → a multi-device
  or shared-project user could clobber a newer prod record (LWW). Mitigated for sole-authored data; a version
  guard is separate / out of scope.
- Requires an extra prod fetch at the re-anchor moment.
- Still depends on the migration for data not present on the device.
- A real client change (not zero-diff 396b).

---

## 12. Edge cases / explicit calls

- **Deletions:** not propagated (no tombstones) — out of scope; flag the risk to users.
- **Timestamps/history:** restamped to now — acceptable.
- **Apple Hide-My-Email:** data binds to whatever prod account they land on; must be the same account.
- **Shared/project sites:** included (per scope), but LWW clobber risk noted above.
- **Partial failures:** surfaced to the user; retries continue every 60s.

---

## 13. Decisions

1. **Cohort trigger: ALL updaters, once.** Fire on first launch of the fix build after a successful prod auth,
   gated by the persisted `prodReanchorDone` flag. No cohort detection. Normal prod users incur one harmless
   idempotent no-op pass.
2. **Base: `main` — DECIDED.** Branch `feat/preserve-offline-edits-on-server-switch` created off `origin/main`.
   Extra commits on main are cleared for release; main is the maintainable home.
3. **Impl option: (B) dedicated thunk — CONFIRMED.** `syncService.pullUserData` is fetch-only, making B clean;
   it keeps the hot pull-merge path untouched and is cleanly deletable once the cohort has migrated. See §7.
4. **Shared-site clobber: accept LWW.** No version guard.

### Implications of "all updaters, once"
- Normal prod users (not the cohort) also run the re-anchor once: it fetches prod, finds local == prod for their
  records (no diff) → **no pushes**. Cost is one prod fetch + a no-op pass. Harmless and self-terminating.
- Because it's unconditional, the **ordering guard** (don't let the normal pull clobber before the re-anchor
  runs) must hold for *everyone's* first launch, not just the cohort.
