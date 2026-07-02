import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx,html}", "./*.html"],
  theme: {
    extend: {
      colors: {
        tapclosed: {
          bg: "rgba(255, 255, 255, 0.03)",
          surface: "rgba(255, 255, 255, 0.06)",
          border: "rgba(255, 255, 255, 0.08)",
          text: "rgba(255, 255, 255, 0.9)",
          muted: "rgba(255, 255, 255, 0.5)",
          accent: "rgba(150, 180, 255, 0.8)",
          warm: "rgba(255, 200, 170, 0.6)",
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        breathe: "breathe 4s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "fade-out": "fadeOut 0.3s ease-out",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeOut: {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(8px)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
