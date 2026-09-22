/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-canvas': 'rgb(var(--bg-canvas) / <alpha-value>)',
        'bg-surface': 'rgb(var(--bg-surface) / <alpha-value>)',
        'bg-surface-elevated': 'rgb(var(--bg-surface-elevated) / <alpha-value>)',
        'text-heading': 'rgb(var(--text-heading) / <alpha-value>)',
        'text-body': 'rgb(var(--text-body) / <alpha-value>)',
        'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',
        'accent': 'rgb(var(--accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-hover) / <alpha-value>)',
        'border': 'rgb(var(--border) / <alpha-value>)',
      },
      borderRadius: {
        theme: 'var(--radius)',
      },
      fontFamily: {
        sans: ['var(--font-family)', 'Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
