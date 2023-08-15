import {extendTheme} from 'native-base';

export const theme = extendTheme({
  colors: {
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
    error: {
      main: '#D32F2F',
    },
    grey: {
      200: '#EEEEEE',
      300: '#E0E0E0',
      800: '#424242',
    },
    action: {
      active: '#1A202CB2',
    },
    text: {
      primary: '#1A202CCC',
      secondary: '#1A202CCC',
    },
  },
  radii: {
    md: 4,
  },
  components: {
    Box: {
      variants: {
        card: {
          borderRadius: '4px',
          backgroundColor: 'background.default',
          padding: '16px',
          shadow: 1,
        },
      },
    },
    Badge: {
      variants: {
        chip: {
          borderRadius: '100px',
          padding: '4px',
        },
      },
    },
    Button: {
      sizes: {
        md: {
          _icon: {
            size: 'md',
          },
        },
      },
    },
    FAB: {
      baseStyle: {
        px: '22px',
        py: '8px',
        rounded: 'md',
        _text: {
          fontSize: 15,
          lineHeight: 26,
        },
        right: '24px',
        bottom: '24px',
        shadowOffset: {
          width: 0,
          height: 3,
        },
      },
    },
    Select: {
      baseStyle: {
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
      },
    },
    FormControlLabel: {
      baseStyle: {
        _text: {
          fontSize: 'sm',
          fontWeight: 'bold',
          color: 'text.primary',
        },
      },
    },
    Input: {
      defaultProps: {
        size: 'lg',
      },
    },
    Icon: {
      defaultProps: {
        size: 'lg',
      },
    },
    RadioGroup: {
      baseStyle: {
        colorScheme: 'primary',
      },
      variants: {
        oneLine: {
          direction: 'row',
          space: '26px',
        },
      },
    },
    Radio: {
      baseStyle: {
        size: 'sm',
        my: 1,
      },
    },
    Text: {
      variants: {
        body1: {
          fontSize: '16px',
          fontWeight: 400,
          lineHeight: '24px',
        },
        body2: {},
        subtitle1: {},
        subtitle2: {
          fontSize: '16px',
          fontWeight: 500,
          lineHeight: '22px',
          letterSpacing: '0.1px',
        },
      },
    },
    Heading: {
      variants: {
        h1: {},
        h2: {},
        h3: {},
        h4: {},
        h5: {},
        h6: {
          fontSize: '20px',
          fontWeight: 500,
          lineHeight: '32px',
        },
      },
    },
  },
});

type CustomThemeType = typeof theme;

declare module 'native-base' {
  interface ICustomTheme extends CustomThemeType {}
}
