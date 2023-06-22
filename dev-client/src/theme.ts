import {extendTheme} from 'native-base';

const newColorTheme = {
  primary: {
    main: '#276749',
    contrast: '#FFFFFF',
    lightest: '#9AE6B4',
    // TODO: This is used for the colorScheme value for Radio
    // We should figure out how the color scheme stuff works and see if we can
    // map our current variables to 100, 200 values etc.
    600: '#276749',
  },
  background: {
    default: '#FFFFFF',
  },
  secondary: {
    main: '#C05621',
  },
  grey: {
    200: '#EEEEEE',
  },
  action: {
    active: '#1A202C',
  },
  text: {
    primary: '#1A202C',
  },
};

export const theme = extendTheme({colors: newColorTheme});

type CustomThemeType = typeof theme;

declare module 'native-base' {
  interface ICustomTheme extends CustomThemeType {}
}
