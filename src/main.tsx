import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);

// Register service worker only in production to avoid dev-time virtual import issues
if (import.meta.env.PROD) {
	// dynamically import a small module that references the virtual PWA registrar
	import("./pwa")
		.then(m => m.registerPWA?.())
		.catch(() => {
			/* ignore registration issues */
		});
}


