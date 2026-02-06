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
  buildMatchesPattern,
  emailMatchesPattern,
} from 'terraso-mobile-client/app/posthog/patternMatching';

describe('emailMatchesPattern', () => {
  describe('exact match', () => {
    it('matches exact email', () => {
      expect(emailMatchesPattern('user@example.com', 'user@example.com')).toBe(
        true,
      );
    });

    it('does not match different email', () => {
      expect(emailMatchesPattern('other@example.com', 'user@example.com')).toBe(
        false,
      );
    });

    it('is case insensitive', () => {
      expect(emailMatchesPattern('User@Example.COM', 'user@example.com')).toBe(
        true,
      );
      expect(emailMatchesPattern('user@example.com', 'USER@EXAMPLE.COM')).toBe(
        true,
      );
    });
  });

  describe('star wildcard (*)', () => {
    it('matches any characters before @', () => {
      expect(emailMatchesPattern('anyone@example.com', '*@example.com')).toBe(
        true,
      );
      expect(emailMatchesPattern('a@example.com', '*@example.com')).toBe(true);
      expect(
        emailMatchesPattern('very.long.name@example.com', '*@example.com'),
      ).toBe(true);
    });

    it('matches any domain', () => {
      expect(emailMatchesPattern('user@anything.org', 'user@*')).toBe(true);
      expect(emailMatchesPattern('user@sub.domain.com', 'user@*')).toBe(true);
    });

    it('matches any email with *@*', () => {
      expect(emailMatchesPattern('anyone@anywhere.com', '*@*')).toBe(true);
    });

    it('matches partial domain', () => {
      expect(emailMatchesPattern('user@mail.example.com', 'user@*.com')).toBe(
        true,
      );
      expect(
        emailMatchesPattern('user@techmatters.org', '*@techmatters.org'),
      ).toBe(true);
    });

    it('does not match if domain differs', () => {
      expect(emailMatchesPattern('user@other.com', '*@example.com')).toBe(
        false,
      );
    });
  });

  describe('question mark wildcard (?)', () => {
    it('matches single character', () => {
      expect(
        emailMatchesPattern('user1@example.com', 'user?@example.com'),
      ).toBe(true);
      expect(
        emailMatchesPattern('usera@example.com', 'user?@example.com'),
      ).toBe(true);
    });

    it('does not match zero characters', () => {
      expect(emailMatchesPattern('user@example.com', 'user?@example.com')).toBe(
        false,
      );
    });

    it('does not match multiple characters', () => {
      expect(
        emailMatchesPattern('user123@example.com', 'user?@example.com'),
      ).toBe(false);
    });

    it('works with multiple question marks', () => {
      expect(emailMatchesPattern('ab@example.com', '??@example.com')).toBe(
        true,
      );
      expect(emailMatchesPattern('abc@example.com', '??@example.com')).toBe(
        false,
      );
      expect(emailMatchesPattern('a@example.com', '??@example.com')).toBe(
        false,
      );
    });
  });

  describe('combined wildcards', () => {
    it('combines * and ?', () => {
      expect(emailMatchesPattern('test1@anything.org', 'test?@*.org')).toBe(
        true,
      );
      expect(emailMatchesPattern('test@anything.org', 'test?@*.org')).toBe(
        false,
      );
    });
  });

  describe('special characters', () => {
    it('escapes dots in pattern', () => {
      expect(emailMatchesPattern('user@exampleXcom', 'user@example.com')).toBe(
        false,
      );
    });

    it('escapes other regex special chars', () => {
      expect(
        emailMatchesPattern('user+tag@example.com', 'user+tag@example.com'),
      ).toBe(true);
      expect(
        emailMatchesPattern('user.name@example.com', 'user.name@example.com'),
      ).toBe(true);
    });
  });
});

describe('buildMatchesPattern', () => {
  describe('exact match', () => {
    it('matches exact build number', () => {
      expect(buildMatchesPattern(999, '999')).toBe(true);
      expect(buildMatchesPattern(100, '100')).toBe(true);
    });

    it('does not match different build number', () => {
      expect(buildMatchesPattern(998, '999')).toBe(false);
      expect(buildMatchesPattern(1000, '999')).toBe(false);
    });

    it('handles whitespace', () => {
      expect(buildMatchesPattern(999, ' 999 ')).toBe(true);
      expect(buildMatchesPattern(999, '  999')).toBe(true);
    });
  });

  describe('range pattern (min-max)', () => {
    it('matches within range', () => {
      expect(buildMatchesPattern(150, '100-200')).toBe(true);
      expect(buildMatchesPattern(100, '100-200')).toBe(true);
      expect(buildMatchesPattern(200, '100-200')).toBe(true);
    });

    it('does not match outside range', () => {
      expect(buildMatchesPattern(99, '100-200')).toBe(false);
      expect(buildMatchesPattern(201, '100-200')).toBe(false);
    });
  });

  describe('min-only pattern (min-)', () => {
    it('matches builds >= min', () => {
      expect(buildMatchesPattern(300, '300-')).toBe(true);
      expect(buildMatchesPattern(500, '300-')).toBe(true);
      expect(buildMatchesPattern(999999, '300-')).toBe(true);
    });

    it('does not match builds < min', () => {
      expect(buildMatchesPattern(299, '300-')).toBe(false);
      expect(buildMatchesPattern(0, '300-')).toBe(false);
    });
  });

  describe('max-only pattern (-max)', () => {
    it('matches builds <= max', () => {
      expect(buildMatchesPattern(500, '-500')).toBe(true);
      expect(buildMatchesPattern(0, '-500')).toBe(true);
      expect(buildMatchesPattern(1, '-500')).toBe(true);
    });

    it('does not match builds > max', () => {
      expect(buildMatchesPattern(501, '-500')).toBe(false);
      expect(buildMatchesPattern(1000, '-500')).toBe(false);
    });
  });

  describe('invalid patterns', () => {
    it('rejects bare hyphen', () => {
      expect(buildMatchesPattern(100, '-')).toBe(false);
    });

    it('rejects non-numeric patterns', () => {
      expect(buildMatchesPattern(100, 'abc')).toBe(false);
      expect(buildMatchesPattern(100, 'latest')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(buildMatchesPattern(100, '')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles zero', () => {
      expect(buildMatchesPattern(0, '0')).toBe(true);
      expect(buildMatchesPattern(0, '0-10')).toBe(true);
      expect(buildMatchesPattern(0, '-10')).toBe(true);
    });

    it('handles large numbers', () => {
      expect(buildMatchesPattern(999999, '999999')).toBe(true);
      expect(buildMatchesPattern(999999, '900000-')).toBe(true);
    });
  });
});
