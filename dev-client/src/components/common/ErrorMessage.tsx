import {ErrorMessage as FormikErrorMessage} from 'formik';
import {Text} from 'native-base';

type Props = {
  fieldName: string;
};

export default function ErrorMessage({fieldName}: Props) {
  return (
    <FormikErrorMessage name={fieldName}>
      {msg => <Text color="error.main">{msg}</Text>}
    </FormikErrorMessage>
  );
}
