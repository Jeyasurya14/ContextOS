// frontend/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  safelist: [
    'bg-brand', 'text-brand', 'border-brand', 'hover:bg-brand',
    'focus:ring-brand', 'bg-violet', 'text-violet', 'border-violet',
    'bg-cyan', 'text-cyan',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          50:  '#f4f4f6',
          100: '#e8e8ed',
          200: '#d0d0da',
          300: '#a8a8ba',
          400: '#7878909',
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
          muted:   'rgba(245,158,11,0.15)',
        },
        violet: {
          DEFAULT: '#8b5cf6',
          light:   '#a78bfa',
          dark:    '#7c3aed',
          muted:   'rgba(139,92,246,0.15)',
        },
        cyan: {
          DEFAULT: '#06b6d4',
          light:   '#22d3ee',
          dark:    '#0891b2',
          muted:   'rgba(6,182,212,0.15)',
        },
        emerald: {
          DEFAULT: '#10b981',
          light:   '#34d399',
          dark:    '#059669',
          muted:   'rgba(16,185,129,0.15)',
        },
        rose: {
          DEFAULT: '#f43f5e',
          light:   '#fb7185',
          dark:    '#e11d48',
          muted:   'rgba(244,63,94,0.15)',
        },
        success: { DEFAULT: '#10b981', light: '#34d399' },
        warning: { DEFAULT: '#f59e0b', light: '#fbbf24' },
        danger:  { DEFAULT: '#f43f5e', light: '#fb7185' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'xs':           '0 1px 2px rgba(0,0,0,0.4)',
        'sm':           '0 2px 8px rgba(0,0,0,0.35)',
        'md':           '0 4px 16px rgba(0,0,0,0.3)',
        'lg':           '0 8px 32px rgba(0,0,0,0.35)',
        'xl':           '0 16px 48px rgba(0,0,0,0.4)',
        'glow-brand':   '0 0 24px rgba(245,158,11,0.2), 0 0 48px rgba(245,158,11,0.08)',
        'glow-violet':  '0 0 24px rgba(139,92,246,0.2), 0 0 48px rgba(139,92,246,0.08)',
        'glow-cyan':    '0 0 24px rgba(6,182,212,0.2), 0 0 48px rgba(6,182,212,0.08)',
        'glow-emerald': '0 0 24px rgba(16,185,129,0.2), 0 0 48px rgba(16,185,129,0.08)',
        'inner-glow':   'inset 0 1px 0 rgba(255,255,255,0.06)',
        'neo':          '0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      backgroundImage: {
        'mesh-dark':    'radial-gradient(at 40% 20%, hsla(265,80%,10%,1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(240,70%,6%,1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(260,75%,8%,1) 0px, transparent 50%), radial-gradient(at 80% 50%, hsla(220,65%,5%,1) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(240,80%,8%,1) 0px, transparent 50%)',
        'grid-subtle':  'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        'gradient-brand': 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
        'gradient-violet': 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)',
        'gradient-aurora': 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 40%, #06b6d4 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #f59e0b 0%, #f43f5e 100%)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      animation: {
        'fade-in':        'fadeIn 0.4s ease-out',
        'fade-in-slow':   'fadeIn 0.8s ease-out',
        'slide-up':       'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
        'slide-down':     'slideDown 0.4s cubic-bezier(0.16,1,0.3,1)',
        'slide-right':    'slideRight 0.4s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':       'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)',
        'shimmer':        'shimmer 2.5s linear infinite',
        'glow-pulse':     'glowPulse 3s ease-in-out infinite',
        'float':          'float 6s ease-in-out infinite',
        'float-slow':     'float 9s ease-in-out infinite',
        'spin-slow':      'spin 8s linear infinite',
        'blob':           'blob 8s ease-in-out infinite',
        'blob-slow':      'blob 12s ease-in-out infinite',
        'ping-slow':      'ping 3s cubic-bezier(0,0,0.2,1) infinite',
        'aurora':         'aurora 12s ease-in-out infinite',
        'counter-up':     'counterUp 0.6s cubic-bezier(0.16,1,0.3,1)',
        'border-glow':    'borderGlow 3s ease-in-out infinite',
        'gradient-shift': 'gradientShift 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%':   { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.5', filter: 'blur(20px)' },
          '50%':       { opacity: '1',   filter: 'blur(30px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '33%':       { transform: 'translateY(-8px) rotate(0.5deg)' },
          '66%':       { transform: 'translateY(4px) rotate(-0.5deg)' },
        },
        blob: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%', transform: 'scale(1)' },
          '33%':       { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%', transform: 'scale(1.05)' },
          '66%':       { borderRadius: '50% 60% 30% 60% / 30% 60% 70% 40%', transform: 'scale(0.97)' },
        },
        aurora: {
          '0%, 100%': { backgroundPosition: '0% 50%', opacity: '0.6' },
          '50%':       { backgroundPosition: '100% 50%', opacity: '1' },
        },
        counterUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        borderGlow: {
          '0%, 100%': { boxShadow: '0 0 4px rgba(245,158,11,0.2), inset 0 0 4px rgba(245,158,11,0.05)' },
          '50%':       { boxShadow: '0 0 16px rgba(245,158,11,0.4), inset 0 0 8px rgba(245,158,11,0.1)' },
        },
        gradientShift: {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },
      transitionDuration: {
        '400': '400ms',
      },
    },
  },
  plugins: [],
};

export default config;
