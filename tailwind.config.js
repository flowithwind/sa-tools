/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'tech-green': '#00ff88',
        'tech-green-dark': '#00cc6a',
        'dark-bg': '#1a1a1a',
        'dark-secondary': '#2d2d2d',
      },
      fontFamily: {
        sans: ['Arial', 'Microsoft YaHei', 'sans-serif'],
        mono: ['Consolas', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
};
