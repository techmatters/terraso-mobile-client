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

import {useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator, Image, Pressable, StyleSheet} from 'react-native';

import {Buffer} from '@craftzdog/react-native-buffer';
import {encode} from 'jpeg-js';

import {Fab} from 'terraso-mobile-client/components/buttons/Fab';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {decodeBase64Jpg} from 'terraso-mobile-client/components/inputs/image/ImagePicker';
import {
  Box,
  Column,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollViewWithFab} from 'terraso-mobile-client/components/safeview/SafeScrollViewWithFab';
import {linearToSrgb255} from 'terraso-mobile-client/model/color/colorDetection';
import {
  bucketDisplayRgb,
  defaultKept,
  histogramFromImage,
  keptAverageLinear,
  maskRgba,
  type RoiHistogram,
} from 'terraso-mobile-client/model/color/dominantHistogram';
import type {LinearRgb} from 'terraso-mobile-client/model/rawColor/types';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

// jpeg-js's ENCODER references a global `Buffer` (Node), which React Native
// doesn't provide — without this the editor crashes with "Property 'Buffer'
// doesn't exist". Point it at the RN buffer polyfill the app already uses.
const g = globalThis as {Buffer?: unknown};
if (typeof g.Buffer === 'undefined') {
  g.Buffer = Buffer;
}

const css = (rgb: [number, number, number]) =>
  `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

const linearCss = (c: LinearRgb) =>
  css([linearToSrgb255(c.r), linearToSrgb255(c.g), linearToSrgb255(c.b)]);

const maskedDataUri = (
  hist: RoiHistogram,
  kept: ReadonlySet<number>,
): string => {
  const {width, height} = hist.preview;
  const rgba = maskRgba(hist.preview, kept);
  const {data} = encode({data: rgba, width, height}, 85);
  return `data:image/jpeg;base64,${Buffer.from(data).toString('base64')}`;
};

type Props = {
  title: string;
  // The ROI crop as a JPEG base64. (The DNG raw path swaps in native-computed
  // buckets later; the shape consumed here is identical.)
  sourceBase64: string;
  onDone: (color: LinearRgb) => void;
};

/**
 * Dominant-colour editor. Shows the crop's median-cut palette as a histogram;
 * the user checks/unchecks buckets (the darkest is unchecked by default when it
 * looks like shadow). The preview image whitens every unchecked bucket's pixels
 * live, and the result swatch is the true linear mean of the kept pixels. OK
 * returns that colour as this ROI's measured colour.
 */
export const DominantColorEditor = ({title, sourceBase64, onDone}: Props) => {
  const {t} = useTranslation();
  const [hist, setHist] = useState<RoiHistogram | null>(null);
  const [kept, setKept] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      try {
        const decoded = decodeBase64Jpg(sourceBase64);
        const h = histogramFromImage({
          data: decoded.data,
          width: decoded.width,
          height: decoded.height,
        });
        if (!cancelled) {
          setHist(h);
          setKept(defaultKept(h.buckets));
        }
      } catch (err) {
        console.warn('[dominantEditor] histogram failed', err);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sourceBase64]);

  const maskedUri = useMemo(
    () => (hist ? maskedDataUri(hist, kept) : undefined),
    [hist, kept],
  );

  const resultLinear = useMemo(
    () => (hist ? keptAverageLinear(hist.buckets, kept) : null),
    [hist, kept],
  );

  const toggle = (i: number) =>
    setKept(prev => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });

  const maxCount = hist?.buckets[0]?.count ?? 1;
  const totalCount = hist ? hist.buckets.reduce((n, b) => n + b.count, 0) : 0;

  return (
    <ScreenScaffold AppBar={<AppBar title={title} />}>
      <SafeScrollViewWithFab>
        {hist && resultLinear ? (
          <Column padding="md" space="md">
            <Image
              source={{uri: maskedUri}}
              resizeMode="contain"
              style={styles.preview}
            />

            <Heading variant="h6" bold>
              {t('colorCamera.editor.colors')}
            </Heading>
            <Column space="sm">
              {hist.buckets.map((bk, i) => {
                const on = kept.has(i);
                return (
                  <Pressable key={i} onPress={() => toggle(i)}>
                    <Row alignItems="center" space="sm">
                      <Icon
                        name={on ? 'check-box' : 'check-box-outline-blank'}
                        color={on ? 'primary.main' : 'action.active'}
                      />
                      <Box
                        height="24px"
                        width={`${Math.max(6, (bk.count / maxCount) * 70)}%`}
                        borderWidth="1px"
                        borderColor="grey.500"
                        bg={css(bucketDisplayRgb(bk))}
                      />
                      <Text variant="body2">
                        {totalCount
                          ? `${Math.round((bk.count / totalCount) * 100)}%`
                          : ''}
                      </Text>
                    </Row>
                  </Pressable>
                );
              })}
            </Column>

            <Text variant="body1-strong">{t('colorCamera.editor.result')}</Text>
            <Box
              height="48px"
              borderWidth="1px"
              borderColor="grey.500"
              borderRadius="md"
              bg={linearCss(resultLinear)}
            />
          </Column>
        ) : (
          <Row justifyContent="center" padding="xl">
            <ActivityIndicator size="large" />
          </Row>
        )}
      </SafeScrollViewWithFab>
      <Fab
        label={t('general.done')}
        leftIcon="check"
        disabled={!resultLinear}
        onPress={() => resultLinear && onDone(resultLinear)}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  preview: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 280,
  },
});
