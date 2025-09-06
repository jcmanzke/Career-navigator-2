import revolutTheme from "./revolut_style_spec.js";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: revolutTheme.colors,
      fontFamily: revolutTheme.typography.fontFamilies,
      borderRadius: revolutTheme.radius,
      boxShadow: revolutTheme.shadows,
      spacing: revolutTheme.spacing,
      fontSize: {
        h1: [
          `${revolutTheme.typography.h1.fontSize}px`,
          {
            lineHeight: `${revolutTheme.typography.h1.lineHeight}px`,
            fontWeight: revolutTheme.typography.h1.fontWeight,
            letterSpacing: `${revolutTheme.typography.h1.letterSpacing}px`,
          },
        ],
        h2: [
          `${revolutTheme.typography.h2.fontSize}px`,
          {
            lineHeight: `${revolutTheme.typography.h2.lineHeight}px`,
            fontWeight: revolutTheme.typography.h2.fontWeight,
            letterSpacing: `${revolutTheme.typography.h2.letterSpacing}px`,
          },
        ],
        h3: [
          `${revolutTheme.typography.h3.fontSize}px`,
          {
            lineHeight: `${revolutTheme.typography.h3.lineHeight}px`,
            fontWeight: revolutTheme.typography.h3.fontWeight,
            letterSpacing: `${revolutTheme.typography.h3.letterSpacing}px`,
          },
        ],
        h4: [
          `${revolutTheme.typography.h4.fontSize}px`,
          {
            lineHeight: `${revolutTheme.typography.h4.lineHeight}px`,
            fontWeight: revolutTheme.typography.h4.fontWeight,
            letterSpacing: `${revolutTheme.typography.h4.letterSpacing}px`,
          },
        ],
        h5: [
          `${revolutTheme.typography.h5.fontSize}px`,
          {
            lineHeight: `${revolutTheme.typography.h5.lineHeight}px`,
            fontWeight: revolutTheme.typography.h5.fontWeight,
            letterSpacing: `${revolutTheme.typography.h5.letterSpacing}px`,
          },
        ],
        h6: [
          `${revolutTheme.typography.h6.fontSize}px`,
          {
            lineHeight: `${revolutTheme.typography.h6.lineHeight}px`,
            fontWeight: revolutTheme.typography.h6.fontWeight,
            letterSpacing: `${revolutTheme.typography.h6.letterSpacing}px`,
          },
        ],
        body: [
          `${revolutTheme.typography.body.fontSize}px`,
          {
            lineHeight: `${revolutTheme.typography.body.lineHeight}px`,
            fontWeight: revolutTheme.typography.body.fontWeight,
          },
        ],
        small: [
          `${revolutTheme.typography.small.fontSize}px`,
          {
            lineHeight: `${revolutTheme.typography.small.lineHeight}px`,
            fontWeight: revolutTheme.typography.small.fontWeight,
          },
        ],
        mono: [
          `${revolutTheme.typography.mono.fontSize}px`,
          {
            lineHeight: `${revolutTheme.typography.mono.lineHeight}px`,
            fontWeight: revolutTheme.typography.mono.fontWeight,
          },
        ],
      },
    },
  },
  plugins: [],
};
