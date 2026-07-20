import { definePreset } from '@primeng/themes';
import Lara from '@primeng/themes/lara';

/**
 * PrimeNG 18 replacement for the compact Omega/Bootstrap look used by the
 * Angular 8 client. Application-specific layout remains in styles.scss;
 * component colors and density belong to the preset.
 */
export const JETTI_PRESET = definePreset(Lara, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '2px',
      sm: '3px',
      md: '4px',
      lg: '4px',
      xl: '6px'
    },
    blue: {
      50: '#eaf4fb',
      100: '#d4e9f7',
      200: '#a9d3ef',
      300: '#7ebde7',
      400: '#53a7df',
      500: '#337ab7',
      600: '#286090',
      700: '#204d74',
      800: '#193d5c',
      900: '#122c43',
      950: '#091722'
    },
    green: {
      50: '#eef8ee',
      100: '#d9efd9',
      200: '#b3dfb3',
      300: '#8dce8d',
      400: '#67be67',
      500: '#5cb85c',
      600: '#449d44',
      700: '#398439',
      800: '#2d682d',
      900: '#214c21',
      950: '#102610'
    },
    orange: {
      50: '#fff8ed',
      100: '#fcebd0',
      200: '#f8d69e',
      300: '#f4c16d',
      400: '#f1ad3b',
      500: '#f0ad4e',
      600: '#ec971f',
      700: '#d58512',
      800: '#a9680e',
      900: '#7d4d0a',
      950: '#3e2605'
    },
    red: {
      50: '#fceeed',
      100: '#f7d8d5',
      200: '#efb0aa',
      300: '#e78880',
      400: '#df6055',
      500: '#d9534f',
      600: '#c9302c',
      700: '#ac2925',
      800: '#85201d',
      900: '#611715',
      950: '#300c0a'
    },
    sky: {
      50: '#edf8fc',
      100: '#d7eff7',
      200: '#afe0ef',
      300: '#87d0e7',
      400: '#5fc1df',
      500: '#5bc0de',
      600: '#31b0d5',
      700: '#269abc',
      800: '#1e7892',
      900: '#16566a',
      950: '#0b2b35'
    }
  },
  semantic: {
    transitionDuration: '0.15s',
    disabledOpacity: '0.35',
    iconSize: '16px',
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}'
    },
    formField: {
      paddingX: '0.343rem',
      paddingY: '0.343rem',
      borderRadius: '{border.radius.md}',
      focusRing: {
        width: '0',
        style: 'none',
        color: 'transparent',
        offset: '0',
        shadow: '0 0 5px #c0c0c0'
      }
    },
    content: {
      borderRadius: '{border.radius.md}'
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f6f7f9',
          100: '#eeeeee',
          200: '#dddddd',
          300: '#cccccc',
          400: '#adadad',
          500: '#777777',
          600: '#555555',
          700: '#333333',
          800: '#222222',
          900: '#1b1d1f',
          950: '#111111'
        },
        primary: {
          color: '{primary.500}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.600}',
          activeColor: '{primary.700}'
        },
        highlight: {
          background: '#186ba0',
          focusBackground: '#156090',
          color: '#ffffff',
          focusColor: '#ffffff'
        },
        formField: {
          background: '#ffffff',
          disabledBackground: '#eeeeee',
          filledBackground: '#ffffff',
          filledHoverBackground: '#ffffff',
          filledFocusBackground: '#ffffff',
          borderColor: '#d6d6d6',
          hoverBorderColor: '#c0c0c0',
          focusBorderColor: '#c0c0c0',
          invalidBorderColor: '{red.500}',
          color: '#222222',
          disabledColor: '#777777',
          placeholderColor: '#777777',
          invalidPlaceholderColor: '{red.600}',
          floatLabelColor: '#777777',
          floatLabelFocusColor: '{primary.600}',
          floatLabelActiveColor: '#777777',
          iconColor: '#555555',
          shadow: 'none'
        },
        text: {
          color: '#222222',
          hoverColor: '#111111',
          mutedColor: '#777777',
          hoverMutedColor: '#555555'
        },
        content: {
          background: '#ffffff',
          hoverBackground: '#eeeeee',
          borderColor: '#d9d9d9',
          color: '#222222',
          hoverColor: '#212121'
        }
      }
    }
  },
  components: {
    button: {
      root: {
        borderRadius: '4px',
        gap: '0.35rem',
        paddingX: '0.75rem',
        paddingY: '0.343rem',
        iconOnlyWidth: '28px',
        label: {
          fontWeight: '400'
        }
      },
      colorScheme: {
        light: {
          root: {
            secondary: {
              background: '#ffffff',
              hoverBackground: '#e6e6e6',
              activeBackground: '#d4d4d4',
              borderColor: '#cccccc',
              hoverBorderColor: '#adadad',
              activeBorderColor: '#8c8c8c',
              color: '#333333',
              hoverColor: '#333333',
              activeColor: '#333333'
            },
            success: {
              background: '{green.500}',
              hoverBackground: '{green.600}',
              activeBackground: '{green.700}',
              borderColor: '#4cae4c',
              hoverBorderColor: '#398439',
              activeBorderColor: '#255625'
            },
            info: {
              background: '{sky.500}',
              hoverBackground: '{sky.600}',
              activeBackground: '{sky.700}',
              borderColor: '#46b8da',
              hoverBorderColor: '#269abc',
              activeBorderColor: '#1b6d85'
            },
            warn: {
              background: '{orange.500}',
              hoverBackground: '{orange.600}',
              activeBackground: '{orange.700}',
              borderColor: '#eea236',
              hoverBorderColor: '#d58512',
              activeBorderColor: '#985f0d'
            },
            danger: {
              background: '{red.500}',
              hoverBackground: '{red.600}',
              activeBackground: '{red.700}',
              borderColor: '#d43f3a',
              hoverBorderColor: '#ac2925',
              activeBorderColor: '#761c19'
            }
          }
        }
      }
    },
    toolbar: {
      root: {
        background: '#f5f5f5',
        borderColor: '#dddddd',
        borderRadius: '4px',
        color: '#333333',
        gap: '1px',
        padding: '1px'
      }
    },
    datatable: {
      header: {
        padding: '0.343rem'
      },
      headerCell: {
        padding: '0.343rem',
        gap: '0.25rem'
      },
      columnTitle: {
        fontWeight: '400'
      },
      bodyCell: {
        padding: '0.343rem'
      },
      footerCell: {
        padding: '0.343rem'
      },
      footer: {
        padding: '0.343rem'
      },
      colorScheme: {
        light: {
          root: {
            borderColor: '#dddddd'
          },
          header: {
            background: '#f6f7f9',
            color: '#1b1d1f'
          },
          headerCell: {
            background: '#f6f7f9',
            hoverBackground: '#eeeeee',
            color: '#1b1d1f'
          },
          footer: {
            background: '#f6f7f9',
            color: '#1b1d1f'
          },
          footerCell: {
            background: '#f6f7f9',
            color: '#1b1d1f'
          },
          bodyCell: {
            selectedBorderColor: '#156090'
          }
        }
      }
    },
    treetable: {
      header: {
        padding: '0.343rem'
      },
      headerCell: {
        padding: '0.343rem',
        gap: '0.25rem'
      },
      columnTitle: {
        fontWeight: '400'
      },
      bodyCell: {
        padding: '0.343rem',
        gap: '0.25rem'
      },
      footerCell: {
        padding: '0.343rem'
      },
      footer: {
        padding: '0.343rem'
      }
    },
    panel: {
      root: {
        borderColor: '#dddddd',
        borderRadius: '4px'
      },
      header: {
        borderColor: '#dddddd',
        padding: '6px 12px',
        borderRadius: '4px 4px 0 0'
      },
      toggleableHeader: {
        padding: '2px 12px'
      },
      title: {
        fontWeight: '600'
      },
      content: {
        padding: '8px'
      },
      footer: {
        padding: '8px'
      }
    },
    tabs: {
      tab: {
        padding: '8px 10px',
        fontWeight: '400',
        borderWidth: '1px 1px 0 1px',
        borderColor: '#dddddd',
        hoverBorderColor: '#dddddd',
        activeBorderColor: '{primary.color}',
        margin: '0 2px 0 0'
      },
      tabpanel: {
        padding: '0'
      }
    },
    select: {
      dropdown: {
        width: '28px'
      }
    },
    autocomplete: {
      dropdown: {
        width: '28px'
      }
    },
    datepicker: {
      dropdown: {
        width: '28px'
      }
    },
    checkbox: {
      root: {
        width: '16px',
        height: '16px',
        borderRadius: '3px'
      },
      icon: {
        size: '12px'
      }
    },
    paginator: {
      root: {
        padding: '1px',
        gap: '1px',
        borderRadius: '4px'
      },
      navButton: {
        width: '28px',
        height: '28px',
        borderRadius: '4px'
      }
    }
  }
});
