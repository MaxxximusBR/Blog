
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}","./components/**/*.{js,ts,jsx,tsx}","./data/**/*.{js,ts,jsx,tsx,json}"],
  theme: {
    extend: {
      colors: { brand: { 500:'#818cf8', 600:'#6366f1' } },
      boxShadow: { glow: '0 0 0 1px rgba(99,102,241,.4), 0 0 40px rgba(99,102,241,.15)' }
    }
  },
  plugins: [],
};
