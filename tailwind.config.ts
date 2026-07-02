import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ===== Care& Brand · Warm Care (Coral/Terracotta) =====
        brand: {
          50: "#FDF4F1",
          100: "#FAE3DB",
          200: "#F5C9BA",
          300: "#EDA48C",
          400: "#E27E5F",
          500: "#D5603E", // Primary
          600: "#B94C2E",
          700: "#973E27",
          800: "#763223",
          900: "#58271C",
          DEFAULT: "#D5603E",
        },
        // ===== Care& Neutral (Warm Gray) =====
        warm: {
          50: "#F7F6F4",
          100: "#EFEDEA",
          200: "#E2DFDA",
          300: "#CBC6BE",
          400: "#9C968C",
          500: "#6B655C",
          600: "#4E4941",
          700: "#35312B",
          800: "#211E1A",
          900: "#121010",
        },
        // ===== Semantic =====
        danger: {
          DEFAULT: "#EF4444",
          bg: "#FEF2F2",
        },
        warn: {
          DEFAULT: "#F59E0B",
          bg: "#FFFBEB",
        },
        info: {
          DEFAULT: "#3B82F6",
          bg: "#EFF6FF",
        },
        // ===== shadcn/ui 호환 =====
        background: "#F7F6F4",
        foreground: "#211E1A",
        primary: {
          DEFAULT: "#D5603E",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#EFEDEA",
          foreground: "#211E1A",
        },
        muted: {
          DEFAULT: "#EFEDEA",
          foreground: "#6B655C",
        },
        accent: {
          DEFAULT: "#FAE3DB",
          foreground: "#973E27",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        border: "#E2DFDA",
        input: "#E2DFDA",
        ring: "#D5603E",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#211E1A",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#211E1A",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "sans-serif",
        ],
        mono: ["Plus Jakarta Sans", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: ["11px", "16px"],
        sm: ["13px", "20px"],
        base: ["15px", "24px"],
        lg: ["17px", "26px"],
        xl: ["20px", "28px"],
        "2xl": ["24px", "32px"],
        "3xl": ["30px", "36px"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "28px",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(16,185,129,0.04)",
        card: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(16,185,129,0.06)",
        md: "0 4px 16px rgba(16,185,129,0.10)",
        lg: "0 12px 40px rgba(16,185,129,0.15)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
