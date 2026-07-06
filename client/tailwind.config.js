/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E6F0F4',
          100: '#B4D5DF', // Light Highlight
          200: '#8FBAD1',
          300: '#639AC4', // Accent Blue
          400: '#4A7CAE',
          500: '#305E9A', // Secondary Blue
          600: '#20497F',
          700: '#163866',
          800: '#0F3364', // Primary Blue
          900: '#0A2244',
          950: '#091932', // Dark Background
        },
        slate: {
          50: '#FAFAFA',
          100: '#F4F4F3',
          200: '#E5E4E0',
          300: '#D1D0C9',
          400: '#95938C', // Metallic Silver
          500: '#73716A',
          600: '#54534E',
          700: '#42413D',
          800: '#2E2F33', // Dark Gray
          900: '#19191C',
          950: '#091932', // Dark Background
        }
      },
    },
  },
  plugins: [],
}
