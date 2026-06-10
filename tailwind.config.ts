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
        // ===== Care& Brand · Sage Green =====
        brand: {
          50: "#F4F8F5",
          100: "#E3EFE5",
          200: "#C5DECA",
          300: "#93C09D",
          400: "#5C9D6C",
          500: "#3F7D52", // Primary
          600: "#2F6240",
          700: "#284E35",
          800: "#1F3D2A",
          900: "#142A1D",
          DEFAULT: "#3F7D52",
        },
        // ===== Care& Warm Neutral =====
        warm: {
          50: "#FBF9F4", // App background
          100: "#F4EFE6",
          200: "#E8E0D2",
          300: "#C9BFAE",
          400: "#9A917F",
          500: "#6E6757",
          600: "#524C3F",
          700: "#3A352B", // Body text
          800: "#25221B",
          900: "#14110D",
        },
        // ===== Semantic =====
        danger: {
          DEFAULT: "#C25450",
          bg: "#FBEEED",
        },
        warn: {
          DEFAULT: "#C68A2E",
          bg: "#FBF3E4",
        },
        info: {
          DEFAULT: "#3D7AB3",
          bg: "#EBF1F8",
        },
        // ===== shadcn/ui 호환 =====
        background: "#FBF9F4",
        foreground: "#3A352B",
        primary: {
          DEFAULT: "#3F7D52",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F4EFE6",
          foreground: "#25221B",
        },
        muted: {
          DEFAULT: "#F4EFE6",
          foreground: "#6E6757",
        },
        accent: {
          DEFAULT: "#E3EFE5",
          foreground: "#284E35",
        },
        destructive: {
          DEFAULT: "#C25450",
          foreground: "#FFFFFF",
        },
        border: "#E8E0D2",
        input: "#E8E0D2",
        ring: "#3F7D52",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#3A352B",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#3A352B",
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
        sm: "0 1px 2px rgba(58, 53, 43, 0.06)",
        card: "0 2px 8px rgba(58, 53, 43, 0.06), 0 1px 2px rgba(58, 53, 43, 0.04)",
        md: "0 4px 12px rgba(58, 53, 43, 0.08)",
        lg: "0 12px 32px rgba(58, 53, 43, 0.12)",
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
