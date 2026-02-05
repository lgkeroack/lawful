/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        map: {
          unselected: '#E5E7EB',
          hover: '#93C5FD',
          selected: '#2563EB',
          federal: '#10B981',
        },
      },
    },
  },
  plugins: [],
};
