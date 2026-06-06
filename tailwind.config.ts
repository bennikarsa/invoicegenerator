import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        paper: "#f8fafc",
        brand: "#0f766e",
        accent: "#b45309"
      }
    }
  },
  plugins: []
};

export default config;
