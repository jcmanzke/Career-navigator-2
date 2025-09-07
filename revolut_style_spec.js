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
      500: '#FFD84D',
      600: '#E6C13F'
    },
    neutrals: {
      0: '#F9F9F9', // off-white card/background
      50: '#FFFFFF',
      200: '#E6E6E6',
      400: '#CCCCCC',
      500: '#7A7A7A',
      600: '#5C5C5C',
      700: '#3E3E3E',
      900: '#2C2C2C'
    },
    accent: {
      700: '#E6E6E6',
      900: '#7A7A7A'
    },
    semantic: {
      success: {
        light: '#C8E6C9',
        base: '#4CAF50',
        dark: '#388E3C'
      },
      warning: {
        light: '#FFE082',
        base: '#FFD54F',
        dark: '#FFA000'
      },
      error: {
        light: '#EF9A9A',
        base: '#E53935',
        dark: '#B71C1C'
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
      display: '"Poppins", sans-serif',
      body: '"Poppins", sans-serif',
      mono: 'Menlo, monospace'
    },
    h1: { fontFamily: 'display', fontSize: 32, lineHeight: 40, fontWeight: 600, letterSpacing: 0 },
    h2: { fontFamily: 'display', fontSize: 20, lineHeight: 28, fontWeight: 500, letterSpacing: 0 },
    h3: { fontFamily: 'display', fontSize: 28, lineHeight: 36, fontWeight: 700, letterSpacing: 0 },
    h4: { fontFamily: 'display', fontSize: 24, lineHeight: 32, fontWeight: 600, letterSpacing: 0 },
    h5: { fontFamily: 'display', fontSize: 16, lineHeight: 24, fontWeight: 500, letterSpacing: 0 },
    h6: { fontFamily: 'display', fontSize: 14, lineHeight: 20, fontWeight: 500, letterSpacing: 0 },
    body: { fontFamily: 'body', fontSize: 16, lineHeight: 24, fontWeight: 400 },
    small: { fontFamily: 'body', fontSize: 13, lineHeight: 18, fontWeight: 400 },
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