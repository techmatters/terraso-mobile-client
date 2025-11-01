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

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {useTranslation} from 'react-i18next';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Formik, FormikProps} from 'formik';
import * as yup from 'yup';

import {DeleteButton} from 'terraso-mobile-client/components/buttons/common/DeleteButton';
import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {
  Box,
  Column,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollView} from 'terraso-mobile-client/components/safeview/SafeScrollView';
import {SITE_NOTE_MIN_LENGTH} from 'terraso-mobile-client/constants';
import {SAFE_AREA_BOTTOM_PADDING_WITH_BUTTONS} from 'terraso-mobile-client/constants/safeArea';
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
    const insets = useSafeAreaInsets();
    const [buttonRowHeight, setButtonRowHeight] = useState(
      SAFE_AREA_BOTTOM_PADDING_WITH_BUTTONS,
    );
    const [keyboardHeight, setKeyboardHeight] = useState(0);

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

    // Calculate total button area height including Row's internal padding plus extra clearance
    // The Box's onLayout measures the container but we need extra space for comfortable scrolling
    const totalButtonAreaHeight =
      buttonRowHeight + Math.max(10, insets.bottom) + 20;

    // Track keyboard height to adjust ScrollView padding
    useEffect(() => {
      const keyboardWillShow = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        e => {
          setKeyboardHeight(e.endCoordinates.height);
        },
      );
      const keyboardWillHide = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
        () => {
          setKeyboardHeight(0);
        },
      );

      return () => {
        keyboardWillShow.remove();
        keyboardWillHide.remove();
      };
    }, []);

    // Shared button row component
    const buttonRow = (
      <Row
        style={{paddingBottom: Math.max(10, insets.bottom)}}
        paddingHorizontal={5}
        space={5}
        justifyContent="flex-end"
        alignItems="center"
        backgroundColor="background.default">
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
    );

    // Shared scroll content - render function to ensure fresh evaluation
    const renderScrollContent = () => {
      return (
        <React.Fragment>
          <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            validationSchema={notesFormSchema}
            onSubmit={onSubmit}>
            {formikProps => children(formikProps)}
          </Formik>
        </React.Fragment>
      );
    };

    // Platform-specific content container style
    const scrollContentStyle = useMemo(
      () =>
        keyboardHeight > 0
          ? {paddingBottom: keyboardHeight}
          : {paddingBottom: totalButtonAreaHeight},
      [keyboardHeight, totalButtonAreaHeight],
    );

    // Platform-specific button box style
    const buttonBoxStyle = useMemo(
      () =>
        Platform.OS === 'android' && keyboardHeight > 0
          ? {transform: [{translateY: -keyboardHeight}]}
          : undefined,
      [keyboardHeight],
    );

    const content = (
      <Column flex={1}>
        <SafeScrollView
          keyboardShouldPersistTaps="handled"
          minimumPadding={0}
          contentContainerStyle={scrollContentStyle}
          disableAutoPadding={true}
          flex={1}>
          {renderScrollContent()}
        </SafeScrollView>
        <Box
          style={buttonBoxStyle}
          onLayout={e => {
            setButtonRowHeight(e.nativeEvent.layout.height);
          }}>
          {buttonRow}
        </Box>
      </Column>
    );

    return (
      <ScreenScaffold BottomNavigation={null} AppBar={null}>
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView
            behavior="padding"
            keyboardVerticalOffset={buttonRowHeight + insets.bottom}
            style={styles.view}>
            {content}
          </KeyboardAvoidingView>
        ) : (
          content
        )}
      </ScreenScaffold>
    );
  },
);

const styles = StyleSheet.create({
  view: {flex: 1},
});
