import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mockup palette
        'db-base':   '#1a2535',
        'db-panel':  '#243447',
        'db-header': '#0078d4',
        'db-row':    '#1e2d40',
        'db-border': '#0f3d6e',
        'db-muted':  '#8ab4d4',
        'db-label':  '#a8d4f5',
        pass:        '#4ec77a',
        fail:        '#e05c5c',
        blocked:     '#f0a030',
        trend:       '#00b4d8',
        rri:         '#f2a900',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
