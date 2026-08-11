import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Superfici
        avorio: "#F6F1E7", // fondo pagina
        card: "#FDFBF6", // card
        panel: "#EFE8D9", // pannelli metric
        bordo: "#DDD5C4", // bordi
        // Testo
        inchiostro: "#2C2420", // primario
        taupe: "#8A7E6D", // secondario
        "taupe-chiaro": "#B5A992", // taupe chiaro
        // Istituzionale
        bordeaux: "#5C1A28",
        // Severita
        critico: "#8E2A3C",
        warning: "#B67B2E",
        ok: "#4A6B4F",
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-jost)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        label: "1.5px",
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
      },
      maxWidth: {
        console: "1100px",
      },
    },
  },
  plugins: [],
};

export default config;
