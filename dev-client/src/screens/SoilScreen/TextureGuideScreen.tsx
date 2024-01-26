/*
 * Copyright © 2023 Technology Matters
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

import {Text, ScrollView, Column, Button, Box} from 'native-base';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useTranslation} from 'react-i18next';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {useMemo, useState} from 'react';
import {
  SoilTexture,
  updateDepthDependentSoilData,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {useDispatch} from 'terraso-mobile-client/store';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ResizeMode, Video} from 'expo-av';
import {Image, StyleSheet, View} from 'react-native';

const LENGTH_IMAGE = require('terraso-mobile-client/assets/texture/guide/length.png');

export const TextureGuideScreen = (props?: SoilPitInputScreenProps) => {
  const {t} = useTranslation();
  const [ball, setBall] = useState<'YES' | 'NO'>();
  const [ribbon, setRibbon] = useState<'YES' | 'NO'>();
  const [ribbonLength, setRibbonLength] = useState<'SM' | 'MD' | 'LG'>();
  const [grit, setGrit] = useState<'GRITTY' | 'SMOOTH' | 'NEITHER'>();

  const result = useMemo<SoilTexture | undefined>(() => {
    /* eslint-disable curly */
    if (ball === undefined) return undefined;
    if (ball === 'NO') return 'SAND';
    if (ribbon === undefined) return undefined;
    if (ribbon === 'NO') return 'LOAMY_SAND';
    if (ribbonLength === undefined || grit === undefined) return undefined;
    if (ribbonLength === 'SM') {
      if (grit === 'GRITTY') return 'SANDY_LOAM';
      if (grit === 'NEITHER') return 'LOAM';
      if (grit === 'SMOOTH') return 'SILT_LOAM';
    }
    if (ribbonLength === 'MD') {
      if (grit === 'GRITTY') return 'SANDY_CLAY_LOAM';
      if (grit === 'NEITHER') return 'CLAY_LOAM';
      if (grit === 'SMOOTH') return 'SILTY_CLAY_LOAM';
    }
    if (ribbonLength === 'LG') {
      if (grit === 'GRITTY') return 'SANDY_CLAY';
      if (grit === 'NEITHER') return 'CLAY';
      if (grit === 'SMOOTH') return 'SILTY_CLAY';
    }
    /* eslint-enable curly */
  }, [ball, ribbon, ribbonLength, grit]);

  const dispatch = useDispatch();

  const navigation = useNavigation();

  const onUseResult = useMemo(() => {
    if (props === undefined) {
      return undefined;
    }
    return async () => {
      await dispatch(
        updateDepthDependentSoilData({
          siteId: props.siteId,
          depthInterval: props.depthInterval.depthInterval,
          texture: result,
        }),
      );
      navigation.pop();
    };
  }, [props, dispatch, result, navigation]);

  return (
    <ScreenScaffold
      AppBar={<AppBar title={t('soil.texture.guide.title')} />}
      BottomNavigation={null}>
      <ScrollView bg="grey.300">
        <Column space="16px">
          <Column p="15px" bg="primary.contrast">
            <RadioBlock
              label={t('soil.texture.guide.ball_help')}
              options={{
                YES: {text: t('general.yes')},
                NO: {text: t('general.no')},
              }}
              groupProps={{name: 'ball', onChange: setBall, value: ball}}
            />
            <Video
              isLooping
              shouldPlay
              source={require('terraso-mobile-client/assets/texture/guide/ball.mp4')}
              resizeMode={ResizeMode.COVER}
              style={styles.ballVideo}
            />
          </Column>
          {ball === 'YES' && (
            <>
              <Column p="15px" bg="primary.contrast">
                <RadioBlock
                  label={t('soil.texture.guide.ribbon_help')}
                  options={{
                    YES: {text: t('general.yes')},
                    NO: {text: t('general.no')},
                  }}
                  groupProps={{
                    name: 'ribbon',
                    onChange: setRibbon,
                    value: ribbon,
                  }}
                />
                <Video
                  isLooping
                  shouldPlay
                  source={require('terraso-mobile-client/assets/texture/guide/ribbon.mp4')}
                  resizeMode={ResizeMode.COVER}
                  style={styles.ribbonVideo}
                />
              </Column>
              {ribbon === 'YES' && (
                <>
                  <Column p="15px" bg="primary.contrast">
                    <RadioBlock
                      label={t('soil.texture.guide.ribbon_length_help')}
                      options={{
                        SM: {text: t('soil.texture.guide.ribbon_length.SM')},
                        MD: {text: t('soil.texture.guide.ribbon_length.MD')},
                        LG: {text: t('soil.texture.guide.ribbon_length.LG')},
                      }}
                      groupProps={{
                        name: 'ribbonLength',
                        onChange: setRibbonLength,
                        value: ribbonLength,
                      }}
                    />
                    <View style={styles.lengthImageContainer}>
                      <Image style={styles.lengthImage} source={LENGTH_IMAGE} />
                    </View>
                  </Column>
                  {ribbonLength !== undefined && (
                    <Column p="15px" bg="primary.contrast">
                      <RadioBlock
                        label={t('soil.texture.guide.grittyness_help')}
                        options={{
                          GRITTY: {
                            text: t('soil.texture.guide.grittyness.GRITTY'),
                          },
                          NEITHER: {
                            text: t('soil.texture.guide.grittyness.NEITHER'),
                          },
                          SMOOTH: {
                            text: t('soil.texture.guide.grittyness.SMOOTH'),
                          },
                        }}
                        groupProps={{
                          name: 'grit',
                          onChange: setGrit,
                          value: grit,
                        }}
                      />
                      <Video
                        isLooping
                        shouldPlay
                        source={require('terraso-mobile-client/assets/texture/guide/grittyness.mp4')}
                        resizeMode={ResizeMode.COVER}
                        style={styles.grittynessVideo}
                      />
                    </Column>
                  )}
                </>
              )}
            </>
          )}
          {result !== undefined && (
            <Column p="15px" bg="primary.contrast" alignItems="flex-start">
              <Text variant="body1-strong">
                {t('soil.texture.guide.result', {
                  result: t(`soil.texture.class.${result}`).toLocaleUpperCase(),
                })}
              </Text>
              <Box height="10px" />
              {onUseResult !== undefined && (
                <Button
                  leftIcon={<Icon name="check" />}
                  _text={{textTransform: 'uppercase'}}
                  onPress={onUseResult}>
                  {t('soil.texture.guide.use_label')}
                </Button>
              )}
            </Column>
          )}
        </Column>
      </ScrollView>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  ballVideo: {width: '100%', aspectRatio: 550 / 400},
  ribbonVideo: {width: '100%', aspectRatio: 480 / 348},
  grittynessVideo: {width: '100%', aspectRatio: 474 / 392},
  lengthImageContainer: {
    width: '100%',
    aspectRatio:
      Image.resolveAssetSource(LENGTH_IMAGE).width /
      Image.resolveAssetSource(LENGTH_IMAGE).height,
  },
  lengthImage: {width: '100%', height: '100%'},
});
