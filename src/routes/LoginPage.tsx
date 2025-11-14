import { Link } from "react-router-dom";

export default function LoginPage() {
	return (
		<div className="min-h-screen grid place-items-center bg-sand-100 dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-4">
			<div className="max-w-md w-full bg-white/90 dark:bg-ink-800/80 rounded-xl shadow-xl p-8 space-y-6">
				<div className="text-center space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
					<p className="text-sm text-ink-600 dark:text-ink-300">
						Authentication is coming soon. You can continue to explore the app without signing in.
					</p>
				</div>
				<form className="space-y-4" aria-label="Sign in form">
					<label className="block">
						<span className="text-sm font-medium text-ink-600 dark:text-ink-200">Email</span>
						<input
							type="email"
							placeholder="you@example.com"
							className="input mt-1 w-full"
							disabled
							aria-disabled="true"
						/>
					</label>
					<label className="block">
						<span className="text-sm font-medium text-ink-600 dark:text-ink-200">Password</span>
						<input type="password" placeholder="••••••••" className="input mt-1 w-full" disabled aria-disabled="true" />
					</label>
					<button type="button" className="btn-primary w-full" disabled aria-disabled="true" title="Authentication coming soon">
						Continue
					</button>
				</form>
				<div className="flex items-center justify-center gap-3">
					<Link to="/app" className="btn-outline">Go to app</Link>
					<Link to="/" className="link">Back to home</Link>
				</div>
			</div>
		</div>
	);
}

