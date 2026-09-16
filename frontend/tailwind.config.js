/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1f2937',     // charcoal
          green: '#10b981',    // emerald green
          light: '#f9fafb',    // white off shade
          accent: '#047857',   // dark green
        }
      }
    },
  },
  plugins: [],
}
