tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        volt: {
          DEFAULT: '#bef264',
          400: '#a3e635',
          500: '#84cc16',
          glow: 'rgba(190, 242, 100, 0.25)'
        },
        slate: {
          850: '#131c2e',
          925: '#0b1120',
          950: '#060a12'
        }
      }
    }
  }
};

