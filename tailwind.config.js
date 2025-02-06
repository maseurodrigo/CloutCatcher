/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        "trail": {
          "0%": { "--angle": "0deg" },
          "100%": { "--angle": "360deg" },
        }
      },
      animation: {
        "trail": "trail var(--duration) linear infinite"
      }
    }
  },
  plugins: [import("tailwindcss-animate")]
};