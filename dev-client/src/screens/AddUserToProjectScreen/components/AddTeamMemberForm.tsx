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
import {Button} from 'native-base';
import * as yup from 'yup';

import {
  checkUserInProject,
  UserInProjectError,
} from 'terraso-client-shared/account/accountService';
import {SimpleUserInfo} from 'terraso-client-shared/account/accountSlice';

import {FormInput} from 'terraso-mobile-client/components/form/FormInput';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

type FormValues = {
  email: string;
};

type FormProps = {
  projectId: string;
};

type UserOrError = SimpleUserInfo | {type: UserInProjectError};

export const AddTeamMemberForm = ({projectId}: FormProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onNext = async (
    values: FormValues,
    formikHelpers: FormikHelpers<FormValues>,
  ) => {
    const userOrError = await checkUserInProject(projectId, values.email);
    const validationResult = createBackendValidationErrorMessage(
      values.email,
      userOrError,
    );
    // Backend returned errors
    if (validationResult !== undefined) {
      const error = {email: validationResult};
      formikHelpers.setErrors(error);
    }
    // Success
    else {
      const user = userOrError as SimpleUserInfo;
      navigation.navigate('ADD_USER_PROJECT_ROLE', {projectId, user});
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
      .required(t('projects.add_user.empty_email'))
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
                autoComplete="email"
                keyboardType="email-address"
              />
            </Box>
            <Button
              mt="sm"
              alignSelf="flex-end"
              rightIcon={<Icon name="chevron-right" />}
              onPress={handleSubmit}
              isDisabled={!isValid || isSubmitting}
              _text={{textTransform: 'uppercase'}}>
              {t('general.next')}
            </Button>
          </>
        );
      }}
    </Formik>
  );
};
