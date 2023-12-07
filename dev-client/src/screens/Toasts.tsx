import {useToast} from 'native-base';
import {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'terraso-mobile-client/model/store';
import {setSoilIdStatus} from 'terraso-client-shared/soilId/soilIdSlice';

export const Toasts = () => {
  const dispatch = useDispatch();
  const {t} = useTranslation();
  const toast = useToast();
  const soilIdStatus = useSelector(state => state.soilId.status);

  useEffect(() => {
    if (soilIdStatus === 'error') {
      toast.show({
        description: t('errors.soilId'),
      });
      dispatch(setSoilIdStatus('ready'));
    }
  }, [soilIdStatus, dispatch, toast, t]);

  return <></>;
};
