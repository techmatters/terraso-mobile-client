import {Text, VStack} from 'native-base';
import {useTranslation} from 'react-i18next';
import RadioBlock from '../common/RadioBlock';

export default function ProjectInputTab() {
  const {t} = useTranslation();

  return (
    <VStack space={3} p={4}>
      <RadioBlock<'imperial' | 'metric'>
        label={t('projects.inputs.units.heading')}
        options={{
          imperial: {text: t('projects.inputs.units.imperial')},
          metric: {text: t('projects.inputs.units.metric')},
        }}
        groupProps={{
          name: 'measurement-units',
          accessibilityLabel: t('projects.inputs.units.a11yLabel'),
          defaultValue: 'imperial',
        }}
      />
      <RadioBlock<'soil-survey' | 'soil-grids'>
        label={t('projects.inputs.soil_source.heading')}
        options={{
          'soil-survey': {text: t('projects.inputs.soil_source.survey')},
          'soil-grids': {
            text: t('projects.inputs.soil_source.grids'),
          },
        }}
        groupProps={{
          name: 'information-source',
          accessibilityLabel: t('projects.inputs.soil_source.a11yLabel'),
          defaultValue: 'soil-survey',
        }}
      />
      <Text>Input methods TBD</Text>
    </VStack>
  );
}
