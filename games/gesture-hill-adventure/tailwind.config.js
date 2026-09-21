/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          blue:   '#1AACE0',
          gold:   '#FFE878',
          orange: '#FF6B35',
          purple: '#7B68EE',
        },
      },
    },
  },
  plugins: [],
};
