import * as yup from 'yup';
import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MIN,
  LONGITUDE_MAX,
  SITE_NAME_MAX,
  SITE_NAME_MIN,
} from '../../constants';
import {TFunction} from 'i18next';
import {Coords} from '../../model/map/mapSlice';

const coordsRegex = /^(-?\d+\.\d+)\s*[, ]\s*(-?\d+\.\d+)$/;

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
      .mixed(
        (coords): coords is Coords =>
          typeof coords === 'object' &&
          typeof coords.latitude === 'number' &&
          typeof coords.longitude === 'number',
      )
      .required(t('site.form.coords_parse_error'))
      .test((_, {createError, originalValue}) => {
        const match = (originalValue as string).trim().match(coordsRegex);
        if (!match) {
          return createError({message: t('site.form.coords_parse_error')});
        }

        const [latitude, longitude] = [match[1], match[2]].map(
          Number.parseFloat,
        );
        if (Number.isNaN(latitude)) {
          return createError({message: t('site.form.latitude_parse_error')});
        } else if (Number.isNaN(longitude)) {
          return createError({message: t('site.form.longitude_parse_error')});
        } else if (latitude < LATITUDE_MIN) {
          return createError({
            message: t('site.form.latitude_min_error', {min: LATITUDE_MIN}),
          });
        } else if (latitude > LATITUDE_MAX) {
          return createError({
            message: t('site.form.latitude_max_error', {max: LATITUDE_MAX}),
          });
        } else if (longitude < LONGITUDE_MIN) {
          return createError({
            message: t('site.form.longitude_min_error', {min: LONGITUDE_MIN}),
          });
        } else if (longitude > LONGITUDE_MAX) {
          return createError({
            message: t('site.form.longitude_max_error', {max: LONGITUDE_MAX}),
          });
        } else {
          return true;
        }
      })
      .transform((value: string) => {
        const match = value.trim().match(coordsRegex)!;
        return {
          latitude: Number.parseFloat(match[1]),
          longitude: Number.parseFloat(match[2]),
        };
      }),
    projectId: yup.string(),
    privacy: yup.string().oneOf(['PUBLIC', 'PRIVATE'] as const),
  });
