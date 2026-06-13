/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "odoo-purple": "#714B67",
        "odoo-teal": "#017E84",
        "primary": "#57344f",
        "primary-container": "#714b67",
        "secondary": "#00696e",
        "surface": "#f8f9fa",
        "background-color": "#f8f9fa",
        "status-success": "#81C784",
        "status-warning": "#FFD54F",
        "status-error": "#F06292",
        "surface-card": "#FFFFFF",
        "surface-border": "#E9ECEF",
        "surface-container-low": "#f3f4f5",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#e7e8e9",
        "on-surface-variant": "#4e444a",
        "outline-variant": "#d1c3ca",
        "outline": "#80747a",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
