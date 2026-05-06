/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        midnight: "#080A1E",
        ink: "#101225",
        electric: "#8B5CF6",
        cyanic: "#20E3B2",
        coral: "#FF7A59",
        magenta: "#EC4899",
        amberglow: "#F59E0B"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(32, 227, 178, 0.18)",
        violet: "0 24px 90px rgba(139, 92, 246, 0.24)"
      },
      backgroundImage: {
        "premium-dark":
          "radial-gradient(circle at top left, rgba(139,92,246,.26), transparent 28%), radial-gradient(circle at top right, rgba(32,227,178,.18), transparent 30%), linear-gradient(135deg, #080A1E 0%, #121530 44%, #0B1228 100%)",
        "premium-light":
          "radial-gradient(circle at top left, rgba(236,72,153,.18), transparent 28%), radial-gradient(circle at top right, rgba(14,165,233,.18), transparent 30%), linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 48%, #ECFEFF 100%)",
        "rainbow-edge":
          "linear-gradient(135deg, rgba(139,92,246,.95), rgba(6,182,212,.95), rgba(245,158,11,.95), rgba(236,72,153,.95))"
      }
    }
  },
  plugins: [
    function ({ addVariant }) {
      addVariant("light", ".light &");
    }
  ]
};
