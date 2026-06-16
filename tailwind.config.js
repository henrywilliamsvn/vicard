/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0E7C5A", dark: "#0A5E44", light: "#E6F4EF" },
      },
    },
  },
  plugins: [],
};
