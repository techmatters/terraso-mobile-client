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

// The feature flag functionality uses javascript module initialization
// as a proxy for detecting when the app has launched to ensure we don't
// change feature flags while the app is running (which could lead to
// unexpected behavior). In this test suite we use jest's `isolateModules`
// functionality to control when the module initializes so we can test its
// behavior in different states.

test('feature flags can be enabled', () => {
  jest.isolateModules(() => {
    jest.mock('terraso-mobile-client/config/index', () => ({
      APP_CONFIG: {
        environment: 'production',
      },
    }));

    const {
      isFlagEnabled,
      willFlagBeEnabledOnReload,
      setFlagWillBeEnabledOnReload,
    } = require('terraso-mobile-client/config/featureFlags');

    expect(isFlagEnabled('FF_offline')).toBe(false);
    expect(willFlagBeEnabledOnReload('FF_offline')).toBe(false);

    setFlagWillBeEnabledOnReload('FF_offline', true);

    expect(isFlagEnabled('FF_offline')).toBe(false);
    expect(willFlagBeEnabledOnReload('FF_offline')).toBe(true);
  });
});

test('feature flags can be disabled', () => {
  jest.isolateModules(() => {
    jest.mock('terraso-mobile-client/config/index', () => ({
      APP_CONFIG: {
        environment: 'production',
      },
    }));

    const {kvStorage} = require('terraso-mobile-client/persistence/kvStorage');
    kvStorage.setBool('FF_offline', true);

    const {
      isFlagEnabled,
      willFlagBeEnabledOnReload,
      setFlagWillBeEnabledOnReload,
    } = require('terraso-mobile-client/config/featureFlags');

    expect(isFlagEnabled('FF_offline')).toBe(true);
    expect(willFlagBeEnabledOnReload('FF_offline')).toBe(true);

    setFlagWillBeEnabledOnReload('FF_offline', false);

    expect(isFlagEnabled('FF_offline')).toBe(true);
    expect(willFlagBeEnabledOnReload('FF_offline')).toBe(false);
  });
});

test('offline feature flag starts on in dev mode and can be disabled', () => {
  jest.isolateModules(() => {
    jest.mock('terraso-mobile-client/config/index', () => ({
      APP_CONFIG: {
        environment: 'development',
      },
    }));

    const {
      isFlagEnabled,
      willFlagBeEnabledOnReload,
      setFlagWillBeEnabledOnReload,
    } = require('terraso-mobile-client/config/featureFlags');

    expect(isFlagEnabled('FF_offline')).toBe(true);
    expect(willFlagBeEnabledOnReload('FF_offline')).toBe(true);

    setFlagWillBeEnabledOnReload('FF_offline', false);

    expect(isFlagEnabled('FF_offline')).toBe(true);

    expect(willFlagBeEnabledOnReload('FF_offline')).toBe(false);
  });
});
