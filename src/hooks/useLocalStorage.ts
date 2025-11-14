import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
	const [value, setValue] = useState<T>(() => {
		try {
			const raw = localStorage.getItem(key);
			return raw ? (JSON.parse(raw) as T) : initialValue;
		} catch {
			return initialValue;
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// ignore storage errors
		}
	}, [key, value]);

	// Cross-tab synchronization
	useEffect(() => {
		function onStorage(e: StorageEvent) {
			if (e.storageArea !== localStorage) return;
			if (e.key !== key) return;
			try {
				if (typeof e.newValue === "string") {
					const next = JSON.parse(e.newValue) as T;
					setValue(next);
				}
			} catch {
				// ignore parse errors
			}
		}
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, [key]);

	return [value, setValue] as const;
}


