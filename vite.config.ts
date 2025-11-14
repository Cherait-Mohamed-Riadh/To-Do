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
		port: 5173,
		headers: {
			"Content-Security-Policy": "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests; manifest-src 'self'; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' ws: wss: https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in; worker-src 'self' blob:; media-src 'self' blob:;",
			"Referrer-Policy": "strict-origin-when-cross-origin",
			"X-Content-Type-Options": "nosniff",
			"X-Frame-Options": "DENY",
			"Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()"
		}
	},
	preview: {
		headers: {
			"Content-Security-Policy": "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests; manifest-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' wss: https:; worker-src 'self' blob:; media-src 'self' blob:;",
			"Referrer-Policy": "strict-origin-when-cross-origin",
			"X-Content-Type-Options": "nosniff",
			"X-Frame-Options": "DENY",
			"Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
			"Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload"
		}
	}
});



