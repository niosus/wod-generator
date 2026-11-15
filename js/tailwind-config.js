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
          DEFAULT: '#38bdf8',
          400: '#7dd3fc',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          glow: 'rgba(56, 189, 248, 0.25)'
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

