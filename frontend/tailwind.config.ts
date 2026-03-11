// frontend/tailwind.config.ts

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#0d1117',
          900: '#161b22',
          800: '#1c2128',
          700: '#21262d',
          600: '#30363d',
          500: '#484f58',
          400: '#6e7681',
          300: '#8b949e',
          200: '#b1bac4',
          100: '#c9d1d9',
          50: '#f0f6fc',
        },
        brand: {
          DEFAULT: '#1a6cf0',
          light: '#388bfd',
          dark: '#1158d6',
        },
        success: '#3fb950',
        warning: '#d29922',
        danger: '#f85149',
      },
    },
  },
  plugins: [],
};

export default config;
