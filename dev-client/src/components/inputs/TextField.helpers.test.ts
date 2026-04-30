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

import {
  formatCounter,
  formatRequiredLabel,
  FormikSnapshot,
  resolveTextFieldState,
  shouldShowError,
  TYPE_PRESETS,
} from 'terraso-mobile-client/components/inputs/TextField.helpers';

const buildFormik = (
  overrides: Partial<FormikSnapshot> = {},
): FormikSnapshot => ({
  values: {},
  errors: {},
  touched: {},
  submitCount: 0,
  setFieldValue: jest.fn(),
  handleBlur: jest.fn(() => jest.fn()),
  ...overrides,
});

describe('resolveTextFieldState', () => {
  describe('Formik mode', () => {
    test('reads value from formik.values[name]', () => {
      const formik = buildFormik({values: {email: 'a@b.com'}});

      const state = resolveTextFieldState({name: 'email'}, formik);

      expect(state.mode).toBe('formik');
      expect(state.value).toBe('a@b.com');
    });

    test('returns empty string when value is missing', () => {
      const formik = buildFormik({values: {}});

      const state = resolveTextFieldState({name: 'email'}, formik);

      expect(state.value).toBe('');
    });

    test('reads error, touched, and submitCount from formik', () => {
      const formik = buildFormik({
        errors: {email: 'Required'},
        touched: {email: true},
        submitCount: 2,
      });

      const state = resolveTextFieldState({name: 'email'}, formik);

      expect(state.error).toBe('Required');
      expect(state.touched).toBe(true);
      expect(state.submitCount).toBe(2);
    });

    test('controlled error prop overrides Formik error', () => {
      const formik = buildFormik({errors: {email: 'From Formik'}});

      const state = resolveTextFieldState(
        {name: 'email', error: 'From caller'},
        formik,
      );

      expect(state.error).toBe('From caller');
    });

    test('onChangeText calls setFieldValue', () => {
      const formik = buildFormik();

      const state = resolveTextFieldState({name: 'email'}, formik);
      state.onChangeText('new@value.com');

      expect(formik.setFieldValue).toHaveBeenCalledWith(
        'email',
        'new@value.com',
      );
    });

    test('onChangeText also calls layered caller handler after Formik', () => {
      const formik = buildFormik();
      const callOrder: string[] = [];
      (formik.setFieldValue as jest.Mock).mockImplementation(() => {
        callOrder.push('formik');
      });
      const callerHandler = jest.fn(() => callOrder.push('caller'));

      const state = resolveTextFieldState(
        {name: 'email', onChangeText: callerHandler},
        formik,
      );
      state.onChangeText('x');

      expect(callerHandler).toHaveBeenCalledWith('x');
      expect(callOrder).toEqual(['formik', 'caller']);
    });

    test('onBlur invokes formik.handleBlur(name) and layered caller handler', () => {
      const blurFn = jest.fn();
      const formik = buildFormik({
        handleBlur: jest.fn(() => blurFn) as FormikSnapshot['handleBlur'],
      });
      const callerBlur = jest.fn();

      const state = resolveTextFieldState(
        {name: 'email', onBlur: callerBlur},
        formik,
      );
      state.onBlur();

      expect(formik.handleBlur).toHaveBeenCalledWith('email');
      expect(blurFn).toHaveBeenCalled();
      expect(callerBlur).toHaveBeenCalled();
    });

    test('falls through to bare mode if name is set but no Formik provider', () => {
      const state = resolveTextFieldState({name: 'email'}, undefined);

      expect(state.mode).toBe('bare');
    });
  });

  describe('Controlled mode', () => {
    test('uses props.value and props.onChangeText', () => {
      const onChangeText = jest.fn();

      const state = resolveTextFieldState(
        {value: 'hello', onChangeText},
        undefined,
      );

      expect(state.mode).toBe('controlled');
      expect(state.value).toBe('hello');
      state.onChangeText('world');
      expect(onChangeText).toHaveBeenCalledWith('world');
    });

    test('reads error from props.error', () => {
      const state = resolveTextFieldState(
        {value: '', onChangeText: jest.fn(), error: 'Bad input'},
        undefined,
      );

      expect(state.error).toBe('Bad input');
    });

    test('treats touched as true (no Formik to track)', () => {
      const state = resolveTextFieldState(
        {value: '', onChangeText: jest.fn()},
        undefined,
      );

      expect(state.touched).toBe(true);
      expect(state.submitCount).toBe(0);
    });

    test('uses props.onBlur or noop', () => {
      const onBlur = jest.fn();

      const state = resolveTextFieldState(
        {value: '', onChangeText: jest.fn(), onBlur},
        undefined,
      );
      state.onBlur();

      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe('Bare mode', () => {
    test('returns bare when no name, no value/onChange', () => {
      const state = resolveTextFieldState({}, undefined);

      expect(state.mode).toBe('bare');
      expect(state.value).toBe('');
      expect(() => state.onChangeText('x')).not.toThrow();
      expect(() => state.onBlur()).not.toThrow();
    });
  });
});

describe('shouldShowError', () => {
  test('returns false when there is no error', () => {
    expect(shouldShowError(undefined, true, 5, 'always')).toBe(false);
    expect(shouldShowError('', true, 5, 'always')).toBe(false);
  });

  test('errorVisibility=always shows error whenever error is set', () => {
    expect(shouldShowError('Required', false, 0, 'always')).toBe(true);
    expect(shouldShowError('Required', true, 0, 'always')).toBe(true);
  });

  test('errorVisibility=onTouch hides error until touched or submit', () => {
    expect(shouldShowError('Required', false, 0, 'onTouch')).toBe(false);
    expect(shouldShowError('Required', true, 0, 'onTouch')).toBe(true);
    expect(shouldShowError('Required', false, 1, 'onTouch')).toBe(true);
  });
});

describe('TYPE_PRESETS', () => {
  test('text preset uses default keyboard and sentences capitalization', () => {
    expect(TYPE_PRESETS.text).toEqual({
      keyboardType: 'default',
      autoCapitalize: 'sentences',
    });
  });

  test('email preset bundles email keyboard, no capitalize, autoComplete=email', () => {
    expect(TYPE_PRESETS.email).toEqual({
      keyboardType: 'email-address',
      autoCapitalize: 'none',
      autoComplete: 'email',
    });
  });

  test('numeric preset uses numeric keyboard, no capitalize', () => {
    expect(TYPE_PRESETS.numeric).toEqual({
      keyboardType: 'numeric',
      autoCapitalize: 'none',
    });
  });
});

describe('formatCounter', () => {
  test('formats current and max with a slash separator', () => {
    expect(formatCounter(0, 500)).toBe('0 / 500');
    expect(formatCounter(120, 500)).toBe('120 / 500');
    expect(formatCounter(500, 500)).toBe('500 / 500');
  });
});

describe('formatRequiredLabel', () => {
  test('returns label unchanged when not required', () => {
    expect(formatRequiredLabel('Email', false)).toBe('Email');
  });

  test('appends asterisk when required', () => {
    expect(formatRequiredLabel('Email', true)).toBe('Email *');
  });

  test('returns undefined or empty as-is even when required', () => {
    expect(formatRequiredLabel(undefined, true)).toBeUndefined();
    expect(formatRequiredLabel('', true)).toBe('');
  });
});
