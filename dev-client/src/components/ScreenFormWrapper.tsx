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

import {forwardRef, useCallback, useImperativeHandle, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';

import {Formik, FormikProps} from 'formik';
import * as yup from 'yup';

import {DeleteButton} from 'terraso-mobile-client/components/buttons/common/DeleteButton';
import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {Row} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SITE_NOTE_MIN_LENGTH} from 'terraso-mobile-client/constants';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

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
    const navigation = useNavigation();
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

    // Only show a delete confirmation message if the note is a new, blank note.
    const conditionallyConfirmDelete = useCallback(
      (onOpen: () => void) => {
        if (
          formikRef?.current?.dirty === true ||
          formikRef?.current?.values?.content?.length
        ) {
          onOpen();
        } else {
          navigation.pop();
        }
      },
      [navigation],
    );

    return (
      <ScreenScaffold BottomNavigation={null} AppBar={null}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Handle platform-specific keyboard avoidance
          style={styles.view}>
          <ScrollView
            style={styles.view}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <Formik
              innerRef={formikRef}
              initialValues={initialValues}
              validationSchema={notesFormSchema}
              onSubmit={onSubmit}>
              {children}
            </Formik>
            <Row
              pb={10}
              paddingHorizontal={5}
              space={5}
              justifyContent="flex-end"
              alignItems="center">
              <ConfirmModal
                trigger={onOpen => (
                  <DeleteButton
                    disabled={isSubmitting}
                    onPress={() => conditionallyConfirmDelete(onOpen)}
                  />
                )}
                title={t('site.notes.confirm_removal_title')}
                body={t('site.notes.confirm_removal_body')}
                actionLabel={t('general.delete')}
                handleConfirm={onDelete}
              />
              <ContainedButton
                onPress={handlePressSubmit}
                disabled={isSubmitting}
                size="lg"
                label={t('general.done')}
              />
            </Row>
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenScaffold>
    );
  },
);

const styles = StyleSheet.create({
  view: {flex: 1},
  scrollContent: {flexGrow: 1},
});
