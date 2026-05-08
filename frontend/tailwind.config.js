/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',   // brand indigo
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        accent: {
          400: '#a78bfa',
          500: '#8b5cf6',   // violet
          600: '#7c3aed',
        },
        neon: {
          green:  '#39ff14',
          blue:   '#00f0ff',
          purple: '#bf5fff',
        },
        dark: {
          base:    '#0d0d0f',
          surface: '#111113',
          card:    '#18181b',
          border:  '#27272a',
          muted:   '#3f3f46',
        },
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient':    'radial-gradient(ellipse at top left, #312e81 0%, #0d0d0f 50%, #1e1b4b 100%)',
        'card-gradient':    'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
        'glow-primary':     'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
        'glow-accent':      'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
        'shimmer':          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
      },
      animation: {
        'float':        'float 6s ease-in-out infinite',
        'glow-pulse':   'glowPulse 3s ease-in-out infinite',
        'shimmer':      'shimmer 2s infinite',
        'fade-in-up':   'fadeInUp 0.6s ease forwards',
        'slide-in':     'slideIn 0.4s ease forwards',
        'spin-slow':    'spin 20s linear infinite',
        'count-up':     'countUp 1.5s ease forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-20px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.05)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        countUp: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        'glow-sm':  '0 0 15px rgba(99,102,241,0.3)',
        'glow-md':  '0 0 30px rgba(99,102,241,0.4)',
        'glow-lg':  '0 0 60px rgba(99,102,241,0.5)',
        'card':     '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(99,102,241,0.25)',
        'neon':     '0 0 10px #6366f1, 0 0 20px #6366f1, 0 0 40px #6366f1',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      {
        dark: {
          'color-scheme':    'dark',
          primary:           '#6366f1',
          'primary-focus':   '#4f46e5',
          'primary-content': '#ffffff',
          secondary:         '#8b5cf6',
          accent:            '#06b6d4',
          neutral:           '#18181b',
          'base-100':        '#0d0d0f',
          'base-200':        '#111113',
          'base-300':        '#18181b',
          'base-content':    '#f8fafc',
          info:              '#3b82f6',
          success:           '#22c55e',
          warning:           '#f59e0b',
          error:             '#ef4444',
        },
      },
      {
        light: {
          'color-scheme':    'light',
          primary:           '#6366f1',
          'primary-focus':   '#4f46e5',
          'primary-content': '#ffffff',
          secondary:         '#8b5cf6',
          accent:            '#06b6d4',
          neutral:           '#e5e7eb',
          'neutral-content': '#1f2937',
          'base-100':        '#ffffff',
          'base-200':        '#f8fafc',
          'base-300':        '#e2e8f0',
          'base-content':    '#0f172a',
          info:              '#3b82f6',
          success:           '#16a34a',
          warning:           '#d97706',
          error:             '#dc2626',
        },
      },
    ],
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
}
