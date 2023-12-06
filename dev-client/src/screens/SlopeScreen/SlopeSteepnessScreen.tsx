import {
  Box,
  Button,
  Column,
  Fab,
  Heading,
  Row,
  ScrollView,
  Text,
} from 'native-base';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {LastModified} from 'terraso-mobile-client/components/LastModified';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {renderSlopeValue} from 'terraso-mobile-client/screens/SlopeScreen/SlopeScreen';
import {ImageRadio} from 'terraso-mobile-client/components/ImageRadio';
import {useCallback, useMemo} from 'react';
import {SoilIdSoilDataSlopeSteepnessSelectChoices} from 'terraso-client-shared/graphqlSchema/graphql';
import {updateSoilData} from 'terraso-client-shared/soilId/soilIdSlice';

type Props = {
  siteId: string;
};

const STEEPNESS_IMAGES = {
  FLAT: require('terraso-mobile-client/assets/landpks_intro_image.png'),
  GENTLE: require('terraso-mobile-client/assets/landpks_intro_image.png'),
  MODERATE: require('terraso-mobile-client/assets/landpks_intro_image.png'),
  ROLLING: require('terraso-mobile-client/assets/landpks_intro_image.png'),
  HILLY: require('terraso-mobile-client/assets/landpks_intro_image.png'),
  STEEP: require('terraso-mobile-client/assets/landpks_intro_image.png'),
  MODERATELY_STEEP: require('terraso-mobile-client/assets/landpks_intro_image.png'),
  VERY_STEEP: require('terraso-mobile-client/assets/landpks_intro_image.png'),
  STEEPEST: require('terraso-mobile-client/assets/landpks_intro_image.png'),
} as const;

export const SlopeSteepnessScreen = ({siteId}: Props) => {
  const name = useSelector(state => state.site.sites[siteId].name);
  const {t} = useTranslation();
  const soilData = useSelector(state => state.soilId.soilData[siteId]);
  const dispatch = useDispatch();

  const steepnessOptions = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(STEEPNESS_IMAGES).map(([value, image]) => [
          value,
          {label: t(`slope.steepness.labels.${value}`), image},
        ]),
      ),
    [t],
  );

  const onChange = useCallback(
    (value: SoilIdSoilDataSlopeSteepnessSelectChoices | null) => {
      dispatch(
        updateSoilData({
          siteId,
          slopeSteepnessSelect: value,
          slopeSteepnessDegree: null,
          slopeSteepnessPercent: null,
        }),
      );
    },
    [dispatch, siteId],
  );

  return (
    <ScreenScaffold AppBar={<AppBar title={name} />} BottomNavigation={null}>
      <ScrollView bg="primary.contrast" pb="50px">
        <Column>
          <Column p="15px" bg="primary.contrast">
            <Heading variant="h6">{t('slope.steepness.long_title')}</Heading>
            <LastModified />
          </Column>
        </Column>
        <Column p="15px" bg="grey.300">
          <Text variant="body1">{t('slope.steepness.description')}</Text>
          <Box height="30px" />
          <Row justifyContent="space-between">
            <Button
              _text={{textTransform: 'uppercase'}}
              rightIcon={<Icon name="chevron-right" />}>
              {t('slope.steepness.manual_label')}
            </Button>
            <Button
              _text={{textTransform: 'uppercase'}}
              rightIcon={<Icon name="chevron-right" />}>
              {t('slope.steepness.slope_meter')}
            </Button>
          </Row>
          <Box height="15px" />
          <Text variant="body1" fontWeight={700} alignSelf="center">
            {renderSlopeValue(t, soilData)}
          </Text>
        </Column>
        <ImageRadio
          value={soilData.slopeSteepnessSelect}
          options={steepnessOptions as any}
          onChange={onChange}
        />
      </ScrollView>
      <Fab leftIcon={<Icon name="check" />} label={t('general.done_fab')} />
    </ScreenScaffold>
  );
};
