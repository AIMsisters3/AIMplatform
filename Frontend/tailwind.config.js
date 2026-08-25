/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2DA8FF',
        secondary: '#7A2CF3',
        accent: '#E548B9',
        surface: '#F8F7FD',
        ink: '#2D2A4A',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #2DA8FF 0%, #7A2CF3 55%, #E548B9 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(45,168,255,0.12) 0%, rgba(122,44,243,0.12) 55%, rgba(229,72,185,0.12) 100%)',
      },
      borderRadius: {
        xl2: '20px',
        xl3: '28px',
      },
      fontFamily: {
        display: ['"Poppins"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(45, 42, 74, 0.08)',
      },
    },
  },
  plugins: [],
};
