/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#5B7C99',
        secondary: '#E8DCC4',
        accent: '#D97757',
        background: '#f9fafb',
        surface: '#ffffff',
        'poly-pink': '#FFB6C1',
        'world-event': '#fff1f2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        anime: ['Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}