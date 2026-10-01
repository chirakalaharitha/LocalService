/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: '#C65F63',
          hover: '#B35256',
          light: '#FDECEF',
          50: '#FDF2F4',
          100: '#FDECEF',
          500: '#C65F63',
          600: '#B35256',
          700: '#9E4448'
        },
        plum: {
          DEFAULT: '#6B4E71',
          hover: '#5A3F60',
          sidebar: '#362837',
          dark: '#2B1E2C',
          light: '#E8D7E6',
          50: '#F9F5F9',
          100: '#E8D7E6',
          500: '#6B4E71',
          800: '#362837',
          900: '#2B1E2C'
        },
        cream: {
          DEFAULT: '#FFF8F3',
          bg: '#FAF5F0',
          card: '#FFFFFF',
          border: '#EFE7E0'
        },
        dark: {
          DEFAULT: '#29252A',
          muted: '#6B666E',
          subtle: '#9E98A2'
        },
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fc',
          400: '#36a9f7',
          500: '#C65F63', // Map primary to Coral
          600: '#B35256',
          700: '#9E4448',
          800: '#074b84',
          900: '#0c3f6e',
          950: '#082849',
        },
        civic: {
          teal: '#0d9488',
          blue: '#1e3a8a',
          navy: '#0f172a',
          emerald: '#059669',
          amber: '#d97706',
          rose: '#e11d48'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

