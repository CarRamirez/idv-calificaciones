import type { Config } from "tailwindcss";

// primary cambia con el "skin" (variables CSS en globals.css)
const p = (n: number) => `rgb(var(--p-${n}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        primary: { 50: p(50), 100: p(100), 200: p(200), 300: p(300), 400: p(400), 500: p(500), 600: p(600), 700: p(700), 800: p(800), 900: p(900) },
        accent: { 50: "#fff7ed", 100: "#ffedd5", 400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c" },
        coral: { 50: "#fff1f0", 100: "#ffe4e1", 400: "#fb7185", 500: "#f43f5e" },
        mint: { 50: "#eefbf4", 100: "#d1fae5", 400: "#34d399", 500: "#10b981" },
        violet: { 100: "#ede9fe", 400: "#a78bfa", 500: "#8b5cf6" },
        sky: { 100: "#e0f2fe", 400: "#38bdf8", 500: "#0ea5e9" },
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgb(15 23 42 / 0.08), 0 1px 2px rgb(15 23 42 / 0.04)",
        card: "0 1px 2px rgb(15 23 42 / 0.05), 0 2px 8px -4px rgb(15 23 42 / 0.06)",
        float: "0 12px 32px -8px rgb(15 23 42 / 0.25)",
        glow: "0 0 0 3px rgb(var(--p-500) / 0.25)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-back": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "in-out-quart": "cubic-bezier(0.76, 0, 0.24, 1)",
        suave: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        "slide-down": { from: { opacity: "0", transform: "translateY(-8px)" }, to: { opacity: "1", transform: "none" } },
        "scale-in": { from: { opacity: "0", transform: "scale(.96)" }, to: { opacity: "1", transform: "none" } },
        "bounce-soft": { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-3px)" } },
        shimmer: { from: { backgroundPosition: "-400px 0" }, to: { backgroundPosition: "400px 0" } },
      },
      animation: {
        "fade-in": "fade-in .25s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-up": "slide-up .35s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slide-down .3s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in .28s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "bounce-soft": "bounce-soft 1.6s ease-in-out infinite",
        shimmer: "shimmer 1.4s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
