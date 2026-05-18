import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'var(--bg)',
          card: 'rgb(var(--bg-card-rgb) / <alpha-value>)',
          elev: 'var(--bg-elev)',
        },
        text: 'var(--text)',
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          2: 'rgb(var(--accent-2-rgb) / <alpha-value>)',
        },
        muted: 'var(--muted)',
        border: 'var(--border)',
        success: '#22c55e',
        danger: '#ef4444',
        warn: '#f59e0b',
      },
      backgroundImage: {
        'grad-accent': 'var(--grad-accent)',
        'grad-card': 'linear-gradient(160deg, var(--bg-card) 0%, var(--bg-elev) 100%)',
      },
      boxShadow: {
        glow: 'var(--glow)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.4s ease',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
