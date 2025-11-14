import { Link } from "react-router-dom";

export default function NotFound() {
	return (
		<div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 px-4">
			<div className="space-y-2">
				<h1 className="text-3xl font-semibold tracking-tight text-primary">Page not found</h1>
				<p className="text-ink-600 dark:text-ink-300 max-w-md">
					The page you’re looking for doesn’t exist or has been moved.
				</p>
			</div>
			<div className="flex items-center gap-3">
				<Link to="/app" className="btn-primary">Go to app</Link>
				<Link to="/login" className="btn-outline">Sign in</Link>
			</div>
		</div>
	);
}

