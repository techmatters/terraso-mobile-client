# Translation Review Prompt

Review translations for the LandPKS Soil ID app using Claude Code.

## How to use (human instructions)

### Running a review

To review all languages at once, paste this into Claude Code:

```
Please review translations for all non-English
languages in src/translations/ using the prompt in
docs/translation-review-prompt.md. Run all languages
in parallel using background agents. Do not prompt
for permission at any step. Write results to
docs/translation-review-LANG.md for each language.
Do not apply any changes to the JSON files.
```

To review a single language:

```
Please review LANG translations using the prompt
in docs/translation-review-prompt.md. Write results
to docs/translation-review-LANG.md. Do not apply
any changes to the JSON files. Do not prompt for
permission at any step.
```

### Applying fixes

After reviewing a `translation-review-LANG.md` file, paste this into Claude Code:

```
Please apply all the fixes from
docs/translation-review-LANG.md to
src/translations/LANG.json. Read the review file,
then apply each suggested fix. Skip any items I've
marked with [SKIP].
After applying, run: npm run format
```

To skip an issue, either delete it from the review file or add `[SKIP]` to its heading:

```markdown
### [SKIP] soil.texture.ite_CLAY
- **Accuracy**
- English: `Clay`
- Current uk: `Мул`
- Suggested fix: `Глина`
- Reason: "Мул" means silt/mud, not clay
```

### Bootstrapping translations for TK placeholders

After adding TK placeholders (via `npm run localization-fill-missing`), you can use Claude to generate real translations. These will be marked fuzzy on the next POEditor sync so translators can review them.

```
Please translate all TK placeholder strings in
src/translations/LANG.json. This is the LandPKS
Soil ID app — a soil science field app for soil
scientists, agronomists, and land managers. Use
accurate soil science terminology. For each string
starting with "TK ", replace it with a proper
LANGUAGE_NAME translation of the English text
(without the "TK " prefix). Preserve all
formatting: <bold> tags, \n newlines, {{variables}},
and $t() references. For FAO/UNESCO soil taxonomy
names, use the official LANGUAGE_NAME term if one
exists, otherwise keep the Latin/English name.
Do not prompt for permission.
After translating, run: npm run format
```

---

## Claude prompt (everything below here is for the review agent)

When launching review agents, include the instructions below. Replace LANG with the language code (es, fr, ka, sw, uk).

---

I need you to review the LANG translations for the LandPKS Soil ID mobile app. This is a soil science field app used by soil scientists, agronomists, and land managers to identify soil types, record soil properties (color, texture, depth, slope), manage field sites, and export data. Accurate domain terminology matters — mistranslations of soil science terms can cause real confusion in the field.

### How to work

Use the helper script to extract sections for review:

```bash
node scripts/localization/extract-section.mjs LANG          # list sections
node scripts/localization/extract-section.mjs LANG <section> # extract a section
node scripts/localization/extract-section.mjs LANG soil.match_info --batch N  # batch large sections
```

Work through **every section** of the translation file, comparing the English source against the LANG translation. For each section, run the extract script and review the output.

For `soil.match_info` (177 soil taxonomy entries), use `--batch 1` through `--batch 9` to process in groups of 20.

Do not prompt for permission at any step. Run all extract commands and complete the full review autonomously.

### What to look for

For each translated string, check:

1. **Accuracy**: Does the translation convey the same meaning as the English? Watch for:
   - Wrong soil science terms (e.g., clay/silt/sand confusion, wrong taxonomy names)
   - Wrong technical terms (e.g., "slope" vs "grade", "texture" vs "structure")
   - Reversed or swapped meanings
   - Mistranslation of UI terms (e.g., "site" meaning physical location, not website)

2. **Completeness**: Is anything missing or left untranslated? Strings starting with "TK " are known placeholders — note them but don't flag as errors.

3. **Consistency**: Are the same English terms translated the same way throughout? (e.g., "site" should always be the same word, "soil match" should be consistent)

4. **Grammar and spelling**: Typos, wrong verb forms, missing accents, wrong noun agreements, etc.

5. **Formatting**: Do `<bold>` tags, `\n` newlines, `{{variables}}`, and `$t()` interpolation references survive correctly? Watch for missing spaces around tags.

6. **Register/formality**: Is the level of formality consistent throughout? (e.g., don't mix formal/informal "you" forms)

7. **Soil taxonomy names**: These are proper nouns from the FAO/UNESCO classification system. They should either be kept in their original Latin/English form or use the **official** translated name for that language. Common issues: partial translation, phonetic transliteration instead of official term, wrong genus/qualifier pairing.

### What NOT to flag

- Minor stylistic preferences where the translation is technically correct
- String ordering differences (JSON key order doesn't matter)
- Differences in punctuation conventions that are normal for the target language
- TK placeholders (just note count)
- Sections without issues — only include sections that have problems

### Output format

Write your findings to `docs/translation-review-LANG.md` using this format:

```markdown
# Translation Review: LANG

Reviewed: YYYY-MM-DD
Sections reviewed: (list all)
TK placeholders found: N

## Summary

(Brief overall assessment: quality level, main categories of issues found)

## Issues

### section.key.path
- **Issue type** (accuracy/completeness/consistency/grammar/formatting/terminology)
- English: `the english string`
- Current LANG: `the current translation`
- Suggested fix: `the corrected translation`
- Reason: (brief explanation of what's wrong and why the fix is better)

### another.key.path
...
```

Group issues by section. Within each section, order by severity (accuracy > terminology > grammar > formatting). For each issue, always include the current value and suggested fix — this makes it easy to apply changes programmatically later.

### After the review

Once the review file is complete, report how many issues you found by category and which sections had the most problems. Do not apply any changes — the user will review the findings first.
