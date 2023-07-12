import * as yup from 'yup';
import {SITE_NAME_MAX, SITE_NAME_MIN} from '../../constants';

export const siteValidationSchema = yup.object().shape({
  name: yup
    .string()
    .min(SITE_NAME_MIN)
    .max(SITE_NAME_MAX)
    .required('Site name is required'),
  latitude: yup.number().min(-90).max(90).required('Latitude is required'),
  longitude: yup.number().min(-180).max(180).required('Longitude is required'),
});
