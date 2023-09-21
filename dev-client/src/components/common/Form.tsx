import {ErrorMessage as FormikErrorMessage, useFormikContext} from 'formik';
import {FormControl, Input, Radio} from 'native-base';
import {createContext, useContext} from 'react';

type FieldContextType<Name extends string = string, T = string> = {
  name: Name;
  value: T;
  onChange: (_: T) => void;
  onBlur: () => void;
};
const FieldContext = createContext<FieldContextType | undefined>(undefined);

export const useFieldContext = <
  Name extends string,
  Value = string,
  FormValues extends Record<Name, Value> = Record<Name, Value>,
>(
  name?: Name,
) => {
  const fieldContext = useContext(FieldContext) as
    | FieldContextType<Name, Value>
    | undefined;
  const {values, handleChange, handleBlur} = useFormikContext<FormValues>();

  return name === undefined
    ? fieldContext!
    : {
        name,
        value: values[name] as string,
        onChange: handleChange(name),
        onBlur: handleBlur(name) as unknown as () => void,
      };
};

type FormFieldProps<Name extends string> = React.PropsWithChildren<{
  name: Name;
}>;
export const FormField = <Name extends string>({
  name,
  children,
}: FormFieldProps<Name>) => (
  <FieldContext.Provider value={useFieldContext(name)}>
    <FormControl>{children}</FormControl>
  </FieldContext.Provider>
);

type WrapperProps = {
  name?: string;
  label?: string;
  errorMessage?: React.ReactNode;
  helpText?: string;
};
export const FormFieldWrapper = ({
  name,
  label,
  errorMessage = <FormErrorMessage />,
  helpText,
  children,
}: React.PropsWithChildren<WrapperProps>) => {
  const wrappedChildren = (
    <>
      {label && <FormLabel>{label}</FormLabel>}
      {children}
      {helpText && <FormHelperText>{helpText}</FormHelperText>}
      {errorMessage}
    </>
  );
  return name !== undefined ? (
    <FormField name={name}>{wrappedChildren}</FormField>
  ) : (
    wrappedChildren
  );
};

type InputProps = WrapperProps & React.ComponentProps<typeof Input>;
export const FormInput = (props: InputProps) => {
  const {value, onChange, onBlur} = useFieldContext(props.name);
  return (
    <FormFieldWrapper {...props}>
      <Input value={value} onChangeText={onChange} onBlur={onBlur} {...props} />
    </FormFieldWrapper>
  );
};

export const FormLabel = (
  props: React.ComponentProps<typeof FormControl.Label>,
) => <FormControl.Label {...props} />;

export const FormErrorMessage = (
  props: React.ComponentProps<typeof FormControl.ErrorMessage>,
) => (
  <FormikErrorMessage name={useFieldContext().name}>
    {msg => (
      <FormControl.ErrorMessage isInvalid {...props}>
        {msg}
      </FormControl.ErrorMessage>
    )}
  </FormikErrorMessage>
);

export const FormHelperText = (
  props: React.ComponentProps<typeof FormControl.HelperText>,
) =>
  useFieldContext().name in useFormikContext().errors ? undefined : (
    <FormControl.HelperText {...props} />
  );

type RadioGroupProps<T> = {
  values: T[];
  renderRadio: (value: T) => React.ReactNode;
} & WrapperProps &
  Omit<React.ComponentProps<typeof Radio.Group>, 'name'>;
export const FormRadioGroup = <T extends string>({
  values,
  renderRadio,
  ...props
}: RadioGroupProps<T>) => (
  <FormFieldWrapper {...props}>
    <Radio.Group {...useFieldContext(props.name)} {...props}>
      {values.map(renderRadio)}
    </Radio.Group>
  </FormFieldWrapper>
);

export const FormRadio = (props: React.ComponentProps<typeof Radio>) => (
  <Radio key={props.value} {...props} />
);
