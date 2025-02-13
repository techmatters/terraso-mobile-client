/*
 * Copyright © 2024 Technology Matters
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

import {useTranslation} from 'react-i18next';

import {Formik, FormikHelpers} from 'formik';
import * as yup from 'yup';

import {UserInProjectError} from 'terraso-client-shared/account/accountService';
import {checkUserInProject} from 'terraso-client-shared/account/accountSlice';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {FormInput} from 'terraso-mobile-client/components/form/FormInput';
import {Box, View} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {UserFields} from 'terraso-mobile-client/screens/AddUserToProjectScreen/components/MinimalUserDisplay';
import {useDispatch} from 'terraso-mobile-client/store';

type FormValues = {
  email: string;
};

type FormProps = {
  projectId: string;
};

type UserOrError = UserFields | {type: UserInProjectError};

export const AddTeamMemberForm = ({projectId}: FormProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const onNext = async (
    values: FormValues,
    formikHelpers: FormikHelpers<FormValues>,
  ) => {
    try {
      const result = await dispatch(
        checkUserInProject({projectId: projectId, userEmail: values.email}),
      );
      if (!result.payload) {
        console.error('checkUserInProject returned an undefined payload');
      } else if ('error' in result.payload) {
        console.error(result.payload.error);
        console.error(result.payload.parsedErrors);
      } else {
        const userOrError = result.payload;
        const validationResult = createBackendValidationErrorMessage(
          values.email,
          userOrError,
        );
        // Cannot add email to project
        if (validationResult !== undefined) {
          const error = {email: validationResult};
          formikHelpers.setErrors(error);
        }
        // Success
        else {
          const user = userOrError as UserFields;
          const userId = user.id;
          navigation.navigate('ADD_USER_PROJECT_ROLE', {projectId, userId});
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const createBackendValidationErrorMessage = (
    email: string,
    userOrError: UserOrError,
  ) => {
    if ('type' in userOrError) {
      switch (userOrError.type) {
        case 'NoUser':
          return t('projects.add_user.user_does_not_exist', {
            email: email,
          });
        case 'InProject':
          return t('projects.add_user.user_in_project', {email: email});
      }
    }
    return undefined;
  };

  const validationSchema = yup.object().shape({
    email: yup
      .string()
      .required(t('projects.add_user.invalid_email'))
      .email(t('projects.add_user.invalid_email')),
  });

  return (
    <Formik
      initialValues={{email: ''}}
      validationSchema={validationSchema}
      validateOnMount={true}
      initialTouched={{
        email: true,
      }}
      onSubmit={(values, formikHelpers) => onNext(values, formikHelpers)}>
      {({handleSubmit, isValid, isSubmitting}) => {
        return (
          <>
            <Box minHeight="84px">
              <FormInput
                key="email"
                name="email"
                textInputLabel={t('general.email_label')}
                placeholder={t('general.email_placeholder')}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
              />
            </Box>
            <View mt="sm" alignSelf="flex-end">
              <ContainedButton
                rightIcon="chevron-right"
                onPress={handleSubmit}
                disabled={!isValid || isSubmitting}
                label={t('general.next')}
              />
            </View>
          </>
        );
      }}
    </Formik>
  );
};
