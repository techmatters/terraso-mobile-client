#!/bin/bash

# Check i18n keys for all translation json files

echo '------- Check keys -------'
echo '** Warning: these lists may not be complete';
echo '** Please use as a secondary check only';
for translation_file in src/translations/*.json; do
  node scripts/localization/find-i18n-keys.mjs . --catalog "$translation_file"
done

echo ''
echo '------- Check variables -------'
node scripts/localization/find-i18n-variables.mjs