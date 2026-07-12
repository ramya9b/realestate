export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1A2B4A', light: '#2C4170', dark: '#0F1B2E' },
        gold: { DEFAULT: '#C9A84C', light: '#E8C97A', pale: '#FBF6EC' },
      },
      fontFamily: {
        display: ['DM Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
