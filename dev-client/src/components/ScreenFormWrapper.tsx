/*
 * Copyright © 2023 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {forwardRef, useRef, useImperativeHandle} from 'react';
import {Formik, FormikProps} from 'formik';
import {Spacer, Button} from 'native-base';
import * as yup from 'yup';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {SITE_NOTE_MIN_LENGTH} from 'terraso-mobile-client/constants';
import {KeyboardAvoidingView, Platform} from 'react-native';
import {ConfirmModal} from 'terraso-mobile-client/components/ConfirmModal';
import {HorizontalIconButton} from 'terraso-mobile-client/components/Icons';
import {useTranslation} from 'react-i18next';
import {HStack, Box} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = {
  initialValues: {
    content: string;
  };
  onSubmit: (values: {content: string}) => void | Promise<void>;
  onDelete: () => void;
  children: (formikProps: FormikProps<{content: string}>) => React.JSX.Element;
  isSubmitting: boolean;
};

export const ScreenFormWrapper = forwardRef(
  ({initialValues, onSubmit, onDelete, children, isSubmitting}: Props, ref) => {
    const formikRef = useRef<FormikProps<{content: string}>>(null);
    const {t} = useTranslation();
    const notesFormSchema = yup.object().shape({
      content: yup
        .string()
        .required(
          t('site.notes.min_length_error', {min: SITE_NOTE_MIN_LENGTH}),
        ),
    });

    useImperativeHandle(ref, () => ({
      handleSubmit: () => {
        if (formikRef.current) {
          formikRef.current.handleSubmit();
        }
      },
    }));

    const handlePressSubmit = () => {
      if (formikRef.current) {
        formikRef.current.handleSubmit();
      }
    };

    return (
      <ScreenScaffold BottomNavigation={null} AppBar={null}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Handle platform-specific keyboard avoidance
          // eslint-disable-next-line react-native/no-inline-styles
          style={{flex: 1}}>
          <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            validationSchema={notesFormSchema}
            onSubmit={onSubmit}>
            {children}
          </Formik>
          <HStack pr={5} pb={10}>
            <Spacer />
            <ConfirmModal
              trigger={onOpen => (
                <Box pt={2} pr={5}>
                  <HorizontalIconButton
                    p={0}
                    name="delete"
                    isUppercase={true}
                    label={t('general.delete_fab')}
                    colorScheme="error.main"
                    _icon={{
                      color: 'error.main',
                      size: '5',
                    }}
                    isDisabled={isSubmitting}
                    onPress={onOpen}
                  />
                </Box>
              )}
              title={t('site.notes.confirm_removal_title')}
              body={t('site.notes.confirm_removal_body')}
              actionName={t('general.delete_fab')}
              handleConfirm={onDelete}
            />
            <Button
              onPress={handlePressSubmit}
              isDisabled={isSubmitting}
              shadow={1}
              size={'lg'}
              _text={{textTransform: 'uppercase'}}>
              {t('general.done')}
            </Button>
          </HStack>
        </KeyboardAvoidingView>
      </ScreenScaffold>
    );
  },
);
