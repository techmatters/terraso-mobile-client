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
import {useToast} from 'native-base';
import {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {setSoilIdStatus} from 'terraso-client-shared/soilId/soilIdSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const Toasts = () => {
  const dispatch = useDispatch();
  const {t} = useTranslation();
  const toast = useToast();
  const soilIdStatus = useSelector(state => state.soilId.status);

  useEffect(() => {
    if (soilIdStatus === 'error') {
      toast.show({
        description: t('errors.generic'),
      });
      dispatch(setSoilIdStatus('ready'));
    }
  }, [soilIdStatus, dispatch, toast, t]);

  return <></>;
};
