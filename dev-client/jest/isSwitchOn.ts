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

import type {render} from '@testing-library/react-native';

/* Result of getByTestId. Structurally references RTL's own return type
 * instead of importing ReactTestInstance directly — the underlying type
 * is JSDoc-@deprecated and the React team plans to move away from
 * react-test-renderer, but RTL's public surface will follow that
 * migration for us. */
type TestElement = ReturnType<ReturnType<typeof render>['getByTestId']>;

/* Switch state is reported to assistive tech via accessibilityState.checked
 * rather than through a `value` prop — this is what a screen-reader user
 * perceives, and also the only stable seam for tests. */
export const isSwitchOn = (element: TestElement): boolean =>
  element.props.accessibilityState.checked;
