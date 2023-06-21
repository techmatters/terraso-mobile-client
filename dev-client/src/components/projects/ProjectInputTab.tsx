import {Text, VStack} from 'native-base';
import React from 'react';
import {useTranslation} from 'react-i18next';
import RadioBlock from '../common/RadioBlock';

export default function ProjectInputTab() {
  const {t} = useTranslation();

  const blocks = [
    {
      label: t('projects.inputs.units.heading'),
      options: [
        {text: t('projects.inputs.units.imperial'), value: 'imperial'},
        {text: t('projects.inputs.units.metric'), value: 'metric'},
      ],
      blockName: 'measurement-units',
      a11yLabel: t('projects.inputs.units.a11yLabel'),
      defaultValue: 'imperial',
    },
    {
      label: t('projects.inputs.soil_source.heading'),
      options: [
        {text: t('projects.inputs.soil_source.survey'), value: 'soil-survey'},
        {text: t('projects.inputs.soil_source.grids'), value: 'soil-grids'},
      ],
      blockName: 'information-source',
      a11yLabel: t('projects.inputs.soil_source.a11yLabel'),
      defaultValue: 'soil-survey',
    },
  ];
  return (
    <VStack space={3} p={4}>
      {blocks.map(block => (
        <RadioBlock {...block} key={block.blockName} />
      ))}
      <Text>Input methods TBD</Text>
    </VStack>
  );
}
