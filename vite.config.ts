import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	build: {
		target: "es2020"
	},
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.svg"],
			manifest: {
				name: "Todos",
				short_name: "Todos",
				description: "Todo list with focus timer, gamification and analytics",
				theme_color: "#111114",
				background_color: "#f5f4f0",
				display: "standalone",
				icons: [
					{ src: "/favicon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
					{ src: "/favicon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" }
				]
			},
			workbox: {
				navigateFallbackDenylist: [/^\/api\//]
			}
		})
	],
	server: {
		port: 5173
	}
});



