#!/bin/bash

# Check i18n keys for all translation json files

for translation_file in src/translations/*.json; do
  node scripts/localization/find-i18n-keys.mjs . --catalog "$translation_file"
done
