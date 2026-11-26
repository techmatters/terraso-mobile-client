# Recovering offline edits for the v396staging → prod iOS cohort (content-diff / re-anchor plan)

**In one sentence:** on the first prod launch, for each record the client still believes is synced, check prod —
if prod is **missing it or holds an older copy**, re-point that record's sync baseline to prod and mark it
changed, so the normal push sends exactly what prod lacks (a **create** when prod is missing it). It runs once
and is a no-op for everyone outside the affected cohort.

**Status:** implemented and **pushed** on `feat/preserve-offline-edits-on-server-switch` (off `origin/main`);
checks green (`tsc` 0 errors; unit suite 590/590). **Validated locally** with a two-backend docker-compose
staging→prod run (see §14.8–14.9) — core cases passed. Not yet merged / no PR.
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

- **No wipe on this path.** The bad release — **`v396staging` (`bf3bf626`)** — predates the backend-switch
  flush (`backendSwitch.ts`), so it never recorded a backend baseline. On first launch of the **fix build**,
  `flushDataIfBackendChanged` therefore finds no prior backend and does **not** log out. The stale staging token
  then fails against prod → the shared `signOut` clears **tokens only** (never `performLogout`/`userLoggedOut`),
  and `patchPersistedReduxState` preserves the sync records on rehydration (its `merge(..., {siteSync: {}})` is a
  lodash deep-merge no-op on populated maps). **Local data survives.**
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

A record is "dirty" (unsynced) iff `revisionId !== lastSyncedRevisionId` (`isUnsynced` → `revisionIdsMatch`) —
**not** `lastSyncedData != data`. Local edits bump `revisionId` via `nextRevisionId`; a successful push sets
`lastSyncedRevisionId = revisionId`. The sync engine decides what to push purely from this bookkeeping (it never
diffs against the server), so the re-anchor **explicitly sets the record's revision + `lastSyncedData`** to
express "push this against prod."

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

## 6. Scope — which sites

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

**Excluded: internal/staff accounts.** The re-anchor is skipped entirely for internal accounts — our domains
`@terraso.org` / `@techmatters.org` (plaintext), plus two individual addresses matched by SHA-256 hash of the
lowercased email — so their staging-only test data is never pushed to prod. See `isInternalAccount`
(`model/sync/internalAccounts.ts`), checked in `ReanchorDispatcher` (which marks the done flag and skips the
fetch/push). This mirrors the server migration's internal-account exclusion; the two paths are otherwise
independent.

---

## 7. Implementation — Option B (dedicated thunk)

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

## 9. Base branch: `main`

Implemented on **`feat/preserve-offline-edits-on-server-switch`**, branched from **`origin/main`**. Main is the
maintainable home (no orphan branch; benefits from the in-flight upsert / `remove-isNew` work), and its extra
commits are cleared for release.

The alternative — basing on `bf3bf626` (396b) for minimal blast radius — would be an orphan requiring a
forward-port, so main is preferred.

---

## 10. Complexity

**Moderate-small.** Net new code ≈ one thunk + one reducer + one dispatcher component + one flag + one
`pullAllowed` gate. **All the hard parts (fetch, push, ownership, upsert, retry, partial-failure) are reused
unchanged**, and the "content comparison" reuses the existing per-entity diff functions (no new comparator).
Riskiest elements:

1. The **ordering guard** — `!reanchorPending` must reliably block the pull until re-anchor completes (holds for
   *every* user's first launch, since the trigger is unconditional).
2. Applying the transitions **uniformly across all three entity types**. Diff helpers: sites →
   `getChangedSiteFields` + note diffs (`siteDiff.ts`); soilData → `getChangedSoilDataFields` +
   `getChangedDepthIntervals` / `getChangedDepthDependentData` / `getDeletedDepthIntervals` (`soilDataDiff.ts`);
   soilMetadata → **no field-diff helper** (its push sends the whole `userRatings`), so `soilMetadataDiffers`
   compares normalized ratings (drop null ratings → `{soilMatchId, rating}` → sort → `isEqual`).

Non-issues: the fetch is separable (`pullUserData` is fetch-only); scope is "all local writable, server governs
permission," so no client-side permission filter is needed.

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
2. **Base: `main`.** Branch `feat/preserve-offline-edits-on-server-switch` off `origin/main`. Extra commits on
   main are cleared for release; main is the maintainable home.
3. **Impl option: (B) dedicated thunk.** `syncService.pullUserData` is fetch-only, making B clean; it keeps the
   hot pull-merge path untouched and is cleanly deletable once the cohort has migrated. See §7.
4. **Shared-site clobber: accept LWW.** No version guard.

### Implications of "all updaters, once"
- Normal prod users (not the cohort) also run the re-anchor once: it fetches prod, finds local == prod for their
  records (no diff) → **no pushes**. Cost is one prod fetch + a no-op pass. Harmless and self-terminating.
- Because it's unconditional, the **ordering guard** (don't let the normal pull clobber before the re-anchor
  runs) must hold for *everyone's* first launch, not just the cohort.

