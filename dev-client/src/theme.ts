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
      active: '#1A202C',
    },
    text: {
      primary: '#1A202C',
      secondary: '#1A202C',
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
        sm: {
          px: '10px',
          py: '4px',
          _text: {
            fontSize: '13px',
            fontWeight: 500,
            lineHeight: '22px',
            letterSpacing: '0.46px',
          },
        },
        md: {
          _icon: {
            size: 'md',
          },
        },
        lg: {
          _text: {
            fontSize: '15px',
            fontWeight: 500,
            lineHeight: '26px',
            letterSpacing: '0.46px',
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
        shadow: 2,
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
      sizes: {
        sm: '20px',
        md: '24px',
        lg: '35px',
      },
      defaultProps: {
        size: 'md',
      },
    },
    IconButton: {
      sizes: {
        sm: {
          padding: '4px',
        },
        md: {
          padding: '12px',
        },
      },
      defaultProps: {
        size: 'sm',
        _icon: {
          size: 'md',
        },
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
          letterSpacing: '0.15px',
        },
        body2: {
          fontSize: '14px',
          fontWeight: 400,
          lineHeight: '20px',
          letterSpacing: '0.17px',
        },
        subtitle1: {},
        subtitle2: {
          fontSize: '16px',
          fontWeight: 500,
          lineHeight: '22px',
          letterSpacing: '0.1px',
        },
        caption: {
          fontSize: '12px',
          fontWeight: 400,
          lineHeight: '20px',
          letterSpacing: '0.4px',
        },
      },
    },
    Heading: {
      variants: {
        h1: {},
        h2: {},
        h3: {
          fontSize: '48px',
          fontWeight: 400,
          lineHeight: '56px',
        },
        h4: {},
        h5: {
          fontSize: '24px',
          fontWeight: 400,
          lineHeight: '32px',
        },
        h6: {
          fontSize: '20px',
          fontWeight: 500,
          lineHeight: '32px',
        },
      },
    },
    Link: {
      baseStyle: {
        _text: {
          fontSize: '16px',
          fontWeight: 400,
          lineHeight: '24px',
          letterSpacing: '0.15px',
          color: 'primary.main',
        },
      },
    },
  },
});

type CustomThemeType = typeof theme;

declare module 'native-base' {
  interface ICustomTheme extends CustomThemeType {}
}
