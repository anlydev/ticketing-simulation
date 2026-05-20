/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Pretendard', 'system-ui', 'sans-serif']
      },
      colors: {
        ticket: {
          red: '#e11d48',
          cyan: '#22d3ee',
          lime: '#a3e635',
          panel: '#151821',
          ink: '#0a0c12'
        }
      },
      boxShadow: {
        glow: '0 0 26px rgba(34, 211, 238, 0.18)',
        danger: '0 0 24px rgba(225, 29, 72, 0.22)'
      }
    }
  },
  plugins: []
};
