/*
 * Copyright © 2026 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Pressable, ScrollView} from 'react-native-gesture-handler';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {TextButton} from 'terraso-mobile-client/components/buttons/TextButton';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {TextField} from 'terraso-mobile-client/components/inputs/TextField';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';
import {useBottomInsetPadding} from 'terraso-mobile-client/hooks/useBottomInsetPadding';
import {SEEN_KEY_PREFIX} from 'terraso-mobile-client/hooks/useSeenOnce';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

const PREVIEW_LENGTH = 40;

/*
 * MMKV stores untyped bytes and cannot report what a value was written as, so
 * every read has to assume a type. Rows default to the guess below and expose a
 * selector to correct it.
 */
type KvValueType = 'string' | 'number' | 'boolean';

const KV_VALUE_TYPES: KvValueType[] = ['string', 'number', 'boolean'];

/*
 * Keys this tool refuses to surface. `persisted-redux-state` holds the entire
 * serialized store: too large to render usefully, and hand-editing it would be
 * deserialized straight back into Redux on next launch.
 */
const EXCLUDED_KEYS = new Set(['persisted-redux-state']);

/*
 * Developer tool for inspecting and editing MMKV directly — chiefly the flags
 * that are otherwise only reachable by reinstalling, like
 * `seenRevision.*` (lower the number to re-arm a one-time affordance) and
 * `welcomeScreenSeenForHash`. Gated behind FF_testing by its caller.
 */
export const KvStorageEditor = () => {
  const [show, setShow] = useState(false);
  const [allKeys, setAllKeys] = useState<string[]>([]);
  const [filter, setFilter] = useState('');

  /* Re-reading into a fresh array is also what re-renders the rows, so their values reflect writes. */
  const onChanged = useCallback(() => setAllKeys(kvStorage.getAllKeys()), []);
  const toggle = useCallback(() => setShow(s => !s), []);

  /* Keeps the list honest when the rest of the app writes to storage — e.g. tapping a tutorial button re-creates a key deleted from here. */
  kvStorage.useChangeListener(onChanged);

  /* Also re-read whenever this effect (re)attaches. Listeners registered while the screen is frozen are torn down, so a write that lands during the freeze would otherwise never be seen. */
  useEffect(() => {
    onChanged();
  }, [onChanged]);

  const keys = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return allKeys
      .filter(key => !EXCLUDED_KEYS.has(key))
      .filter(key => !needle || key.toLowerCase().includes(needle))
      .sort();
  }, [allKeys, filter]);

  /* ScreenScaffold's SafeAreaView omits the bottom edge, so this panel runs under the home indicator / nav bar. The screen's main content is handled by its own scroll view; this panel is a sibling of it and has to do the same for itself. */
  const listContentStyle = useBottomInsetPadding();

  return (
    <View>
      <ContainedButton
        label="MMKV Storage: Show/Hide"
        stretchToFit={true}
        onPress={toggle}
      />
      {show && (
        <View style={styles.panel}>
          <TextField
            label="Filter keys"
            placeholder="e.g. tutorial"
            value={filter}
            onChangeText={setFilter}
          />
          <Text variant="body2">{keys.length} key(s)</Text>
          <ScrollView
            style={styles.list}
            contentContainerStyle={listContentStyle}>
            {keys.map(key => (
              <KvStorageRow key={key} storageKey={key} onChanged={onChanged} />
            ))}
            <View style={styles.spacer} />
          </ScrollView>
        </View>
      )}
    </View>
  );
};

type KvStorageRowProps = {
  storageKey: string;
  onChanged: () => void;
};

