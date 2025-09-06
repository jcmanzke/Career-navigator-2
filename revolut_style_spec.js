// Revolut style DNA specification
// This file defines a set of design tokens and component guidelines extracted
// from public sources (app store screenshots and design‑foundations.com) as of
// September 2025.  It is deliberately concise so that OpenAI Codex or other
// generators can consume it directly.  All sizes are in pixels and follow a
// 4/8‑pt rhythm.  Colours use hex codes without alpha unless noted.

const revolutTheme = {
  /**
   * Colour palette
   *
   * primary – signature blues used for hero sections and key highlights.
   * neutrals – greys from white through charcoal used for backgrounds and text.
   * accent – light greys used on borders and subtle surfaces.
   * semantic – success/warning/error colours following fintech conventions.
   */
  colors: {
    primary: {
      50:  '#c5dbec', // very light blue
      100: '#9fc3e0',
      200: '#78aad3',
      300: '#5292c7',
      400: '#3879ad',
      500: '#2c5e87', // default primary tint for backgrounds and large buttons
      600: '#1f4360',
      700: '#13283a',
      800: '#060d13',
      900: '#000000'
    },
    neutrals: {
      0:   '#ffffff', // pure white
      50:  '#ebebf0',
      100: '#ceceda',
      200: '#b1b1c4',
      300: '#9393ae',
      400: '#767698',
      500: '#5e5e7d',
      600: '#464f58',
      700: '#30363b',
      800: '#191c1f',
      900: '#020303' // almost black used for deepest backgrounds
    },
    accent: {
      50:  '#ffffff',
      100: '#ffffff',
      200: '#ffffff',
      300: '#ffffff',
      400: '#ffffff',
      500: '#ffffff',
      600: '#e6e6e6',
      700: '#cccccc',
      800: '#b3b3b3',
      900: '#999999'
    },
    semantic: {
      success: {
        light: '#a8e5ac',
        base:  '#22bb33', // vivid green used for positive outcomes and success messages
        dark:  '#178d24'
      },
      warning: {
        light: '#f8d29b',
        base:  '#f0ad4e', // warm amber used for warnings and attention states
        dark:  '#b97c27'
      },
      error: {
        light: '#f2a9ac',
        base:  '#bb2124', // deep red used for destructive actions and error messages
        dark:  '#7e0e0f'
      }
    }
  },

  /**
   * Typography scale
   *
   * Aeonik Pro is used for display/headings with strong weights; Inter is
   * reserved for body copy.  Sizes follow a 1.2–1.25 modular scale.
   */
  typography: {
    fontFamilies: {
      display: '"Aeonik Pro", sans‑serif',
      body:    'Inter, sans‑serif',
      mono:    'Menlo, monospace'
    },
    h1: { fontFamily: 'display', fontSize: 48, lineHeight: 56, fontWeight: 900, letterSpacing: -0.5 },
    h2: { fontFamily: 'display', fontSize: 40, lineHeight: 48, fontWeight: 700, letterSpacing: -0.3 },
    h3: { fontFamily: 'display', fontSize: 32, lineHeight: 40, fontWeight: 700, letterSpacing: -0.2 },
    h4: { fontFamily: 'display', fontSize: 24, lineHeight: 32, fontWeight: 700, letterSpacing: -0.1 },
    h5: { fontFamily: 'display', fontSize: 20, lineHeight: 28, fontWeight: 700, letterSpacing: -0.05 },
    h6: { fontFamily: 'display', fontSize: 18, lineHeight: 24, fontWeight: 600, letterSpacing: 0 },
    body: { fontFamily: 'body', fontSize: 16, lineHeight: 24, fontWeight: 400 },
    small: { fontFamily: 'body', fontSize: 14, lineHeight: 20, fontWeight: 400 },
    mono: { fontFamily: 'mono', fontSize: 14, lineHeight: 20, fontWeight: 400 }
  },

  /**
   * Corner radii in pixels
   */
  radius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    full: 9999
  },

  /**
   * Shadow definitions (elevation levels).  Each string is a CSS box‑shadow.
   */
  shadows: {
    elevation1: '0 1px 3px rgba(0, 0, 0, 0.12)',
    elevation2: '0 2px 6px rgba(0, 0, 0, 0.16)',
    elevation3: '0 4px 10px rgba(0, 0, 0, 0.20)',
    elevation4: '0 8px 14px rgba(0, 0, 0, 0.24)'
  },

  /**
   * Spacing scale based on a 4‑pt grid
   */
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64
  },

  /**
   * Component shape guidelines
   *
   * These describe recommended dimensions and styling rules for core UI
   * components such as buttons, inputs and chips.  Implementers can use
   * these values directly when constructing components in their framework
   * of choice.
   */
  components: {
    button: {
      height: 48,
      minWidth: 120,
      paddingX: 16,
      paddingY: 12,
      borderRadius: 24,
      fontSize: 16,
      fontWeight: 600,
      textTransform: 'uppercase'
    },
    input: {
      height: 48,
      paddingX: 16,
      borderRadius: 16,
      borderWidth: 1,
      fontSize: 16,
      fontWeight: 400
    },
    card: {
      padding: 24,
      borderRadius: 24,
      shadow: 'elevation2',
      backgroundColor: 'neutrals.800'
    },
    chip: {
      height: 32,
      paddingX: 12,
      borderRadius: 'full',
      fontSize: 14,
      fontWeight: 500
    }
  }
};

module.exports = revolutTheme;