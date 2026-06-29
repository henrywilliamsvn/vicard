/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#FF7A1A", dark: "#E2640A", light: "#FFEAD5" },
      },
    },
  },
  plugins: [],
};
