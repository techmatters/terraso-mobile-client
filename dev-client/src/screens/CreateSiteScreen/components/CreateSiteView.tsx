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

import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {Formik} from 'formik';

import {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {siteValidationSchema} from 'terraso-mobile-client/schemas/siteValidationSchema';
import {useSelector} from 'terraso-mobile-client/store';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {
  coordsToString,
  parseCoords,
} from 'terraso-mobile-client/components/StaticMapView';
import {
  CreateSiteForm,
  FormState,
} from 'terraso-mobile-client/screens/CreateSiteScreen/components/CreateSiteForm';
import {useHomeScreenContext} from 'terraso-mobile-client/screens/HomeScreen/HomeScreen';

type Props = {
  defaultProjectId?: string;
  sitePin?: Coords;
  createSiteCallback: (
    input: SiteAddMutationInput,
  ) => Promise<Site | undefined>;
  onInfoPress: () => void;
};

export const CreateSiteView = ({
  defaultProjectId,
  createSiteCallback,
  sitePin,
  onInfoPress,
}: Props) => {
  const {t} = useTranslation();
  const validationSchema = useMemo(() => siteValidationSchema(t), [t]);
  const userLocation = useSelector(state => state.map.userLocation);
  const defaultProject = useSelector(state =>
    defaultProjectId ? state.project.projects[defaultProjectId] : undefined,
  );
  const homeScreen = useHomeScreenContext();

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
        homeScreen?.showSiteOnMap(createdSite);
        navigation.pop();
      }
    },
    [createSiteCallback, navigation, validationSchema, homeScreen],
  );

  return (
    <Formik<FormState>
      onSubmit={onSave}
      validationSchema={validationSchema}
      initialValues={{
        name: '',
        coords: defaultCoords ? coordsToString(defaultCoords) : '',
        projectId: defaultProject?.id,
        privacy: defaultProject?.privacy ?? 'PUBLIC',
      }}>
      {props => (
        <CreateSiteForm
          {...props}
          sitePin={sitePin}
          onInfoPress={onInfoPress}
        />
      )}
    </Formik>
  );
};
