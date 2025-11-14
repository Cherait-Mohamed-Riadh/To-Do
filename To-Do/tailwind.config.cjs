/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: "class",
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				brand: {
					50: "#eef2ff",
					100: "#e0e7ff",
					200: "#c7d2fe",
					300: "#a5b4fc",
					400: "#818cf8",
					500: "#6366f1",
					600: "#4f46e5",
					700: "#4338ca",
					800: "#3730a3",
					900: "#312e81"
				},
				sand: {
					50: "#fbf7f3",
					100: "#f5efe6",
					200: "#e9decc",
					300: "#ddcdb3",
					400: "#d1bc9a",
					500: "#c5ab81",
					600: "#a68e67",
					700: "#87714f",
					800: "#69563b",
					900: "#4c3d29"
				},
				ink: {
					900: "#0b0b0c",
					800: "#151517",
					700: "#1f2023",
					600: "#2b2c31",
					500: "#3a3b41",
					400: "#4b4d57",
					300: "#6b6e7a",
					200: "#9aa0ae",
					100: "#c9cfdb",
					50: "#eef1f7"
				},
				/* Semantic aliases for consistent usage */
				primary: {
					DEFAULT: "#6C63FF",
					foreground: "#ffffff"
				},
				success: {
					DEFAULT: "#10b981"
				},
				warning: {
					DEFAULT: "#f59e0b"
				},
				danger: {
					DEFAULT: "#ef4444"
				},
				info: {
					DEFAULT: "#3b82f6"
				}
			},
			boxShadow: {
				card: "0 10px 30px rgba(20, 20, 20, 0.08)"
			},
			fontFamily: {
				sans: ["Tajawal", "Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"]
			}
		}
	},
	plugins: []
};



