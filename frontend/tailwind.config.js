/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      colors: {
        // New design-system tokens
        yv: {
          page:    'var(--bg-page)',
          surface: 'var(--bg-surface)',
          raised:  'var(--bg-raised)',
          sidebar: 'var(--bg-sidebar)',
          accent:  'var(--accent)',
        },
        ink: {
          DEFAULT:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
        },
        // Legacy Tailwind color utilities (unchanged)
        primary:  'var(--color-primary)',
        surface:  'var(--color-bg-surface)',
        page:     'var(--color-bg-page)',
        elevated: 'var(--color-bg-elevated)',
        success:  'var(--color-success)',
        warning:  'var(--color-warning)',
        danger:   'var(--color-danger)',
        info:     'var(--color-info)',
        // Brand palette updated to orange
        brand: {
          50:  '#FFF1EB',
          100: '#FFE4D6',
          200: '#FFCAB0',
          500: '#E8521A',
          600: '#C7400F',
          700: '#A33308',
        },
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
      },
      boxShadow: {
        sm:    'var(--shadow-sm)',
        md:    'var(--shadow-md)',
        lg:    'var(--shadow-lg)',
        xl:    'var(--shadow-xl)',
        focus: 'var(--shadow-focus)',
      },
    },
  },
  plugins: [],
};
