/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#08080d',
        surface:  '#111118',
        elevated: '#1a1a23',
        border:   'rgba(255,255,255,0.08)',
        border2:  'rgba(255,255,255,0.14)',
        text:     '#f4f4f8',
        text2:    '#9a9aac',
        text3:    '#56566a',
        accent:   '#ffb020',
        win:      '#4ade80',
        loss:     '#fb7185',
        gold:     '#ffc857',
        silver:   '#cdd1de',
        bronze:   '#e0905c',
      },
      fontFamily: {
        display: ['"Saira Condensed"', 'Oswald', 'sans-serif'],
        body:    ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
