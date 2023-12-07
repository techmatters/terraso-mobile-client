import {screen, fireEvent} from '@testing-library/react-native';
import {customRender as render} from '@testing/utils';
import {Select} from 'native-base';
import {NullableSelect} from 'terraso-mobile-client/components/NullableSelect';

const changeSelectInput = (label: string, optionText: string) => {
  const select = screen.getByLabelText(label, {includeHiddenElements: true});
  fireEvent.press(select);
  const option = screen.getByText(optionText);
  fireEvent.press(option);
};

test('Value of select reset when nullable option selected', () => {
  const mock = jest.fn((newValue: string | undefined) => newValue);
  render(
    <NullableSelect
      nullableOption="Unset"
      accessibilityLabel="Change user role"
      onValueChange={newValue => mock(newValue)}>
      <Select.Item label="Manager" value="manager" />
    </NullableSelect>,
  );
  changeSelectInput('Change user role', 'Unset');
  expect(mock.mock.calls[0][0]).toBe(undefined);
  expect(screen.queryAllByText('Unset')).not.toBeNull();
});
