import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#141E3C",
          900: "#141E3C",
          800: "#172241",
          700: "#1B2A4A",
          600: "#2A3A6B",
        },
        ivory: {
          DEFAULT: "#F7F5F0",
          100: "#FBFAF6",
          200: "#F2EFE8",
          300: "#E4DFD3",
        },
        gold: {
          DEFAULT: "#C9A86A",
          light: "#E3D2AE",
          400: "#D8BE8C",
          600: "#A8854A",
        },
        slate: {
          ink: "#3C4456",
          muted: "#707A8A",
        },
        emerald: { DEFAULT: "#5E806B", soft: "#EAF0EB" },
        amber: { DEFAULT: "#A8854A", soft: "#F4EFE4" },
        terra: { DEFAULT: "#C8895E", dark: "#9F5E3A", soft: "#F7EAE1" },
        ruby: { DEFAULT: "#9F5E3A", soft: "#F7EAE1" },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Spectral", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Archivo", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,30,60,0.04), 0 8px 24px rgba(20,30,60,0.06)",
        lift: "0 8px 30px rgba(20,30,60,0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
