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

import {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';

import * as Clipboard from 'expo-clipboard';

import {jwtDecode} from 'jwt-decode';

import {refreshToken} from 'terraso-client-shared/account/auth';
import {getAPIConfig} from 'terraso-client-shared/config';

import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {APP_CONFIG} from 'terraso-mobile-client/config';

// Refresh threshold: if the token expires within this many seconds, refresh
// before handing it to clipboard. Avoids handing over a token that's about
// to die in the user's hand.
const REFRESH_IF_LESS_THAN_SECONDS = 60;

// Compact validity-remaining label: "Xm" (<1h), "Xh" (<24h), "Xd" otherwise.
function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'expired';
  if (seconds < 60 * 60) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 24 * 60 * 60) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function remainingSeconds(token: string): number {
  try {
    const {exp} = jwtDecode<{exp?: number}>(token);
    if (!exp) return 0;
    return exp - Math.floor(Date.now() / 1000);
  } catch {
    return 0;
  }
}

export const CopyAccessTokenItem = () => {
  const {t} = useTranslation();
  const [copied, setCopied] = useState(false);
  const [validity, setValidity] = useState('');

  const handleCopyToken = useCallback(async () => {
    const tokenStorage = getAPIConfig().tokenStorage;
    let token = await tokenStorage.getToken('atoken');
    if (!token) return;

    // Refresh if expired or about to expire. Best-effort: on failure, fall
    // through with the stale token rather than silently doing nothing — the
    // label will say "expired" so the user sees what they got.
    let remaining = remainingSeconds(token);
    if (remaining < REFRESH_IF_LESS_THAN_SECONDS) {
      try {
        await refreshToken();
        const refreshed = await tokenStorage.getToken('atoken');
        if (refreshed) {
          token = refreshed;
          remaining = remainingSeconds(token);
        }
      } catch {
        /* fall through with stale token */
      }
    }

    await Clipboard.setStringAsync(token);
    setValidity(formatRemaining(remaining));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  if (APP_CONFIG.environment === 'production') {
    return null;
  }

  return (
    <MenuItem
      variant="default"
      icon="content-copy"
      label={
        copied
          ? `${t('general.copied')} (${validity})`
          : t('settings.copy_access_token')
      }
      onPress={handleCopyToken}
    />
  );
};
