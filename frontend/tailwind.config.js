/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ncc: {
          navy: '#0b192c',
          navyDark: '#070f1b',
          accent: '#1e3a8a',
          gold: '#f59e0b',
          emerald: '#10b981',
          crimson: '#ef4444'
        }
      }
    },
  },
  plugins: [],
}
