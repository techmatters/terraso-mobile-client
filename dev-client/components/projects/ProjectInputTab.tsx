import {Box, FormControl, Radio, Text, VStack} from 'native-base';
import {useTranslation} from 'react-i18next';

type RadioOption = {
  value: string;
  text: string;
};

type Props = {
  heading: string;
  options: RadioOption[];
  blockName: string;
  a11yLabel?: string;
};

function RadioBlock({heading, options, blockName, a11yLabel}: Props) {
  return (
    <FormControl>
      <FormControl.Label
        _text={{
          fontSize: 'md',
          bold: true,
          color: 'text.primary',
        }}>
        {heading}
      </FormControl.Label>
      <Radio.Group
        name={blockName}
        accessibilityLabel={a11yLabel}
        colorScheme="primary">
        {options.map(({value, text}) => (
          <Radio value={value} my={1} size="sm" key={value}>
            {text}
          </Radio>
        ))}
      </Radio.Group>
    </FormControl>
  );
}

export default function ProjectInputTab() {
  const {t} = useTranslation();

  const blocks = [
    {
      heading: t('projects.inputs.units'),
      options: [
        {text: t('projects.inputs.imperial'), value: 'imperial'},
        {text: t('projects.inputs.metric'), value: 'metric'},
      ],
      blockName: 'measurement-units',
      a11yLabel: t('projects.inputs.units_a11y'),
    },
    {
      heading: t('projects.inputs.soil_source.heading'),
      options: [
        {text: t('projects.inputs.soil_source.survey'), value: 'soil-survey'},
        {text: t('projects.inputs.soil_source.grids'), value: 'soil-grids'},
      ],
      blockName: 'information-source',
      a11yLabel: t('projects.inputs.soil_source.a11yLabel'),
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
