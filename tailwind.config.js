/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      spacing: { 4.5: '1.125rem' },
      boxShadow: { xs: '0 1px 2px 0 rgba(0,0,0,0.05)' },
      colors: {
        background: 'var(--bg)',
        surface: { DEFAULT: 'var(--surface)', hover: 'var(--surface-hover)', raised: 'var(--surface-raised)' },
        border: { DEFAULT: 'var(--border)', hover: 'var(--border-hover)', subtle: 'var(--border-subtle)' },
        text: { primary: 'var(--text-primary)', secondary: 'var(--text-secondary)', muted: 'var(--text-muted)', subtle: 'var(--text-subtle)' },
        accent: { DEFAULT: 'var(--accent)', subtle: 'var(--accent-subtle)', glow: 'var(--accent-glow)', blue: 'var(--indicator-active)' },
      },
      fontFamily: {
        sans: ['Geist', '"Geist Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      letterSpacing: { 'tight-heading': '-0.035em', 'snug-heading': '-0.02em' },
    },
  },
  plugins: [],
};
