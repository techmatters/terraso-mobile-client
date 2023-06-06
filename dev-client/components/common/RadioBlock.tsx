import {FormControl, Radio} from 'native-base';

type RadioOption = {
  value: string;
  text: string;
};

type Props = {
  heading: string;
  options: RadioOption[];
  blockName: string;
  a11yLabel?: string;
  defaultValue?: string;
};

export default function RadioBlock({
  heading,
  options,
  blockName,
  a11yLabel,
  defaultValue,
}: Props) {
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
        colorScheme="primary"
        defaultValue={defaultValue}>
        {options.map(({value, text}) => (
          <Radio value={value} my={1} size="sm" key={value}>
            {text}
          </Radio>
        ))}
      </Radio.Group>
    </FormControl>
  );
}
