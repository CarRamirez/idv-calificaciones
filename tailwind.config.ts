import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef3fb",
          100: "#d9e4f5",
          200: "#b3c9eb",
          300: "#8aabde",
          400: "#5e8bcf",
          500: "#3868b8",
          600: "#1d4e9e",
          700: "#163d7e",
          800: "#112f61",
          900: "#0c2247",
        },
        accent: {
          50: "#fdf8ee",
          100: "#f9eed4",
          200: "#f2daa5",
          300: "#e9c36e",
          400: "#e0ad3e",
          500: "#c99521",
          600: "#a87a18",
          700: "#876013",
          800: "#6e4d12",
          900: "#5a3f12",
        },
      },
    },
  },
  plugins: [],
};
export default config;
