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

import {MD3LightTheme as DefaultTheme} from 'react-native-paper';

import {extendTheme} from 'native-base';

export const SWITCH_PADDING = 2;
export const SWITCH_VERTICAL_PADDING = 1;

export const paperTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    outlineVariant: '#616161',
  },
};

export const theme = extendTheme({
  colors: {
    primary: {
      main: '#028843',
      contrast: '#FFFFFF',
      lighter: '#93E39B',
      lightest: '#E2FFE5',
      dark: '#00582B',
      // TODO: This is used for the colorScheme value for Radio
      // We should figure out how the color scheme stuff works and see if we can
      // map our current variables to 100, 200 values etc.
      600: '#028843',
    },
    background: {
      default: '#FFFFFF',
      secondary: '#00344D',
      tertiary: '#E0E0E0',
    },
    secondary: {
      main: '#C05621',
      dark: '#9C4221',
    },
    error: {
      main: '#D32F2F',
      contrast: '#FFFFFF',
    },
    grey: {
      200: '#EEEEEE',
      300: '#E0E0E0',
      700: '#616161',
      800: '#424242',
    },
    action: {
      active: '#1A202C',
      active_subtle: '#1A202CB2',
      disabled: '#8B9498',
      disabledBackground: '#E0E0E0',
    },
    text: {
      primary: '#1A202C',
      secondary: '#33474F',
      disabled: '#9EA8AB',
      locationicon: '#001923B3',
    },
    m3: {
      sys: {
        light: {
          outline: '#79747E',
        },
      },
    },
    input: {
      standard: {
        enabledBorder: '#8B8B8B',
      },
      filled: {
        enabledFill: '#e4e4e4',
      },
    },
    transparent: '#00000000',
  },
  radii: {
    md: 4,
  },
  space: {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 36,
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
        tile: {
          borderRadius: '4px',
          backgroundColor: 'background.secondary',
        },
      },
    },
    Badge: {
      variants: {
        chip: {
          borderRadius: '100px',
          padding: '4px',
          bg: 'primary.lighter',
          _icon: {
            color: 'action.active',
          },
        },
        notification: {
          bg: 'primary.lightest',
          _text: {
            fontSize: '12px',
          },
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          rounded: 'full',
          px: '6.5px',
          zIndex: 1,
        },
      },
    },
    Button: {
      defaultProps: {
        _pressed: {
          bg: 'primary.dark',
        },
      },
      baseStyle: {
        _disabled: {
          opacity: '100',
        },
      },
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
          px: '16px',
          py: '6px',
          _text: {
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: '24px',
            letterSpacing: '0.4px',
          },
          _icon: {
            size: 'sm',
          },
        },
        lg: {
          _text: {
            fontSize: '15px',
            fontWeight: 500,
            lineHeight: '26px',
            letterSpacing: '0.46px',
          },
          px: '22px',
          py: '8px',
        },
      },
      variants: {
        solid: {
          _disabled: {
            bg: 'action.disabledBackground',
            _text: {
              color: 'action.disabled',
            },
            _icon: {
              color: 'action.disabled',
            },
          },
        },
        speedDial: {
          size: 'md',
          borderRadius: '50px',
          shadow: 6,
          backgroundColor: 'primary.contrast',
          _icon: {
            size: 'sm',
            color: 'text.primary',
          },
          _text: {
            color: 'text.primary',
          },
        },
        fullWidth: {
          borderRadius: '0px',
          width: 'full',
          justifyContent: 'flex-start',
        },
        link: {
          _text: {textDecorationLine: 'underline'},
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
          textTransform: 'uppercase',
        },
        right: '24px',
        bottom: '24px',
        shadow: 6,
      },
      defaultProps: {
        renderInPortal: false,
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
          color: 'text.primary',
          fontSize: '16px',
          fontWeight: 700,
          lineHeight: '24px',
          letterSpacing: '0.15px',
        },
      },
      variants: {
        subtle: {
          _text: {
            color: 'text.secondary',
            fontSize: '12px',
            fontWeight: 400,
            lineHeight: '12px',
            letterSpacing: '0.15px',
          },
        },
        secondary: {
          _text: {
            color: 'text.secondary',
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: '24px',
            letterSpacing: '0.15px',
          },
        },
        body1: {
          _text: {
            color: 'text.primary',
            fontWeight: 400,
            fontSize: '16px',
            lineHeight: '24px',
          },
        },
      },
      defaultProps: {
        _text: {
          variant: 'body1-strong',
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
        sm: 20,
        md: 24,
        lg: 35,
      },
    },
    IconButton: {
      sizes: {
        xs: {
          padding: '0px',
        },
        sm: {
          padding: '4px',
        },
        md: {
          padding: '12px',
        },
        lg: {
          padding: '16px',
        },
      },
      defaultProps: {
        _pressed: {
          bg: 'transparent',
        },
        size: 'sm',
        _icon: {
          size: 'md',
        },
      },
      variants: {
        FAB: {
          shadow: 2,
          borderRadius: 'full',
          backgroundColor: 'primary.main',
          _icon: {
            color: 'primary.contrast',
            size: 'md',
          },
        },
        filterIcon: {
          bg: 'primary.contrast',
          borderRadius: 'full',
          _icon: {color: 'action.active', size: 'sm'},
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
        fontSize: '16px',
        fontWeight: 400,
        lineHeight: '24px',
        letterSpacing: '0.15px',
        m: '8px',
        mr: '0px',
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
        'body1-strong': {
          color: 'text.primary',
          fontWeight: 700,
          fontSize: '16px',
          lineHeight: '24px',
        },
        'body1-medium': {
          fontSize: '16px',
          fontWeight: 500,
          lineHeight: '24px',
          letterSpacing: '0.17px',
        },
        body2: {
          fontSize: '14px',
          fontWeight: 400,
          lineHeight: '20px',
          letterSpacing: '0.17px',
        },
        subtitle1: {
          fontSize: '18px',
          fontWeight: 700,
          lineHeight: '24px',
          letterSpacing: '0.15px',
        },
        subtitle2: {
          fontSize: '14px',
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
        'table-header': {
          fontSize: '16px',
          lineHeight: '24px',
          fontWeight: 600,
          letterSpacing: '0.17px',
        },
        'input-text': {
          fontSize: '16px',
          fontWeight: 400,
          lineHeight: '24px',
          letterSpacing: '0.15px',
        },
        'score-tile': {
          fontWeight: 400,
          fontSize: '30px',
          lineHeight: '48px',
        },
        'match-tile-name': {
          fontWeight: 700,
          fontSize: '18px',
          lineHeight: '27px',
          letterSpacing: '0.15px',
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
        h4: {
          fontSize: '24px',
          fontWeight: 700,
          lineHeight: '32px',
        },
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
          fontWeight: 800,
          lineHeight: '24px',
          letterSpacing: '0.15px',
          color: 'primary.main',
        },
      },
    },
    Image: {
      variants: {
        profilePic: {
          size: '40px',
          borderRadius: 80,
        },
      },
    },
    Modal: {
      defaultProps: {
        avoidKeyboard: true,
      },
    },
    FormControlHelperText: {
      baseStyle: {
        _text: {
          fontSize: '12px',
          lineHeight: '19.92px',
          fontWeight: 400,
          color: 'text.primary',
          letterSpacing: '0.4px',
        },
      },
    },
    Row: {
      variants: {
        tablerow: {
          justifyContent: 'left',
          borderBottomWidth: '1px',
          borderColor: 'divider',
          py: '5px',
          px: '10px',
        },
      },
    },
  },
});

type CustomThemeType = typeof theme;

declare module 'native-base' {
  interface ICustomTheme extends CustomThemeType {}
}
