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

import {useTranslation} from 'react-i18next';

import {Formik, FormikHelpers} from 'formik';
import {Button} from 'native-base';
import * as yup from 'yup';

import {
  checkUserInProject,
  UserInProjectError,
} from 'terraso-client-shared/account/accountService';
import {SimpleUserInfo} from 'terraso-client-shared/account/accountSlice';

import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {FormInput} from 'terraso-mobile-client/components/form/FormInput';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {Box, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useSelector} from 'terraso-mobile-client/store';

type Props = {
  projectId: string;
};

export const AddUserToProjectScreen = ({projectId}: Props) => {
  const {t} = useTranslation();

  // FYI: There was previously a mechanism to enter emails individually, but set roles at the same time.
  // This was replaced, but we could refer back to `userRecord` in previous versions if we ever end up
  // wanting to add multiple users at the same time.

  // const keyboardOpen = useKeyboardOpen();
  // const navigation = useNavigation();
  // const dispatch = useDispatch();
  const projectName = useSelector(
    state => state.project.projects[projectId]?.name,
  );

  return (
    <ScreenScaffold AppBar={<AppBar title={projectName} />}>
      <ScreenContentSection title={t('projects.add_user.heading')}>
        <Text variant="body1">{t('projects.add_user.help_text')}</Text>
        <Box mt="md">
          <AddTeamMemberForm projectId={projectId} />
        </Box>
      </ScreenContentSection>
    </ScreenScaffold>
  );
};

// TODO-cknipe: Move this to new file?
type FormValues = {
  email: string;
};

type FormProps = {
  projectId: string;
};

type UserOrError = SimpleUserInfo | {type: UserInProjectError};

const AddTeamMemberForm = ({projectId}: FormProps) => {
  const {t} = useTranslation();

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
      const errors = {email: validationResult};
      formikHelpers.setErrors(errors);
    }
    // Success
    else {
      // TODO-cknipe: Go to the next screen, pass it the SimpleUserInfo
      // Do this on the next screen:
      // const submitUsers = async () => {
      //   setIsSubmitting(true);
      //   for (const {
      //     user: {id: userId},
      //     role,
      //   } of Object.values(userRecord)) {
      //     try {
      //       dispatch(addUserToProject({userId, role, projectId}));
      //     } catch (e) {
      //       console.error(e);
      //     }
      //   }
      //   navigation.pop();
      //   setIsSubmitting(false);
      // };
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
            <FormInput
              key="email"
              name="email"
              textInputLabel={t('general.email_label')}
              placeholder={t('general.email_placeholder')}
            />
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
