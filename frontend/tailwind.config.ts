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
          50:  '#f4f4f6',
          100: '#e8e8ed',
          200: '#d0d0da',
          300: '#a8a8ba',
          400: '#787890',
          500: '#5a5a72',
          600: '#44445a',
          700: '#2e2e3e',
          800: '#1a1a28',
          900: '#0f0f1c',
          950: '#080812',
        },
        brand: {
          DEFAULT: '#f59e0b',
          light:   '#fbbf24',
          dark:    '#d97706',
        },
        danger: {
          DEFAULT: '#f43f5e',
          light:   '#fb7185',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'spin':     'spin 0.75s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
