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
  View as RNView,
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
import {debugEnabled} from 'terraso-mobile-client/config';
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

const getDebugStyles = () =>
  debugEnabled
    ? {
        column: {borderWidth: 5, borderColor: 'blue'},
        columnBg: '#eff0ff',
        buttonBox: {borderWidth: 3, borderColor: 'yellow'},
        buttonBoxBg: '#fff9e0',
        row: {borderWidth: 2, borderColor: 'red'},
        rowBg: '#ffe0e0',
        safeAreaSpacer: {borderWidth: 2, borderColor: 'green'},
        safeAreaSpacerBg: '#e0ffe0',
      }
    : {
        column: {},
        columnBg: undefined,
        buttonBox: {},
        buttonBoxBg: undefined,
        row: {},
        rowBg: undefined,
        safeAreaSpacer: {},
        safeAreaSpacerBg: undefined,
      };

export const ScreenFormWrapper = forwardRef(
  ({initialValues, onSubmit, onDelete, children, isSubmitting}: Props, ref) => {
    const formikRef = useRef<FormikProps<{content: string}>>(null);
    const containerRef = useRef<RNView>(null);
    const {t} = useTranslation();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const debugStyles = getDebugStyles();
    debugLogInsets(insets);
    const [buttonRowHeight, setButtonRowHeight] = useState(
      SAFE_AREA_BOTTOM_PADDING_WITH_BUTTONS,
    );
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    // The offset from screen top to KeyboardAvoidingView
    // Initial value = safe area top;
    // updated value measured in onLayout callback via containerRef.current.measure()
    const [screenTopOffset, setScreenTopOffset] = useState(insets.top);

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

    // Calculate total button area height for comfortable scrolling clearance
    // buttonRowHeight already includes the Row's internal padding
    const totalButtonAreaHeight = buttonRowHeight + 20;

    // Track keyboard height to adjust ScrollView padding
    useEffect(() => {
      const keyboardWillShow = Keyboard.addListener('keyboardDidShow', e => {
        debugLogKeyboardEvent(e, {
          buttonRowHeight,
          insetsBottom: insets.bottom,
          screenTopOffset,
        });
        setKeyboardHeight(e.endCoordinates.height);
      });
      const keyboardWillHide = Keyboard.addListener('keyboardDidHide', () => {
        debugLogKeyboardHide();
        setKeyboardHeight(0);
      });

      return () => {
        keyboardWillShow.remove();
        keyboardWillHide.remove();
      };
    }, [buttonRowHeight, insets.bottom, screenTopOffset]);

    // Shared button row component
    // iOS: Fixed padding (safe area handled by spacer Box)
    // Android: Include insets.bottom for home bar clearance
    const buttonRowStyle = useMemo(
      () => [
        {
          paddingTop: 10,
          paddingBottom:
            Platform.OS === 'ios' ? 10 : Math.max(10, insets.bottom),
        },
        debugStyles.row,
      ],
      [insets.bottom, debugStyles.row],
    );

    const buttonRow = (
      <Row
        style={buttonRowStyle}
        paddingHorizontal={5}
        space={5}
        justifyContent="flex-end"
        alignItems="center"
        backgroundColor={debugStyles.rowBg}>
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
          label={t('general.save')}
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
      () => [
        Platform.OS === 'android' && keyboardHeight > 0
          ? {transform: [{translateY: -keyboardHeight}]}
          : undefined,
        debugStyles.buttonBox,
      ],
      [keyboardHeight, debugStyles.buttonBox],
    );

    const content = (
      <>
        <Column
          flex={1}
          style={[debugStyles.column]}
          backgroundColor={debugStyles.columnBg}
          onLayout={withDebugLayout('Column')}>
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
            backgroundColor={debugStyles.buttonBoxBg}
            onLayout={withDebugLayout('Button Box', e => {
              setButtonRowHeight(e.nativeEvent.layout.height);
            })}>
            {buttonRow}
          </Box>
        </Column>
        {/* Safe area spacer for home indicator - iOS only, pushed up by KeyboardAvoidingView */}
        {Platform.OS === 'ios' && (
          <Box
            height={insets.bottom}
            style={debugStyles.safeAreaSpacer}
            backgroundColor={debugStyles.safeAreaSpacerBg}
            onLayout={withDebugLayout('Safe Area Spacer')}
          />
        )}
      </>
    );

    return (
      <ScreenScaffold BottomNavigation={null} AppBar={null}>
        <RNView
          ref={containerRef}
          style={styles.container}
          onLayout={() => {
            // Measure the absolute position on screen to get the correct offset for KeyboardAvoidingView
            if (containerRef.current) {
              containerRef.current.measure(
                (_x, _y, _width, _height, _pageX, pageY) => {
                  if (
                    // this whole if clause might not be needed; see comments below
                    pageY !== undefined && // some reports of Android calling with undefined
                    Math.abs(screenTopOffset - pageY) > 0.5 // avoid potential infinite loop due to rounding
                  ) {
                    setScreenTopOffset(pageY);
                    debugLogScreenOffset(pageY, screenTopOffset);
                  }
                },
              );
            }
          }}>
          {Platform.OS === 'ios' ? (
            <KeyboardAvoidingView
              behavior="padding"
              keyboardVerticalOffset={screenTopOffset - insets.bottom}
              style={styles.view}
              onLayout={withDebugLayout('KeyboardAvoidingView', undefined, {
                currentOffset: screenTopOffset - insets.bottom,
                insetsBottom: insets.bottom,
              })}>
              {content}
            </KeyboardAvoidingView>
          ) : (
            content
          )}
        </RNView>
      </ScreenScaffold>
    );
  },
);

const styles = StyleSheet.create({
  view: {flex: 1},
  container: {flex: 1},
});

/* =============================
   Debug Helper Functions
   ============================= */

const debugLogInsets = (insets: any) => {
  if (!debugEnabled) return;
  console.log('📱 Safe Area Insets:', insets);
  const {width: screenWidth, height: screenHeight} =
    require('react-native').Dimensions.get('window');
  console.log('📱 Screen Dimensions:', {screenWidth, screenHeight});
};

const debugLogKeyboardEvent = (e: any, context: any) => {
  if (!debugEnabled) return;
  console.log('🎹 KEYBOARD EVENT:', {
    screenY: e.endCoordinates.screenY,
    height: e.endCoordinates.height,
    width: e.endCoordinates.width,
    ...context,
  });
};

const debugLogKeyboardHide = () => {
  if (!debugEnabled) return;
  console.log('🎹 KEYBOARD HIDE');
};

const debugLogScreenOffset = (pageY: number, previousOffset: number) => {
  if (!debugEnabled) return;
  console.log('📏 Container screen offset measured:', {
    pageY,
    previousOffset,
  });
};

const withDebugLayout = (
  label: string,
  handler?: (e: any) => void,
  extraData?: any,
) => {
  return (e: any) => {
    if (debugEnabled) {
      const emoji = label.includes('Button')
        ? '📦'
        : label.includes('Keyboard')
          ? '📏'
          : '🔵';
      console.log(`${emoji} ${label} onLayout:`, {
        x: e.nativeEvent.layout.x,
        y: e.nativeEvent.layout.y,
        width: e.nativeEvent.layout.width,
        height: e.nativeEvent.layout.height,
        ...extraData,
      });
    }
    handler?.(e);
  };
};
