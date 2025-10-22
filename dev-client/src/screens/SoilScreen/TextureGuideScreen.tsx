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

import {useEffect, useMemo, useState} from 'react';
import {Trans, useTranslation} from 'react-i18next';
import {Image, StyleSheet, View} from 'react-native';

import {VideoView, useVideoPlayer} from 'expo-video';

import {ScrollView} from 'native-base';

import {BulletList} from 'terraso-mobile-client/components/BulletList';
import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {useDefaultSiteDepthRequirements} from 'terraso-mobile-client/components/dataRequirements/commonRequirements';
import {ScreenDataRequirements} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {
  Box,
  Column,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {
  SoilTexture,
  updateDepthDependentSoilData,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {useDispatch} from 'terraso-mobile-client/store';

const LENGTH_IMAGE = require('terraso-mobile-client/assets/texture/guide/length.png');

export const TextureGuideScreen = (props: SoilPitInputScreenProps) => {
  const {t} = useTranslation();
  const [ball, setBall] = useState<'YES' | 'NO'>();
  const [ribbon, setRibbon] = useState<'YES' | 'NO'>();
  const [ribbonLength, setRibbonLength] = useState<'SM' | 'MD' | 'LG'>();
  const [grit, setGrit] = useState<'GRITTY' | 'SMOOTH' | 'NEITHER'>();

  const ballPlayer = useVideoPlayer(
    require('terraso-mobile-client/assets/texture/guide/ball.mp4'),
    player => {
      player.loop = true;
    },
  );

  const ribbonPlayer = useVideoPlayer(
    require('terraso-mobile-client/assets/texture/guide/ribbon.mp4'),
    player => {
      player.loop = true;
    },
  );

  const grittynessPlayer = useVideoPlayer(
    require('terraso-mobile-client/assets/texture/guide/grittyness.mp4'),
    player => {
      player.loop = true;
    },
  );

  // Play ball video immediately (always visible)
  useEffect(() => {
    ballPlayer.play();
  }, [ballPlayer]);

  // Play ribbon video only when its section becomes visible
  useEffect(() => {
    if (ball === 'YES') {
      ribbonPlayer.play();
    } else {
      ribbonPlayer.pause();
    }
  }, [ball, ribbonPlayer]);

  // Play grittyness video only when its section becomes visible
  useEffect(() => {
    if (ribbonLength !== undefined) {
      grittynessPlayer.play();
    } else {
      grittynessPlayer.pause();
    }
  }, [ribbonLength, grittynessPlayer]);

  const result = useMemo<SoilTexture | undefined>(() => {
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
  }, [ball, ribbon, ribbonLength, grit]);

  const dispatch = useDispatch();

  const navigation = useNavigation();

  const onUseResult = useMemo(() => {
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

  const requirements = useDefaultSiteDepthRequirements(
    props.siteId,
    props.depthInterval.depthInterval,
  );

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScreenScaffold
          AppBar={<AppBar title={t('soil.texture.guide.title')} />}
          BottomNavigation={null}>
          <ScrollView bg="grey.300">
            <Column space="16px">
              <Column p="15px" bg="primary.contrast">
                <Text variant="body1-strong">
                  {t('soil.texture.guide.prepare')}
                </Text>
                <BulletList
                  data={[1, 2, 3]}
                  renderItem={i => (
                    <Text variant="body1" color="text.primary">
                      <Trans
                        i18nKey={`soil.texture.guide.prepare_details_${i}`}
                      />
                    </Text>
                  )}
                />
                <Text variant="body1-strong">
                  {t('soil.texture.guide.wet')}
                </Text>
                <BulletList
                  data={[1, 2, 3, 4, 5]}
                  renderItem={i => (
                    <Text variant="body1" color="text.primary">
                      <Trans i18nKey={`soil.texture.guide.wet_details_${i}`} />
                    </Text>
                  )}
                />
                <Text variant="body1-strong">
                  {t('soil.texture.guide.ball')}
                </Text>
                <BulletList
                  data={[1, 2]}
                  renderItem={i => (
                    <Text variant="body1" color="text.primary">
                      <Trans i18nKey={`soil.texture.guide.ball_details_${i}`} />
                    </Text>
                  )}
                />
                <VideoView
                  player={ballPlayer}
                  contentFit="cover"
                  style={styles.ballVideo}
                />
                <RadioBlock
                  label={t('soil.texture.guide.ball_help')}
                  options={{
                    YES: {text: t('general.yes')},
                    NO: {text: t('general.no')},
                  }}
                  groupProps={{name: 'ball', onChange: setBall, value: ball}}
                />
              </Column>
              {ball === 'YES' && (
                <>
                  <Column p="15px" bg="primary.contrast">
                    <Text variant="body1-strong">
                      {t('soil.texture.guide.ribbon')}
                    </Text>
                    <BulletList
                      data={[1, 2, 3, 4, 5]}
                      renderItem={i => (
                        <Text variant="body1" color="text.primary">
                          <Trans
                            i18nKey={`soil.texture.guide.ribbon_details_${i}`}
                          />
                        </Text>
                      )}
                    />
                    <VideoView
                      player={ribbonPlayer}
                      contentFit="cover"
                      style={styles.ribbonVideo}
                    />
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
                  </Column>
                  {ribbon === 'YES' && (
                    <>
                      <Column p="15px" bg="primary.contrast">
                        <View style={styles.lengthImageContainer}>
                          <Image
                            style={styles.lengthImage}
                            source={LENGTH_IMAGE}
                          />
                        </View>
                        <RadioBlock
                          label={t('soil.texture.guide.ribbon_length_help')}
                          options={{
                            SM: {
                              text: t('soil.texture.guide.ribbon_length.SM'),
                            },
                            MD: {
                              text: t('soil.texture.guide.ribbon_length.MD'),
                            },
                            LG: {
                              text: t('soil.texture.guide.ribbon_length.LG'),
                            },
                          }}
                          groupProps={{
                            name: 'ribbonLength',
                            onChange: setRibbonLength,
                            value: ribbonLength,
                          }}
                        />
                      </Column>
                      {ribbonLength !== undefined && (
                        <Column p="15px" bg="primary.contrast">
                          <Text variant="body1-strong">
                            {t('soil.texture.guide.grittyness')}
                          </Text>
                          <BulletList
                            data={[1, 2, 3]}
                            renderItem={i => (
                              <TranslatedParagraph
                                i18nKey={`soil.texture.guide.grittyness_details_${i}`}
                              />
                            )}
                          />
                          <VideoView
                            player={grittynessPlayer}
                            contentFit="cover"
                            style={styles.grittynessVideo}
                          />
                          <RadioBlock
                            label={t('soil.texture.guide.grittyness_help')}
                            options={{
                              GRITTY: {
                                text: t(
                                  'soil.texture.guide.grittyness_type.GRITTY',
                                ),
                              },
                              NEITHER: {
                                text: t(
                                  'soil.texture.guide.grittyness_type.NEITHER',
                                ),
                              },
                              SMOOTH: {
                                text: t(
                                  'soil.texture.guide.grittyness_type.SMOOTH',
                                ),
                              },
                            }}
                            groupProps={{
                              name: 'grit',
                              onChange: setGrit,
                              value: grit,
                            }}
                          />
                        </Column>
                      )}
                    </>
                  )}
                </>
              )}
              {result !== undefined && (
                <Column p="15px" bg="primary.contrast" alignItems="flex-start">
                  <Text variant="body1-strong" textTransform="uppercase">
                    {t('soil.texture.guide.result', {
                      result: t(`soil.texture.class.${result}`),
                    })}
                  </Text>
                  <Box height="10px" />
                  {onUseResult !== undefined && (
                    <ContainedButton
                      leftIcon="check"
                      onPress={onUseResult}
                      label={t('soil.texture.guide.use_label')}
                    />
                  )}
                </Column>
              )}
            </Column>
          </ScrollView>
        </ScreenScaffold>
      )}
    </ScreenDataRequirements>
  );
};

const styles = StyleSheet.create({
  ballVideo: {width: '100%', aspectRatio: 550 / 400, marginBottom: 10},
  ribbonVideo: {width: '100%', aspectRatio: 480 / 348, marginBottom: 10},
  grittynessVideo: {width: '100%', aspectRatio: 474 / 392, marginBottom: 10},
  lengthImageContainer: {
    width: '100%',
    marginBottom: 10,
    aspectRatio:
      Image.resolveAssetSource(LENGTH_IMAGE).width /
      Image.resolveAssetSource(LENGTH_IMAGE).height,
  },
  lengthImage: {width: '100%', height: '100%'},
});
