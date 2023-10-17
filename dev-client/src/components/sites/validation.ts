import * as yup from 'yup';
import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MIN,
  LONGITUDE_MAX,
  SITE_NAME_MAX,
  SITE_NAME_MIN,
} from 'terraso-mobile-client/constants';
import {TFunction} from 'i18next';
import {
  CoordsParseError,
  parseCoords,
} from 'terraso-mobile-client/components/common/Map';

export const siteValidationSchema = (t: TFunction) =>
  yup.object({
    name: yup
      .string()
      .trim()
      .min(
        SITE_NAME_MIN,
        t('site.form.name_min_length_error', {
          min: SITE_NAME_MIN,
        }),
      )
      .max(
        SITE_NAME_MAX,
        t('site.form.name_max_length_error', {
          max: SITE_NAME_MAX,
        }),
      )
      .required(
        t('site.form.name_min_length_error', {
          min: SITE_NAME_MIN,
        }),
      ),
    coords: yup
      .string()
      .required(t('site.form.coords_parse_error.COORDS_PARSE'))
      .test((coords, {createError}) => {
        try {
          parseCoords(coords);
        } catch (e) {
          if (e instanceof CoordsParseError) {
            return createError({
              message: t(`site.form.coords_parse_error.${e.message}`, {
                LATITUDE_MIN,
                LATITUDE_MAX,
                LONGITUDE_MIN,
                LONGITUDE_MAX,
              }),
            });
          }
          throw e;
        }
        return true;
      }),
    projectId: yup.string(),
    privacy: yup.string().oneOf(['PUBLIC', 'PRIVATE'] as const),
  });
