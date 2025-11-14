import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Outlet, useParams } from "react-router-dom";
import { format } from "date-fns";
import { motion } from "framer-motion";
import Sidebar from "../components/Sidebar";
import CommandPalette from "../components/CommandPalette";
import Toaster from "../components/Toaster";
import { useAppData } from "../context/AppDataContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { celebrateConfetti } from "../utils/reward";
import { cloudConfigured, fetchTasksFromCloud, syncUpTasks } from "../cloud";
import type { Task } from "../types";
import { notifyDiscord, notifyTelegram } from "../utils/notify";

export type AppLayoutOutletContext = {
	globalQuery: string;
	setGlobalQuery: (value: string) => void;
	selectedDate: Date;
	setSelectedDate: (date: Date) => void;
	monthCursor: Date;
	setMonthCursor: (date: Date) => void;
	goToToday: () => void;
};

export default function AppLayout() {
	const {
		workspaces,
		pages,
		tasks,
		activeWorkspaceId,
		activePageId,
		setActiveWorkspace,
		setActivePage,
		createTask,
		updateTask,
		replaceTasks
	} = useAppData();

	const params = useParams<{ workspaceId?: string }>();

	useEffect(() => {
		if (params.workspaceId && params.workspaceId !== activeWorkspaceId) {
			setActiveWorkspace(params.workspaceId);
		}
	}, [activeWorkspaceId, params.workspaceId, setActiveWorkspace]);

	const [globalQuery, setGlobalQuery] = useState("");
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [monthCursor, setMonthCursor] = useState<Date>(new Date());
	const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
	const searchRef = useRef<HTMLInputElement | null>(null);
	const [theme, setTheme] = useLocalStorage<"system" | "light" | "dark">("app.theme", "system");
	const [isPaletteOpen, setIsPaletteOpen] = useState(false);

	const workspaceTasks = useMemo(
		() => tasks.filter(task => task.workspaceId === activeWorkspaceId),
		[tasks, activeWorkspaceId]
	);

	useEffect(() => {
		try {
			const isSystemDark =
				window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
			const shouldDark = theme === "dark" || (theme === "system" && isSystemDark);
			document.documentElement.classList.toggle("dark", shouldDark);
		} catch {
			// ignore theme errors
		}
	}, [theme]);

	const completionRate = useMemo(() => {
		const total = workspaceTasks.length || 1;
		const done = workspaceTasks.filter(t => t.status === "done").length;
		return Math.round((done / total) * 100);
	}, [workspaceTasks]);

	const xpLevel = useMemo(() => {
		const completed = workspaceTasks.filter(t => !!t.completedAt);
		const totalXp = completed.reduce((sum, task) => {
			let base = 10;
			const priority = task.priority ?? "medium";
			if (priority === "high") base += 10;
			else if (priority === "medium") base += 5;
			return sum + base;
		}, 0);
		const xpPerLevel = 200;
		return Math.max(1, Math.floor(totalXp / xpPerLevel) + 1);
	}, [workspaceTasks]);

	const periodLabel = useMemo(() => {
		try {
			return `${format(selectedDate, "MMMM yyyy")} / W${format(selectedDate, "w")}`;
		} catch {
			return "";
		}
	}, [selectedDate]);

	const goToToday = useCallback(() => {
		const now = new Date();
		setSelectedDate(now);
		setMonthCursor(now);
	}, []);

	const shareSummary = useCallback(async () => {
		const total = workspaceTasks.length;
		const done = workspaceTasks.filter(t => t.status === "done").length;
		const inProgress = workspaceTasks.filter(t => t.status === "in-progress").length;
		const todo = total - done - inProgress;
		const summary =
			`Todos — ${format(new Date(), "yyyy-MM-dd")}\n` +
			`Total: ${total}\n` +
			`Done: ${done}\n` +
			`In progress: ${inProgress}\n` +
			`Todo: ${todo}\n`;
		try {
			if (typeof navigator !== "undefined" && "share" in navigator) {
				await (navigator as any).share({ title: "Todo Summary", text: summary });
				return;
			}
			if ((navigator as any)?.clipboard?.writeText) {
				await (navigator as any).clipboard.writeText(summary);
				alert("Summary copied to clipboard.");
				return;
			}
			window.prompt("Copy summary:", summary);
		} catch {
			try {
				if ((navigator as any)?.clipboard?.writeText) {
					await (navigator as any).clipboard.writeText(summary);
					alert("Summary copied to clipboard.");
				} else {
					window.prompt("Copy summary:", summary);
				}
			} catch {
				window.prompt("Copy summary:", summary);
			}
		}
	}, [workspaceTasks]);

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			const target = e.target as HTMLElement | null;
			const isTyping =
				target &&
				(["INPUT", "TEXTAREA"].includes(target.tagName) || (target as any).isContentEditable);

			if (e.key === "/" && !isTyping) {
				e.preventDefault();
				searchRef.current?.focus();
			}
			if (e.key.toLowerCase() === "t" && !isTyping) {
				e.preventDefault();
				goToToday();
			}
			if (e.key.toLowerCase() === "s" && !isTyping) {
				e.preventDefault();
				shareSummary();
			}
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setIsPaletteOpen(prev => !prev);
			}
			if (e.key === "Escape") {
				if (document.activeElement === searchRef.current) {
					setGlobalQuery("");
					searchRef.current?.blur();
				}
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [goToToday, shareSummary]);

	const toggleTaskStatus = useCallback(
		async (taskId: string) => {
			const task = workspaceTasks.find(t => t.id === taskId);
			if (!task) return;
			const willBeDone = task.status !== "done";
			updateTask(taskId, { status: willBeDone ? "done" : "todo" });
			if (willBeDone) {
				await celebrateConfetti();
			}
		},
		[updateTask, workspaceTasks]
	);

	const addQuickTask = useCallback(
		(title: string) => {
			if (!activeWorkspaceId || !activePageId) return;
			createTask({
				title,
				workspaceId: activeWorkspaceId,
				pageId: activePageId,
				status: "todo",
				category: "other"
			});
		},
		[activePageId, activeWorkspaceId, createTask]
	);

	const handleImportHash = useCallback(() => {
		try {
			const hash = location.hash;
			if (hash.startsWith("#import=")) {
				const b64 = hash.slice("#import=".length + 1 - 1);
				const json = decodeURIComponent(escape(atob(b64)));
				const data = JSON.parse(json);
				if (Array.isArray(data?.tasks)) {
					if (
						window.confirm(
							`Import ${data.tasks.length} tasks into workspace? They will be assigned to the current page.`
						)
					) {
						data.tasks.forEach((incoming: Task) => {
							createTask({
								title: String(incoming.title ?? "Untitled task"),
								workspaceId: activeWorkspaceId,
								pageId: activePageId,
								status: (incoming.status as Task["status"]) ?? "todo",
								category: (incoming.category as Task["category"]) ?? "other",
								priority: incoming.priority,
								dueDate: incoming.dueDate,
								dueTime: incoming.dueTime,
								tags: incoming.tags
							});
						});
					}
				}
			}
		} catch {
			// ignore parse error
		} finally {
			if (location.hash.startsWith("#import=")) {
				history.replaceState(null, "", location.pathname + location.search);
			}
		}
	}, [activePageId, activeWorkspaceId, createTask]);

	useEffect(() => {
		handleImportHash();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const outletContext = useMemo<AppLayoutOutletContext>(
		() => ({
			globalQuery,
			setGlobalQuery,
			selectedDate,
			setSelectedDate,
			monthCursor,
			setMonthCursor,
			goToToday
		}),
		[globalQuery, selectedDate, monthCursor, goToToday]
	);

	const ringRadius = 14;
	const ringCircumference = 2 * Math.PI * ringRadius;
	const ringOffset = ringCircumference * (1 - Math.min(1, Math.max(0, completionRate / 100)));
	const SHOW_COMPLETION = false;

	return (
		<div className="h-full flex flex-col md:flex-row">
			<div className="hidden md:block">
				<Sidebar
					workspaces={workspaces}
					pages={pages}
					tasks={workspaceTasks}
					activeWorkspaceId={activeWorkspaceId}
					activePageId={activePageId}
					onSelectWorkspace={setActiveWorkspace}
					onSelectPage={setActivePage}
					onToggleTask={toggleTaskStatus}
					onAddTask={addQuickTask}
				/>
			</div>
			<main className="flex-1 min-w-0 overflow-auto">
				<div className="px-3 sm:px-5 lg:px-6 pt-4 sm:pt-6 pb-16 sm:pb-12 safe-bottom max-w-screen-2xl mx-auto">
					<header className="sticky top-0 z-10 -mx-3 sm:-mx-5 lg:-mx-6 mb-4 sm:mb-6 px-3 sm:px-5 lg:px-6 py-2 
						bg-gradient-to-b from-sand-50/80 to-sand-50/60 supports-[backdrop-filter]:from-sand-50/60 supports-[backdrop-filter]:to-sand-50/40 
						dark:from-ink-900/70 dark:to-ink-900/50 backdrop-blur-md backdrop-saturate-150 
						border-b border-white/30 dark:border-ink-700/60 shadow-md 
						rounded-b-2xl sm:rounded-b-none flex items-center justify-between">
						<div className="flex items-center gap-2">
							<button
								className="md:hidden icon-btn btn-ghost no-tap-highlight"
								onClick={() => setIsMobileNavOpen(true)}
								aria-label="Open menu"
								title="Open navigation"
						>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
									<path fillRule="evenodd" d="M3.75 5.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 6a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 6a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
								</svg>
							</button>
							<div>
								<div className="text-xl sm:text-2xl font-semibold tracking-tight text-primary">
									{periodLabel}
								</div>
								<div className="text-secondary text-sm sm:text-base flex items-center gap-2">
									<span className="inline-flex items-center gap-2 hidden">
										<span className="relative inline-grid place-items-center h-7 w-7">
											<svg viewBox="0 0 40 40" className="absolute inset-0 h-7 w-7">
												<circle
													cx="20"
													cy="20"
													r="14"
													stroke="currentColor"
													className="text-sand-200 dark:text-ink-700"
													strokeWidth="4"
													fill="none"
												/>
												<motion.circle
													cx="20"
													cy="20"
													r="14"
													stroke="currentColor"
													className="text-brand-600 dark:text-brand-400"
													strokeWidth="4"
													fill="none"
													strokeDasharray={ringCircumference}
													strokeLinecap="round"
													transform="rotate(-90 20 20)"
													initial={false}
													animate={{ strokeDashoffset: ringOffset }}
													transition={{ type: "spring", stiffness: 160, damping: 22 }}
												/>
											</svg>
											<span className="text-xs font-semibold tabular-nums text-ink-900 dark:text-ink-50">
												{completionRate}%
											</span>
										</span>
										<span>completed</span>
									</span>
									<span className="ml-3 inline-flex items-center gap-1 text-ink-700 dark:text-ink-200">
										<span className="text-xs px-1.5 py-0.5 rounded bg-sand-200 dark:bg-ink-700">
											Lv. {xpLevel}
										</span>
									</span>
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2 flex-wrap justify-end">
							<input
								ref={searchRef}
								value={globalQuery}
								onChange={e => setGlobalQuery(e.target.value)}
								placeholder="Search tasks… (press / to focus)"
								className="input hidden md:block md:w-64"
								aria-label="Global search"
							/>
							<button
								className="btn-outline"
								onClick={goToToday}
								title="Go to today (T)"
							>
								<span>Today</span>
								<span className="hidden md:inline kbd">T</span>
							</button>
							{cloudConfigured() && (
								<>
									<button
										className="btn bg-sand-100 text-ink-700 hover:bg-sand-200 dark:bg-ink-700 dark:text-ink-50 dark:hover:bg-ink-600"
										onClick={async () => {
											const res = await syncUpTasks(tasks);
											alert(res.ok ? "Synced to cloud." : `Sync failed: ${res.error}`);
										}}
									>
										Sync up
									</button>
									<button
										className="btn bg-sand-100 text-ink-700 hover:bg-sand-200 dark:bg-ink-700 dark:text-ink-50 dark:hover:bg-ink-600"
										onClick={async () => {
											const res = await fetchTasksFromCloud();
											if (res.ok && Array.isArray(res.tasks)) {
												if (
													window.confirm(
														`Replace your local tasks with ${res.tasks.length} from cloud?`
													)
												) {
													const normalized = (res.tasks as Task[]).map(task => ({
														...task,
														workspaceId: task.workspaceId ?? activeWorkspaceId,
														pageId: task.pageId ?? activePageId
													}));
													replaceTasks(normalized);
													alert("Replaced with cloud tasks.");
												}
											} else {
												alert(`Fetch failed: ${res.error}`);
											}
										}}
									>
										Sync down
									</button>
								</>
							)}
							<div className="relative">
								<select
									aria-label="Theme"
									className="input md:w-[140px]"
									value={theme}
									onChange={e => setTheme(e.target.value as any)}
									title="Theme"
								>
									<option value="system">System</option>
									<option value="light">Light</option>
									<option value="dark">Dark</option>
								</select>
							</div>
						</div>
					</header>
					<div className="md:hidden mb-3">
						<input
							ref={searchRef}
							value={globalQuery}
							onChange={e => setGlobalQuery(e.target.value)}
							placeholder="Search tasks…"
							className="input w-full"
							aria-label="Global search"
						/>
					</div>
					<Outlet context={outletContext} />
				</div>
			</main>

			{isMobileNavOpen && (
				<div className="fixed inset-0 z-50 md:hidden">
					<div
						className="absolute inset-0 bg-black/50 animate-fade-in"
						onClick={() => setIsMobileNavOpen(false)}
					/>
					<div className="absolute inset-y-0 left-0 w-[85%] max-w-xs animate-slide-in-left">
						<Sidebar
							workspaces={workspaces}
							pages={pages}
							tasks={workspaceTasks}
							activeWorkspaceId={activeWorkspaceId}
							activePageId={activePageId}
							onSelectWorkspace={workspaceId => {
								setActiveWorkspace(workspaceId);
							}}
							onSelectPage={pageId => {
								setActivePage(pageId);
							}}
							onToggleTask={toggleTaskStatus}
							onAddTask={addQuickTask}
							onCloseMobile={() => setIsMobileNavOpen(false)}
						/>
					</div>
					<button
						className="absolute top-3 right-3 btn bg-white text-ink-900 hover:bg-sand-100 dark:bg-ink-800 dark:text-ink-50 dark:hover:bg-ink-700"
						aria-label="Close menu"
						onClick={() => setIsMobileNavOpen(false)}
					>
						Close
					</button>
				</div>
			)}

			<CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
			<Toaster />
		</div>
	);
}
