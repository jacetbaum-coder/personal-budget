/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#f8fafc',
        slate: {
          950: '#0f172a'
        }
      }
    }
  },
  plugins: []
}
