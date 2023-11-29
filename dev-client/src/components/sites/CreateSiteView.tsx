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

import {ScrollView} from 'native-base';
import {useCallback, useMemo} from 'react';
import {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {useNavigation} from 'terraso-mobile-client/navigation/useNavigation';
import {siteValidationSchema} from 'terraso-mobile-client/components/sites/validation';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'terraso-mobile-client/model/store';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {
  coordsToString,
  parseCoords,
} from 'terraso-mobile-client/components/common/Map';
import {Formik} from 'formik';
import {
  CreateSiteForm,
  FormState,
} from 'terraso-mobile-client/components/sites/CreateSiteForm';

type Props = {
  defaultProjectId?: string;
  sitePin?: Coords;
  createSiteCallback: (
    input: SiteAddMutationInput,
  ) => Promise<Site | undefined>;
};

export const CreateSiteView = ({
  defaultProjectId,
  createSiteCallback,
  sitePin,
}: Props) => {
  const {t} = useTranslation();
  const validationSchema = useMemo(() => siteValidationSchema(t), [t]);

  const userLocation = useSelector(state => state.map.userLocation);
  const defaultProject = useSelector(state =>
    defaultProjectId ? state.project.projects[defaultProjectId] : undefined,
  );

  const defaultCoords = userLocation.coords;

  const navigation = useNavigation();

  const onSave = useCallback(
    async ({...form}: FormState) => {
      const {coords, ...site} = validationSchema.cast(form);
      const createdSite = await createSiteCallback({
        ...site,
        ...parseCoords(coords),
      });
      if (createdSite !== undefined) {
        navigation.replace('HOME', {
          site: createdSite,
        });
      }
    },
    [createSiteCallback, navigation, validationSchema],
  );

  return (
    <ScrollView>
      <Formik<FormState>
        onSubmit={onSave}
        validationSchema={validationSchema}
        initialValues={{
          name: '',
          coords: defaultCoords ? coordsToString(defaultCoords) : '',
          projectId: defaultProject?.id,
          privacy: defaultProject?.privacy ?? 'PUBLIC',
        }}>
        {props => <CreateSiteForm {...props} sitePin={sitePin} />}
      </Formik>
    </ScrollView>
  );
};
