/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pastel Green palette
        mint: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Pastel Sky Blue palette
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Custom pastel accent colors
        pastel: {
          green: '#a7f3d0',
          blue: '#a5d8ff',
          pink: '#ffc8dd',
          lavender: '#e2d9f3',
          peach: '#ffd6ba',
          cream: '#fef9ef',
        }
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        handwriting: ['Dancing Script', 'cursive'],
      },
      backgroundImage: {
        'gradient-love': 'linear-gradient(135deg, #a7f3d0 0%, #a5d8ff 50%, #e2d9f3 100%)',
        'gradient-soft': 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
        'gradient-card': 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(240,253,244,0.8) 100%)',
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(167, 243, 208, 0.3)',
        'glow': '0 0 40px rgba(167, 243, 208, 0.4)',
        'card': '0 10px 40px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'heart-beat': 'heart-beat 1.5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
        'heart-beat': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
}
