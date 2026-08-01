/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#11142B",
          900: "#1B1F3B",
          700: "#343A5C",
          500: "#5B6089",
        },
        indigo: {
          50: "#EEF1FB",
          100: "#DCE1F6",
          200: "#B4BEE8",
          300: "#8C9BDA",
          400: "#5C6BB8",
          500: "#2B3A67",
          600: "#232F55",
          700: "#1B2542",
          800: "#141B30",
          900: "#0D111F",
        },
        red: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        coral: {
          50: "#FFF1EC",
          400: "#FF8F6E",
          500: "#FF7A59",
          600: "#F0603F",
        },
        green: {
          50: "#ECFDF5",
          200: "#A7F3D0",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F6F7FB",
          sunk: "#EEF0F7",
        },
        line: "#E6E8F0",
      },
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(17, 20, 43, 0.04), 0 8px 24px -12px rgba(17, 20, 43, 0.12)",
        pop: "0 12px 32px -8px rgba(17, 20, 43, 0.28)",
        glow: "0 0 0 1px rgba(220,38,38,0.35), 0 8px 24px -8px rgba(220,38,38,0.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        rise: {
          "0%": { transform: "translateY(16px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        spinSlow: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        rise: "rise 0.5s cubic-bezier(0.22,1,0.36,1) both",
        floaty: "floaty 6s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite linear",
        spinSlow: "spinSlow 8s linear infinite",
      },
    },
  },
  plugins: [],
};
