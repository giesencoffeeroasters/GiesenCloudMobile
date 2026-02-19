/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        slate: "#383838",
        "slate-light": "#4a4a4a",
        gravel: "#d9d9d4",
        "gravel-light": "#eeeee9",
        safety: "#ccff00",
        sky: "#4d92b8",
        "sky-dark": "#3a7a9e",
        leaf: "#71b068",
        sun: "#f5c462",
        boven: "#fc8758",
        traffic: "#db5a5a",
        grape: "#7e6599",
        bg: "#f7f7f5",
        card: "#ffffff",
        border: "#e8e8e3",
        "text-primary": "#2a2a2a",
        "text-secondary": "#7a7a76",
        "text-tertiary": "#a5a5a0",
      },
      fontFamily: {
        sans: ["DM Sans"],
        mono: ["JetBrains Mono"],
      },
      borderRadius: {
        card: "8px",
        sm: "5px",
      },
    },
  },
  plugins: [],
};
