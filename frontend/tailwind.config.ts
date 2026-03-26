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
        // Clean, professional grayscale - Linear/Notion style
        dark: {
          50: '#f7f7f8',
          100: '#ebebed',
          200: '#d4d4d8',
          300: '#a1a1aa',
          400: '#71717a',
          500: '#52525b',
          600: '#3f3f46',
          700: '#27272a',
          800: '#18181b',
          900: '#0f0f11',
          950: '#09090b',
        },
        brand: {
          DEFAULT: '#d97706', // Warm amber - Claude style
          light: '#f59e0b',
          dark: '#b45309',
        },
        success: {
          DEFAULT: '#16a34a',
          light: '#22c55e',
        },
        warning: {
          DEFAULT: '#ca8a04',
          light: '#eab308',
        },
        danger: {
          DEFAULT: '#dc2626',
          light: '#ef4444',
        },
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'sm': '0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
        'glow-brand': '0 0 20px rgba(217, 119, 6, 0.15), 0 0 40px rgba(217, 119, 6, 0.05)',
        'glow-success': '0 0 20px rgba(22, 163, 74, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        flowRight: {
          '0%': { left: '0%', opacity: '0' },
          '15%': { opacity: '1' },
          '85%': { opacity: '1' },
          '100%': { left: '100%', opacity: '0' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
};

export default config;
