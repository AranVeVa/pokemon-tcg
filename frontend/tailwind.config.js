/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        poke: {
          blue: '#1E64B4',
          darkblue: '#123D73',
          red: '#EE3344',
          yellow: '#FFCB05',
          darkyellow: '#D5A100',
          bg: '#F3F4F6',
          card: '#FFFFFF'
        }
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        jump: {
          '0%': { transform: 'scale(0.8) translateY(40px)', opacity: '0' },
          '50%': { transform: 'scale(1.1) translateY(-15px)', opacity: '1' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        shine: {
          '0%': { filter: 'drop-shadow(0 0 5px rgba(255,215,0,0.4)) brightness(1)' },
          '50%': { filter: 'drop-shadow(0 0 25px rgba(255,215,0,0.9)) brightness(1.3)' },
          '100%': { filter: 'drop-shadow(0 0 5px rgba(255,215,0,0.4)) brightness(1)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        }
      },
      animation: {
        float: 'float 3.5s ease-in-out infinite',
        jump: 'jump 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        shine: 'shine 2s infinite ease-in-out',
        pulseGlow: 'pulseGlow 2s infinite ease-in-out'
      }
    },
  },
  plugins: [],
}
