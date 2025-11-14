import { registerSW } from "virtual:pwa-register";

export function registerPWA() {
	try {
		registerSW({ immediate: true });
	} catch {
		// ignore registration issues
	}
}











