/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"DM Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        surface: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#eeeeee",
          300: "#e0e0e0",
        },
        risk: {
          critical: "#dc2626",
          "critical-bg": "#fef2f2",
          high: "#d97706",
          "high-bg": "#fffbeb",
          medium: "#2563eb",
          "medium-bg": "#eff6ff",
          low: "#16a34a",
          "low-bg": "#f0fdf4",
        },
      },
      keyframes: {
        "slide-in": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "slide-in": "slide-in 0.25s ease-out",
        "fade-up": "fade-up 0.35s ease-out both",
        "fade-in": "fade-in 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};
