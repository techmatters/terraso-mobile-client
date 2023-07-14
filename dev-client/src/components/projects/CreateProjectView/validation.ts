import * as yup from 'yup';
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_NAME_MIN_LENGTH,
} from '../../../constants';

export default yup.object().shape({
  name: yup
    .string()
    .min(PROJECT_NAME_MIN_LENGTH)
    .max(PROJECT_NAME_MAX_LENGTH)
    .required(),
  description: yup.string().max(PROJECT_DESCRIPTION_MAX_LENGTH),
  privacy: yup.string().oneOf(['PRIVATE', 'PUBLIC']).required(),
});