---

## 14. Testing

### 14.1 Record states to exercise
The re-anchor only touches records the client believes are **synced**, so set up records in each state before
switching to prod:

| Record | How to create it | Expected on prod after fix |
|---|---|---|
| **Equal** | synced to staging, migrated, *not* edited | re-anchor no-op (migration already covered it) |
| **Present-but-stale** | synced to staging + migrated, then edited **online** | re-anchor **UPDATE** → edited value (not reverted by the pull) |
| **Synced-but-absent** | created **online** *after* the migration ran | re-anchor **CREATE** |
| **Never-synced** | created **offline**, never reached staging | normal push **CREATE** (re-anchor skips it) |
| **Pending offline edit** | synced site edited **offline** (still unsynced) | normal push **UPDATE** (re-anchor skips it) |
| **Internal account** | any of the above on an `@terraso.org` / hashed account | re-anchor **skipped entirely** — nothing pushed |

### 14.2 Local setup
Prefer **two local backends** (mimics the real staging→prod URL change; keeps tokens/DBs cleanly separate):
- Staging server (port A, staging DB) and prod server (port B, prod DB).
- Build **v396** with `TERRASO_BACKEND` → staging server; build the **fix** app → prod server.
- *(Alternative: one server, swap the DB and restart — simpler, but the backend URL doesn't change and the
  staging token's behavior against the swapped DB is murkier. Two servers is cleaner.)*

### 14.3 Steps
1. Start both servers from copies of the respective DBs. Install **v396** (→ staging) on a device/simulator; log
   in as a **test (non-internal)** account.
2. **Online:** create sites **A** and **B** (they sync to staging).
3. Run the **staging→prod copy script**. Prod now has A, B.
4. **Online:** edit **A → A′** (syncs); create **C** (syncs to staging, but prod won't have it — migration
   already ran).
5. **Go offline** (airplane mode): create **D** and edit **B → B′**. These stay **unsynced** on the device.
   *(This step is why offline mode matters: it's the only way to produce the never-synced (D) and
   pending-offline-edit (B′) states.)*
6. Kill the v396 app. Launch the **fix** app (→ prod); it should fail the stale staging token → re-login to the
   **same prod account**. The re-anchor runs (pull held off), then the push flushes.
7. **Verify on prod once it settles:** A = **A′**, B = **B′**, **C created**, **D created**; no duplicates, UUIDs
   preserved. The A = A′ check is the **clobber-guard** proof (the pull must not revert A′ to A).
8. Relaunch the fix app: the re-anchor does **not** run again (flag set); no spurious re-pushes.

### 14.4 Also verify
- **Internal account:** repeat as an `@terraso.org` (or hashed) user → re-anchor skipped; its staging-only sites
  are **not** on prod.
- **No-op for normal prod users:** a device already on prod (no staging data) → one fetch, zero pushes, flag set.

### 14.5 Device / TestFlight
After local validation, run the real path once in TestFlight: a device carrying real `v396staging` state →
install the fix build → re-login to prod → confirm the states above land correctly.

### 14.6 Watching it run (console)
The re-anchor logs each decision when `SYNC_DEBUG_ENABLED=true` (gated by `syncDebugEnabled`). Expect lines
like `🔁 re-anchor[site] <id>: differs from prod → mark for UPDATE` / `prod has no copy → mark for CREATE` /
`matches prod → skip` / `already unsynced → skip`, a per-entity summary (`N local → c create, u update, s
skip`), plus lifecycle lines (fetching / complete / internal-account skip / retry).

### 14.7 Serial build workflow (one device, rebuild in place)
You don't need two apps installed at once — and you *can't* use two, because the test depends on the **same
app's local data carrying over** (exactly like an App Store in-place update). Two builds would need different
bundle IDs → separate data containers → no carry-over. So run it serially on one device/simulator:

1. **Phase 1 — build real `v396staging` (`bf3bf626`) → staging (`…:8001`).** `git checkout bf3bf626`, set
   `TERRASO_BACKEND` to the staging server, build/install, and do steps 1–5 (create/edit sites, run the
   migration, go offline for D and B′).
2. **Phase 2 — rebuild the fix branch → prod (`…:8002`).** `git checkout` the fix branch, set `TERRASO_BACKEND`
   to the prod server, **reinstall over the existing app** (do **not** uninstall/erase), and launch.
3. Re-login to the **prod** account on 8002; let the re-anchor + push run; verify.

**Non-negotiables:**
- **Phase 1 must be real `v396`, not the fix branch.** v396 has no `backendSwitch`, so it never writes
  `LAST_BACKEND_KEY` — which is what lets the fix build's first launch find no baseline and **not wipe**. Using
  the fix build for phase 1 would instead (a) trip `backendSwitch` on the 8001→8002 change and `performLogout`
  (wiping the test data), and (b) consume the one-time `prod-reanchor-done` flag in phase 1 so phase 2 wouldn't
  re-anchor.
- **Reinstall over, never uninstall/erase.** Same bundle ID (+ same Android debug keystore) preserves MMKV /
  redux-persist. Sanity check: right after installing the fix build, *before* re-login, the app should still
  show the staging sites — that confirms local data survived.
- **Token note:** aim to end phase 2 authenticated to the prod account; if the two local servers share signing
  secrets the staging token may not auto-reject — just sign out/in to land on prod.

**Lighter variant (no v396 rebuild):** use one server URL and swap which DB it serves (staging→prod) between
phases, with the fix build for both — `backendSwitch` sees no URL change (no wipe), no rebuild needed. The catch:
clear the `prod-reanchor-done` MMKV flag before phase 2 (phase 1 sets it; use the dev `KvStorageEditor`). Less
faithful (phase 1 isn't really v396), but lighter.

### 14.8 Concrete local run (two docker-compose backends) — as executed
This is the exact recipe that worked, with the gotchas we actually hit.

**Backends.** One postgres container with two DBs (`terraso_staging`, `terraso_prod`); a staging web container on
`:8001` and a prod web container on `:8002`. On a **physical device**, `TERRASO_BACKEND` must be the Mac's **LAN
IP** (e.g. `http://192.168.x.x:8001`), not `localhost`.

**Prerequisites / gotchas (each one bit us):**
- **S3/MinIO "silo" must be running.** If it's down, the pull fails with `terraso_api.error_request_response`
  (the backend can't build the user's profile-image URL: `EndpointConnectionError … silo…:9000`). The push
  doesn't need it, so sites still save — but pulls break. Fix: `docker start terraso-backend-s3-1
  terraso-backend-s3-init-1`.
- **Clean install before Phase 1.** A prior fix-build run leaves `LAST_BACKEND_KEY` and `prod-reanchor-done` in
  MMKV (both survive reinstall). **Delete the app** before building v396, or Phase 2 will wipe/skip.
- **Building v396 (`bf3bf626`) needs `npm install` + `npm run prebuild`** first — its deps/SDK differ from the fix
  branch. (And v396 predates `#3397`, so cleartext `http://` to a local backend may be blocked by ATS.)
- **Un-exclude the test account** in the client: comment out its hash in
  `dev-client/src/model/sync/internalAccounts.ts` for the Phase-2 build; **revert before committing**.
- **"Forced offline" dev toggle** holds offline edits unsynced (overrides the real network). Turn it **OFF** in
  the fix build so the re-anchor can reach prod (its dispatcher is gated on `!isOffline`).

**Migration (`merge_staging_to_prod`) — the cutoff is counter-intuitive.** `--cutoff` selects staging users
**created ON/AFTER** the date (the new-signup cohort). An existing test account created long ago is **excluded**
by a recent cutoff — you'll get `0 rows`. Use a cutoff **on/before the test user's `created_at`**:
```bash
cd ~/techmatters/terraso-backend
docker compose --env-file ~/secrets/terraso-backend/.env \
  -f docker-compose.base.yml -f docker-compose.dev.yml run --rm \
  -e DATABASE_URL=postgres://postgres:postgres@db:5432/terraso_prod \
  -e STAGING_DATABASE_URL=postgres://postgres:postgres@db:5432/terraso_staging \
  web python terraso_backend/manage.py merge_staging_to_prod \
  --cutoff <on-or-before the test user's staging created_at> --commit --manifest /app/migrated.csv
```
*(The server migration's exclusion list — `terraso.org`/`techmatters.org` + `derektestcaelin@gmail.com` — does
**not** match the client's, which also excludes `schmidtparty.com`. Reconcile before shipping.)*

**Verify in the DB, not just the logs** (sites/notes per DB):
```bash
docker exec -e PGPASSWORD=postgres terraso-backend-db-1 psql -U postgres -d terraso_prod -c \
 "select s.name, left(s.id::text,8) id8, count(n.id) notes
    from project_management_site s left join project_management_sitenote n on n.site_id=s.id
   where s.name in ('AAA','BBB','CCC','DDD') group by s.name,s.id order by s.name;"
```
Note: **names can collide** — a site name may already exist in prod under a different UUID. Always match by **ID**,
not name.

### 14.9 Results & findings from the first local run
The run **passed**: prod ended with AAA updated (note landed), BBB correct, CCC and DDD created, UUIDs preserved,
no real duplicates (one apparent "CCC x2" was a pre-existing name collision). A **relaunch** then confirmed the
one-time guard — no re-anchor ran (flag set), just a clean pull. Findings worth carrying forward:

1. ✅ **Stale-token path works end-to-end.** First launch tried the stale staging session → `account.
   unauthenticated_message` → `re-anchor: fetch failed → will retry`; after prod re-login it ran and succeeded.
2. 🎁 **The re-anchor recovered `soilMetadata` (user ratings) the server migration didn't carry.** In this run
   the migration had no ratings, so the re-anchor flagged several `soilMetadata … differs → UPDATE` and pushed
   them. The backend copy has since been **fixed separately to carry ratings**, so the re-anchor is now a
   **backstop** for them (once the migration brings ratings over, the re-anchor finds them matching → skip).
3. ⚠️ **Benign push/re-anchor race.** The normal push (flushing already-unsynced records) can overlap the
   re-anchor's prod *fetch*, so the re-anchor may mark a record CREATE against a pre-push snapshot even though the
   push already created it. UUID idempotency keeps the outcome correct (no duplicates), at the cost of a
   redundant re-push. If idempotency were ever weakened, gate the push until the re-anchor completes.
4. ℹ️ **The "prod-stale + pending-offline-edit" corner did not misbehave** in this run (BBB came out correct). It
   remains worth a dedicated probe if you want certainty on that specific edge.

---

## 15. FYI: what the fix build carries from main beyond v396

The fix build is `main` + this re-anchor work, so it also ships the **14 commits that landed on main after
`v396staging` (`bf3bf626`)** — linear between the two. The raw diffstat looks huge (~103 files) but is dominated
by the SDK/Node lockfiles and translation files; the real app-code delta is small. This is informational — the
extra commits were already cleared for release.

**Changes that actually shift shipped behavior (smoke-test these):**
- `e27a68cd` **Expo SDK 58** (#3388) and `b4df554f` **Node 22.23.4** (#3389) — the main risk surface
  (native/runtime bump); worth a device smoke test.
- `92c26f28` **flush local data when the backend server changes; allow logout with unsynced changes** (#3374) —
  the `backendSwitch` feature this plan composes with.
- `9e2cb178` **elevation: refresh token + retry on UNAUTHENTICATED; stop Sentry noise** (#3382) — touches the
  token-refresh path adjacent to the stale-token re-login.
- `16928cf1` **version → 1.4.9** (#3378).
- UX fixes: `3110027d` keyboard no longer covers the edited field (#3392); `24204e4a` delete-account asks for
  feedback (#3391); `b7931da9` minor carousel UI (#3380).

**Dev-only / tooling / content (no prod impact):** `bef19565` cleartext HTTP in non-prod builds (#3397);
`7a49d03c` dev keep-screen-awake setting (#3396); `2dcd8a9a` three-terminal dev w/ shared Metro (#3383);
`73322b4e` ios-simulator skill docs (#3400); `0b633b73` `update-version` npm script (#3379); `b2b3c7ca` POEditor
translation sync (#3381).
