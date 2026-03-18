# Bidirectional Localization Merge

Algorithm for syncing translations between local files (git) and POEditor.

Implemented in `scripts/localization/poeditor-merge.mjs`.

## Usage

```bash
npm run poeditor-merge -- --dry-run              # detect conflicts and preview changes, no modifications
npm run poeditor-merge                           # full merge
npm run poeditor-merge -- --verbose              # full merge with detailed logging and change preview
npm run poeditor-merge -- --no-commit            # merge but skip commit/tag (for testing)
npm run poeditor-merge -- --project <id>         # use a different POEditor project (e.g. test project)
npm run poeditor-merge -- --project <id> --no-commit  # test against a test project
npm run poeditor-merge -- --help                 # show usage help
```

### Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Detect conflicts and generate change report, without modifying any files or POEditor state. |
| `--no-commit` | Do everything (upload, download, convert) but skip the commit and tag. Prints modified files and restore instructions. Useful for testing against a test project. |
| `--verbose` | Show detailed logging: commands run, byte counts, file staging decisions. |
| `--project <id>` | Override `POEDITOR_PROJECT_ID` from `.env`. Useful with test projects (see `poeditor-create-test-project`). |
| `--help` | Show usage help and exit. |

## Prerequisites

- `POEDITOR_API_TOKEN` and `POEDITOR_PROJECT_ID` in `.env`
- The git tag `translations/latest` must exist, pointing to the last sync commit. On first use, create it manually:
  ```bash
  git tag translations/latest <commit>
  ```

## Assumptions

- English (`en.json`) is the source language, edited locally.
- Non-English translations are primarily edited in POEditor by translators, but may also have local fixes.
- All local changes (including non-English) should be made to the `.json` files in `src/translations/`, not PO files. The merge script converts JSON to PO for diffing and upload.
- Git tags mark sync points. `translations/latest` always points to the most recent sync, and each sync also gets a timestamped tag like `translations/20260309T1709Z`.
- PO files are the interchange format (JSON <-> PO conversion via existing scripts).

## Algorithm

### Pre-flight checks

Before any work (skipped in `--dry-run` mode):

1. Verify `translations/latest` tag exists.
2. Check that `locales/po/`, `src/translations/`, and `locales/po-save/` have no uncommitted changes (staged, unstaged, or untracked). This ensures you can always restore files after a `--no-commit` test run.

### Phase 0: Detect conflicts (read-only)

For each language:

1. Convert local `src/translations/{lang}.json` to PO in memory.
2. Get the PO at the `translations/latest` tag via `git show` (the baseline).
3. Download the current PO from POEditor.
4. Diff local PO vs baseline to get **local changes**.
5. Diff POEditor PO vs baseline to get **POEditor changes**.
6. If any term was changed on both sides **to different values**, record it as a conflict.

If any conflicts exist: print all of them and **stop**.

An HTML change report is always generated (in a temp directory) showing what will upload/download, with word-level diffs for changed entries. The report opens automatically in the default browser.

If `--dry-run`: generate the report and **stop** (no files modified).

**po-save:** For languages with local changes (i.e., languages that will be uploaded), the downloaded POEditor PO is saved to `locales/po-save/{lang}.po` before any uploads happen. This records the "before" state of POEditor, so you can review or diff what changed on the POEditor side. These files are included in the sync commit. Skipped in `--dry-run` mode.

Note: if both sides changed a term to the **same** value, that is convergent agreement, not a conflict.

### Phase 1: Upload English

If there are local English changes, upload the locally-generated `en.po` to POEditor with `--sync-terms --fuzzy-trigger`.

- `--sync-terms` adds new terms and removes deleted ones.
- `--fuzzy-trigger` marks corresponding translations in other languages as fuzzy, so translators know to review them.

### Phase 2: Upload other languages

For each non-English language that has local changes:

- Build a **partial PO** containing only the changed/added entries. This avoids overwriting POEditor-only translations.
- All entries are marked with `#, fuzzy` in the PO file, so translators can review them in POEditor.
- Entries starting with `TK ` (placeholder translations) are skipped — they are not uploaded.
- Upload to POEditor (without `--fuzzy-trigger` — fuzzy is set per-entry in the PO file instead).
- Respect rate limits (21s) between uploads.

### Phase 3: Download, convert, commit, tag

1. Run `localization-to-po` to regenerate `locales/po/en.po` from `en.json`.
2. Run `poeditor-download` to download non-English PO files from POEditor.
3. Run `localization-to-json` to regenerate all JSON files from PO.
4. If no files actually changed (and no po-save files exist), print "Already in sync" and exit.
5. If `--no-commit`: list modified files, print restore instructions, open the change report, and **stop** (no commit or tag).
6. Stage only files with real translation changes (skip PO files where only metadata like timestamps changed). Also stage any `locales/po-save/` files.
7. Commit with a detailed message showing per-language changes (added, changed, removed strings with before/after values).
8. Create a timestamped tag `translations/<UTC timestamp>` (e.g. `translations/20260310T0109Z`).
9. Move the `translations/latest` tag to this commit.

## Workflow for local translation fixes

1. Make fixes directly in `src/translations/{lang}.json`.
2. Run `npm run poeditor-merge -- --dry-run` to preview changes and check for conflicts.
3. Run `npm run poeditor-merge` to upload, download, and commit.
4. Push the commit and tags: `git push && git push --tags`

## Testing with a test project

To test the merge without affecting the real POEditor project or your git history:

1. Create a test project: `npm run poeditor-create-test-project`
2. Run the merge against it:
   ```bash
   npm run poeditor-merge -- --project <test-id> --no-commit --verbose
   ```
3. Review the HTML change report (opens automatically) and modified files.
4. Restore local files:
   ```bash
   git checkout -- locales/po/ src/translations/ locales/po-save/
   ```
5. Clean up: `npm run poeditor-create-test-project -- --cleanup <test-id>`

The pre-flight check requires clean working tree, so restore is always safe.

## Properties

**Idempotent.** If the process crashes after some uploads but before moving the tag, re-running is safe. The next run will re-upload the same changes (no-op on POEditor) and see them as convergent non-conflicts on the POEditor side.

**Tag is the single source of truth.** The tag marks the last known sync point. Local commits between syncs don't affect the algorithm — Phase 0 always diffs against the tag, not HEAD.

**English goes first.** Uploading English with `--fuzzy-trigger` modifies the fuzzy state of other languages on POEditor. By uploading English before other languages, we avoid downloading stale state for non-English languages.

**All conflicts detected before any changes.** Phase 0 downloads and diffs everything before any uploads happen. This avoids partially modifying POEditor and then stopping on a conflict.

**Partial uploads preserve POEditor state.** Non-English uploads only contain changed/added entries, so translations that exist only on POEditor are not overwritten.

**po-save provides rollback evidence.** The `locales/po-save/` files record what POEditor looked like before each sync, committed alongside the merged result. You can diff `locales/po-save/{lang}.po` against `locales/po/{lang}.po` to see exactly what changed on the POEditor side.

## Race condition

Between Phase 0 (download/diff) and Phase 1 (upload), someone could make a change on POEditor that creates a new conflict. This is a small window and acceptable in practice.
