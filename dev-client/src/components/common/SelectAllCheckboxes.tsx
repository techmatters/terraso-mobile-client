import {Checkbox, Text, VStack} from 'native-base';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {LogBox} from 'react-native';

type CheckboxItem = {key: string; value: string; label: string};

type Props = {
  items: CheckboxItem[];
  onUpdate: (items: string[]) => void;
};

export default function SelectAllCheckboxes({items, onUpdate}: Props) {
  const {t} = useTranslation();
  // TODO: see https://github.com/techmatters/terraso-mobile-client/issues/82
  LogBox.ignoreLogs([
    'We can not support a function callback. See Github Issues for details https://github.com/adobe/react-spectrum/issues/2320',
  ]);
  const [selected, setSelected] = useState([] as string[]);
  return (
    <VStack space={2}>
      <Checkbox.Group
        onChange={() => {
          if (selected.length < items.length) {
            let all = items.map(({value}) => String(value));
            setSelected(all);
          } else {
            setSelected([]);
          }
          onUpdate(selected);
        }}>
        <Checkbox value="all">
          <Text>{t('general.select_all', '')}</Text>
        </Checkbox>
      </Checkbox.Group>
      <VStack ml={3} space={2}>
        <Checkbox.Group
          onChange={values => {
            setSelected(values ?? []);
          }}>
          {items.map(({value, key, label}) => (
            <Checkbox value={value} key={key} mb={2}>
              <Text>{label}</Text>
            </Checkbox>
          ))}
        </Checkbox.Group>
      </VStack>
    </VStack>
  );
}
