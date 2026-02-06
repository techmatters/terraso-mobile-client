/*
 * Copyright © 2024 Technology Matters
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

import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {
  checkNativeSessionReplayStatus,
  useSessionRecordingState,
} from 'terraso-mobile-client/app/posthog/PostHog';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {APP_CONFIG} from 'terraso-mobile-client/config';

export function VersionIndicator() {
  const {t} = useTranslation();
  const sessionRecordingState = useSessionRecordingState();
  const [nativeActive, setNativeActive] = useState<boolean | null>(null);

  useEffect(() => {
    checkNativeSessionReplayStatus().then(setNativeActive);
  }, []);

  let environment;

  if (APP_CONFIG.environment === 'staging') {
    environment = t('settings.beta');
  } else if (APP_CONFIG.environment !== 'production') {
    environment = APP_CONFIG.environment;
  }

  // Session recording indicator based on 3 flags:
  // w = wantRecording, i = isRecording, n = nativeActive
  //
  // Suffix meanings:
  //   (nothing) - Not recording
  //   (r)       - Recording normally
  //   (w)       - Want recording, restart needed to enable
  //   (in)      - Recording but shouldn't be, restart needed to disable
  //   (wi)      - JS ready but native failed to start
  //   (wn)      - Native on but JS missed bootstrap
  //   (i)       - JS thinks recording but native off, likely hot reload
  //   (n)       - Native stuck on
  let recordingSuffix = '';
  if (sessionRecordingState && nativeActive !== null) {
    const {wantRecording: w, isRecording: i} = sessionRecordingState;
    const n = nativeActive;

    if (w && i && n) {
      recordingSuffix = ' (r)';
    } else if (w || i || n) {
      // Build suffix from which flags are true
      const flags = (w ? 'w' : '') + (i ? 'i' : '') + (n ? 'n' : '');
      recordingSuffix = ` (${flags})`;
    }
  }

  return (
    <Text variant="body2">
      {APP_CONFIG.version && APP_CONFIG.build
        ? t('settings.version', {
            version: APP_CONFIG.version,
            build: APP_CONFIG.build,
            environment,
          }) + recordingSuffix
        : `(${t('settings.unknown_version', {
            environment,
          })})`}
    </Text>
  );
}
