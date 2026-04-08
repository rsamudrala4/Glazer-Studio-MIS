import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#F3F7FB",
        mist: "#0A0F14",
        sand: "#1B2633",
        pine: "#62E29B",
        amber: "#F5B861",
        rose: "#FF738A"
      },
      boxShadow: {
        soft: "0 24px 60px rgba(1, 6, 12, 0.52)",
        glow: "0 0 0 1px rgba(98,226,155,0.22), 0 0 24px rgba(98,226,155,0.18)"
      }
    }
  },
  plugins: []
};

export default config;