const KvStorageRow = ({storageKey, onChanged}: KvStorageRowProps) => {
  /* Per-row rather than lifted, so several rows can stay open at once. */
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = useCallback(() => setExpanded(e => !e), []);

  const [type, setType] = useState(() => guessType(storageKey));

  const stored = readValue(storageKey, type);
  const [draft, setDraft] = useState(stored);

  /* Storage is the source of truth: if another write — or a change of type here — moved the value, drop the stale draft. */
  const [lastStored, setLastStored] = useState(stored);
  if (lastStored !== stored) {
    setLastStored(stored);
    setDraft(stored);
  }

  const error = validate(type, draft);
  const dirty = draft !== stored;

  const save = useCallback(() => {
    writeValue(storageKey, type, draft);
    onChanged();
  }, [storageKey, type, draft, onChanged]);

  const remove = useCallback(() => {
    kvStorage.remove(storageKey);
    onChanged();
  }, [storageKey, onChanged]);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{expanded}}
        onPress={toggleExpanded}>
        <View style={styles.rowHeader}>
          <View style={styles.rowHeaderText}>
            <Text variant="body1-strong">{storageKey}</Text>
            {!expanded && (
              <Text variant="caption" numberOfLines={1}>
                {previewValue(stored)}
              </Text>
            )}
          </View>
          <Icon name={expanded ? 'expand-less' : 'expand-more'} size="sm" />
        </View>
      </Pressable>
      {expanded && (
        <>
          <Text variant="caption">Read/write as:</Text>
          <View style={styles.typeSelector}>
            {KV_VALUE_TYPES.map(candidate => (
              <TextButton
                key={candidate}
                label={candidate}
                /* The active type is shown as disabled — a cheap segmented control. */
                disabled={candidate === type}
                onPress={() => setType(candidate)}
              />
            ))}
          </View>
          <TextField
            label="Value"
            value={draft}
            onChangeText={setDraft}
            error={error}
            multiline={type === 'string'}
          />
          <View style={styles.rowActions}>
            <TextButton
              label="Save"
              disabled={!dirty || error !== undefined}
              onPress={save}
            />
            <TextButton label="Delete" type="destructive" onPress={remove} />
          </View>
        </>
      )}
    </View>
  );
};

/* Collapses whitespace first so multi-line values do not preview as a blank sliver. */
const previewValue = (value: string) => {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  return oneLine.length > PREVIEW_LENGTH
    ? `${oneLine.slice(0, PREVIEW_LENGTH)}…`
    : oneLine;
};

/*
 * A naming-convention hint, not a fact — MMKV cannot be asked. Only the app's
 * own key families are covered; the row's selector corrects anything else.
 */
const guessType = (key: string): KvValueType => {
  if (key.startsWith('FF_')) {
    return 'boolean';
  }
  if (key.startsWith(SEEN_KEY_PREFIX)) {
    return 'number';
  }
  return 'string';
};

/* Reading with the wrong type yields an empty or nonsense value rather than an error, which is exactly why the type is the user's to choose. */
const readValue = (key: string, type: KvValueType): string => {
  switch (type) {
    case 'number': {
      const value = kvStorage.getNumber(key);
      return value === undefined ? '' : String(value);
    }
    case 'boolean': {
      const value = kvStorage.getBool(key);
      return value === undefined ? '' : String(value);
    }
    default:
      return kvStorage.getString(key) ?? '';
  }
};

const validate = (type: KvValueType, draft: string): string | undefined => {
  if (
    type === 'number' &&
    (draft.trim() === '' || !Number.isFinite(Number(draft)))
  ) {
    return 'Must be a number';
  }
  if (type === 'boolean' && draft !== 'true' && draft !== 'false') {
    return 'Must be true or false';
  }
  return undefined;
};

/* Writing with the selected type matters as much as reading: the app's own useNumber/useBool readers get nothing usable from a value stored under the wrong one. */
const writeValue = (key: string, type: KvValueType, draft: string) => {
  switch (type) {
    case 'number':
      kvStorage.setNumber(key, Number(draft));
      break;
    case 'boolean':
      kvStorage.setBool(key, draft === 'true');
      break;
    default:
      kvStorage.setString(key, draft);
  }
};

const styles = StyleSheet.create({
  panel: {
    padding: 8,
    backgroundColor: convertColorProp('grey.200'),
    /* ScreenScaffold lays its children out in a flex column, and RN defaults flexShrink to 0 — so without this the panel claims its full height and any excess is clipped off the bottom of the screen, unreachable because the clipping happens outside the ScrollView. */
    flexShrink: 1,
  },
  list: {
    maxHeight: 400,
    flexShrink: 1,
  },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: convertColorProp('grey.300'),
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowHeaderText: {
    /* Bounds the text column so long keys and previews truncate instead of shoving the chevron off-screen. */
    flex: 1,
    marginRight: 8,
  },
  rowActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  spacer: {
    height: 50,
  },
  typeSelector: {
    flexDirection: 'row',
  },
});
