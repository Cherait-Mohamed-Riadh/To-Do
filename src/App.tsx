import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppDataProvider } from "./context/AppDataContext";

// Lazy-loaded route components for better code-splitting and faster initial loads
const AppLayout = lazy(() => import("./layouts/AppLayout"));
const LoginPage = lazy(() => import("./routes/LoginPage"));
const WorkspaceRedirect = lazy(() => import("./routes/WorkspaceRedirect"));
const WorkspacePageRedirect = lazy(() => import("./routes/WorkspacePageRedirect"));
const PageViewRoute = lazy(() => import("./routes/PageViewRoute"));
const NotFound = lazy(() => import("./routes/NotFound"));

// A simple, centered loader for Suspense fallbacks
function AppLoader() {
	return (
		<div style={{
			display: "grid",
			placeItems: "center",
			height: "100dvh",
			background: "#0b0f17",
			color: "#c7d2fe",
			fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, \"Apple Color Emoji\", \"Segoe UI Emoji\"",
		}}>
			<div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 12}}>
				<div style={{
					width: 40,
					height: 40,
					borderRadius: "50%",
					border: "3px solid #1f2937",
					borderTopColor: "#6366f1",
					animation: "spin 1s linear infinite",
				}} />
				<div style={{opacity: 0.85, fontSize: 14}}>يجري التحميل...</div>
			</div>
			<style>
				{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
			</style>
		</div>
	);
}

// Basic error boundary to keep the app resilient
class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}
	static getDerivedStateFromError() {
		return { hasError: true };
	}
	componentDidCatch(error: unknown) {
		// TODO: hook into your logging/monitoring service here
		console.error("App crashed:", error);
	}
	render() {
		if (this.state.hasError) {
			return (
				<div style={{
					display: "grid",
					placeItems: "center",
					height: "100dvh",
					padding: 24,
					textAlign: "center",
					background: "#0b0f17",
					color: "#e5e7eb",
				}}>
					<div>
						<h1 style={{ margin: 0, fontSize: 20 }}>حدث خطأ غير متوقع</h1>
						<p style={{ opacity: 0.8, marginTop: 8 }}>يرجى تحديث الصفحة أو المحاولة لاحقاً.</p>
					</div>
				</div>
			);
		}
		return this.props.children as React.ReactElement;
	}
}

export default function App() {
	return (
		<BrowserRouter>
			<AppDataProvider>
				<AppErrorBoundary>
					<Suspense fallback={<AppLoader />}>
						<Routes>
							<Route path="/" element={<Navigate to="/app" replace />} />
							<Route path="/login" element={<LoginPage />} />
							<Route path="/app" element={<WorkspaceRedirect />} />
							<Route path="/app/:workspaceId" element={<AppLayout />}>
								<Route index element={<WorkspacePageRedirect />} />
								<Route path=":pageId" element={<PageViewRoute />} />
							</Route>
							<Route path="*" element={<NotFound />} />
						</Routes>
					</Suspense>
				</AppErrorBoundary>
			</AppDataProvider>
		</BrowserRouter>
	);
}
