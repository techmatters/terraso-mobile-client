import {Box, FormControl, HStack} from 'native-base';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import CheckBox from '@react-native-community/checkbox';

export const useCheckboxHandlers = (groups: Record<string, number>) => {
  const [allChecked, setAllChecked] = useState<Record<string, boolean>>(
    Object.keys(groups).reduce((x, y) => ({...x, [y]: false}), {}),
  );
  const [checkedValues, setCheckedValues] = useState<Record<string, boolean[]>>(
    Object.entries(groups).reduce(
      (x, [label, length]) => ({...x, [label]: Array(length).fill(false)}),
      {},
    ),
  );

  const setGroupChecked = (key: string, checked: boolean) => {
    setAllChecked(state => {
      const newState = {...state};
      newState[key] = checked;
      return newState;
    });
  };

  const onValueChanged = (key: string, n: number) => (checked: boolean) =>
    setCheckedValues(state => {
      let newState = {...state};
      newState[key][n] = checked;
      if (allChecked[key] && !checked) {
        setGroupChecked(key, false);
      } else if (!allChecked[key] && newState[key].every(Boolean)) {
        setGroupChecked(key, true);
      }
      return newState;
    });

  const onAllChecked = (key: string) => (checked: boolean) => {
    setGroupChecked(key, checked);
    setCheckedValues(state => {
      let newState = {...state};
      newState[key] = newState[key].fill(checked);
      return newState;
    });
  };

  return {
    allChecked,
    checkedValues,
    onValueChanged,
    onAllChecked,
  };
};

type CheckboxProps = {
  label: string;
  id: string;
  onValue: (checked: boolean) => void;
  checked: boolean;
};

type Props = {
  checkboxes: CheckboxProps[];
  allChecked: boolean;
  onCheckAll: (checked: boolean) => void;
  groupName: string;
};

const CheckboxGroup = ({
  checkboxes,
  groupName,
  allChecked,
  onCheckAll,
}: Props) => {
  const {t} = useTranslation();
  return (
    <Box>
      <HStack>
        <CheckBox
          id={'select-all-' + groupName}
          onValueChange={onCheckAll}
          value={allChecked}
        />
        <FormControl.Label htmlFor={'select-all-' + groupName}>
          {t('general.select_all')}
        </FormControl.Label>
      </HStack>
      {checkboxes.map(({label, id, onValue, checked}) => (
        <HStack key={id}>
          <CheckBox
            id={'checkbox-' + id}
            onValueChange={onValue}
            value={checked}
          />
          <FormControl.Label htmlFor={'checkbox-' + id}>
            {label}
          </FormControl.Label>
        </HStack>
      ))}
    </Box>
  );
};

export default CheckboxGroup;
