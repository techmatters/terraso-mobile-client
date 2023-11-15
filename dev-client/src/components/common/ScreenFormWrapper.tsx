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

import {Formik, FormikProps} from 'formik';
import * as yup from 'yup';
import {useTranslation} from 'react-i18next';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {SITE_NOTE_MIN_LENGTH} from 'terraso-mobile-client/constants';
import {KeyboardAvoidingView, Platform} from 'react-native';

interface ScreenFormWrapperProps {
  initialValues: {
    content: string;
  };
  onSubmit: (values: {content: string}) => void | Promise<void>;
  children: (formikProps: FormikProps<{content: string}>) => JSX.Element;
}

export const ScreenFormWrapper = ({
  initialValues,
  onSubmit,
  children,
}: ScreenFormWrapperProps) => {
  const {t} = useTranslation();
  const notesFormSchema = yup.object().shape({
    content: yup
      .string()
      .required(t('site.notes.min_length_error', {min: SITE_NOTE_MIN_LENGTH})),
  });

  return (
    <ScreenScaffold BottomNavigation={null} AppBar={null}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Handle platform-specific keyboard avoidance
        // eslint-disable-next-line react-native/no-inline-styles
        style={{flex: 1}}>
        <Formik
          initialValues={initialValues}
          validationSchema={notesFormSchema}
          onSubmit={onSubmit}>
          {formikProps => <>{children(formikProps)}</>}
        </Formik>
      </KeyboardAvoidingView>
    </ScreenScaffold>
  );
};
