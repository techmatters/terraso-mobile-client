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

import {useMemo} from 'react';

import {TextLink} from 'terraso-mobile-client/components/links/TextLink';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';

type TextWithLinksProps = Omit<
  React.ComponentProps<typeof Text>,
  'children'
> & {
  children: string;
};

type ParsedPart =
  | {type: 'text'; content: string}
  | {type: 'link'; url: string; text: string};

/**
 * Like <Text> but parses <link url="...">text</link> tags into clickable links.
 * Supports multiple links in a single string.
 *
 * Example:
 *   <TextWithLinks>
 *     {t('some.key')}  // "Contact <link url="mailto:help@terraso.org">help@terraso.org</link> for help."
 *   </TextWithLinks>
 */
export const TextWithLinks = ({children, ...textProps}: TextWithLinksProps) => {
  const parts = useMemo(() => {
    const regex = /<link url="([^"]+)">(.*?)<\/link>/g;
    const result: ParsedPart[] = [];

    let lastIndex = 0;
    let match;
    let linkCount = 0;

    while ((match = regex.exec(children)) !== null) {
      // Text before this link
      if (match.index > lastIndex) {
        result.push({
          type: 'text',
          content: children.slice(lastIndex, match.index),
        });
      }
      // The link itself
      result.push({type: 'link', url: match[1], text: match[2]});
      lastIndex = regex.lastIndex;
      linkCount++;
    }

    // Remaining text after last link
    if (lastIndex < children.length) {
      result.push({type: 'text', content: children.slice(lastIndex)});
    }

    if (__DEV__ && linkCount === 0) {
      const preview =
        children.length > 80 ? `${children.slice(0, 80)}...` : children;
      console.warn(
        `TextWithLinks: No <link> tags found. Consider using <Text> instead; text: "${preview}"`,
      );
    }

    return result;
  }, [children]);

  return (
    <Text {...textProps}>
      {parts.map((part, i) =>
        part.type === 'text' ? (
          part.content
        ) : (
          <TextLink key={i} url={part.url}>
            {part.text}
          </TextLink>
        ),
      )}
    </Text>
  );
};
