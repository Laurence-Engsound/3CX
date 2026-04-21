/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{vue,js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0ea5e9',
          dark: '#0369a1'
        }
      },
      fontFamily: {
        sans: [
          '"Noto Sans TC"',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ]
      }
    }
  },
  plugins: []
}
