/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--primary-rgb) / <alpha-value>)',
        secondary: 'rgb(var(--secondary-rgb) / <alpha-value>)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        ink: 'rgb(var(--bg-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-app)', 'Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 70px -20px rgb(var(--primary-rgb) / 0.65)',
        'glow-sm': '0 0 35px -12px rgb(var(--primary-rgb) / 0.65)',
        card: '0 24px 80px -32px rgb(0 0 0 / 0.8)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(.96) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-700px 0' },
          '100%': { backgroundPosition: '700px 0' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--primary-rgb) / .45)' },
          '70%': { boxShadow: '0 0 0 14px rgb(var(--primary-rgb) / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(var(--primary-rgb) / 0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .7s cubic-bezier(.2,.7,.2,1) both',
        'fade-in': 'fade-in .35s ease both',
        'scale-in': 'scale-in .3s cubic-bezier(.2,.8,.2,1) both',
        'slide-in-right': 'slide-in-right .4s cubic-bezier(.2,.8,.2,1) both',
        'slide-in-up': 'slide-in-up .4s cubic-bezier(.2,.8,.2,1) both',
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 1.8s linear infinite',
        'pulse-ring': 'pulse-ring 2.2s ease-out infinite',
        marquee: 'marquee 28s linear infinite',
        'toast-in': 'toast-in .3s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
}
