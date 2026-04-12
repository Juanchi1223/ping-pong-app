/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#02020C',
        surface: '#0B0B1A',
        raised: '#111128',
        border: 'rgba(255,255,255,0.07)',
        accent: '#00E676',
        fire: '#FF6B00',
        loss: '#FF2D55',
        purple: '#7C4DFF',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        body: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
