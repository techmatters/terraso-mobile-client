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
- The file `locales/sync-tag` must contain the tag name of the last sync (e.g. `translations/20260310T0109Z`). That tag must exist in git. On first use, create both manually:
  ```bash
  git tag translations/<timestamp> <commit>
  echo "translations/<timestamp>" > locales/sync-tag
  git add locales/sync-tag && git commit -m "chore: initialize sync-tag"
  ```

## Assumptions

- English (`en.json`) is the source language, edited locally.
- Non-English translations are primarily edited in POEditor by translators, but may also have local fixes.
- All local changes (including non-English) should be made to the `.json` files in `src/translations/`, not PO files. The merge script converts JSON to PO for diffing and upload.
- The file `locales/sync-tag` records which timestamped tag is the baseline for the current branch. Each sync creates a new timestamped tag (e.g. `translations/20260309T1709Z`) and updates `sync-tag`. Because `sync-tag` is a regular file, it travels through any merge strategy (squash, regular, cherry-pick), so the baseline is always correct for the current branch.
- PO files are the interchange format (JSON <-> PO conversion via existing scripts).

## Algorithm

### Pre-flight checks

Before any work (skipped in `--dry-run` mode):

1. Read the baseline tag name from `locales/sync-tag` and verify the tag exists in git.
2. Check that `locales/po/`, `src/translations/`, `locales/po-save/`, and `locales/sync-tag` have no uncommitted changes (staged, unstaged, or untracked). This ensures you can always restore files after a `--no-commit` test run.

### Phase 0: Detect conflicts (read-only)

For each language:

1. Convert local `src/translations/{lang}.json` to PO in memory.
2. Get the PO at the baseline tag (from `locales/sync-tag`) via `git show`.
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
2. If POEditor has English changes, download `en.po` from POEditor (overwrites the locally-generated one).
3. Run `poeditor-download` to download non-English PO files from POEditor.
4. Run `localization-to-json` to regenerate all JSON files from PO.
5. If no files actually changed (and no po-save files exist), print "Already in sync" and exit.
6. If `--no-commit`: list modified files, print restore instructions, open the change report, and **stop** (no commit or tag).
7. Stage only files with real translation changes (skip PO files where only metadata like timestamps changed). Also stage any `locales/po-save/` files.
8. Update `locales/sync-tag` with the new tag name and stage it.
9. Commit with a detailed message showing per-language changes (added, changed, removed strings with before/after values).
10. Create a timestamped tag `translations/<UTC timestamp>` (e.g. `translations/20260310T0109Z`).

## Workflow for local translation fixes

1. Make fixes directly in `src/translations/{lang}.json`.
2. Run `npm run poeditor-merge -- --dry-run` to preview changes and check for conflicts.
3. Run `npm run poeditor-merge` to upload, download, and commit.
4. Push the commit and tag: `git push && git push origin translations/<timestamp>`

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
   git checkout -- locales/po/ src/translations/ locales/po-save/ locales/sync-tag
   ```
5. Clean up: `npm run poeditor-create-test-project -- --cleanup <test-id>`

The pre-flight check requires clean working tree, so restore is always safe.

## Properties

**Idempotent.** If the process crashes after some uploads but before committing, re-running is safe. The `sync-tag` file hasn't been updated yet, so the next run uses the same baseline and re-uploads the same changes (no-op on POEditor).

**sync-tag is the source of truth.** The `locales/sync-tag` file records the baseline tag name. Because it's a regular file (not a git tag pointer), it travels through any merge strategy — squash merge, regular merge, cherry-pick. This means the baseline is always correct for the current branch, even if the sync was done on a different branch that was later squash-merged.

**English goes first.** Uploading English with `--fuzzy-trigger` modifies the fuzzy state of other languages on POEditor. By uploading English before other languages, we avoid downloading stale state for non-English languages.

**All conflicts detected before any changes.** Phase 0 downloads and diffs everything before any uploads happen. This avoids partially modifying POEditor and then stopping on a conflict.

**Partial uploads preserve POEditor state.** Non-English uploads only contain changed/added entries, so translations that exist only on POEditor are not overwritten.

**po-save provides rollback evidence.** The `locales/po-save/` files record what POEditor looked like before each sync, committed alongside the merged result. You can diff `locales/po-save/{lang}.po` against `locales/po/{lang}.po` to see exactly what changed on the POEditor side.

## Race condition

Between Phase 0 (download/diff) and Phase 1 (upload), someone could make a change on POEditor that creates a new conflict. This is a small window and acceptable in practice.
