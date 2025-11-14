import { Suspense, lazy, useCallback, useMemo, useRef, useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import PageEditor from "./components/PageEditor";
const CalendarMonth = lazy(() => import("./components/CalendarMonth"));
const WeeklySchedule = lazy(() => import("./components/WeeklySchedule"));
const TodoList = lazy(() => import("./components/TodoList"));
const PerformanceCharts = lazy(() => import("./components/PerformanceCharts"));
const Gamification = lazy(() => import("./components/Gamification"));
const Notes = lazy(() => import("./components/Notes"));
const TaskTypes = lazy(() => import("./components/TaskTypes"));
const TasksInProgress = lazy(() => import("./components/TasksInProgress"));
const PomodoroTimer = lazy(() => import("./components/PomodoroTimer"));
import { useLocalStorage } from "./hooks/useLocalStorage";
import { Note, Task, Page, PageBlock } from "./types";
import { format } from "date-fns";

function uid(prefix = "id") {
	return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
}

export default function App() {
	const [monthCursor, setMonthCursor] = useState<Date>(new Date());
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
	const [globalQuery, setGlobalQuery] = useState("");
	// Notion-like pages state
	const [pages, setPages] = useLocalStorage<Page[]>("app.pages", []);
	const [selectedPageId, setSelectedPageId] = useLocalStorage<string | null>("app.selectedPageId", null);

	const rootPages = useMemo(() => pages.filter(p => !p.parentId), [pages]);
	const pageMap = useMemo(() => new Map(pages.map(p => [p.id, p])), [pages]);
	const selectedPage = selectedPageId ? pageMap.get(selectedPageId) : null;
	const searchRef = useRef<HTMLInputElement | null>(null);

	const todayIso = format(new Date(), "yyyy-MM-dd");
	const [tasks, setTasks] = useLocalStorage<Task[]>("app.tasks", [
		{ id: uid("t"), title: "Design session", status: "in-progress", category: "design", priority: "high", dueDate: todayIso, dueTime: "10:20", createdAt: todayIso },
		{ id: uid("t"), title: "Blog post", status: "todo", category: "dev", priority: "medium", dueDate: todayIso, dueTime: "12:30", createdAt: todayIso },
		{ id: uid("t"), title: "Design onboarding", status: "todo", category: "design", priority: "low", dueDate: todayIso, dueTime: "13:20", createdAt: todayIso }
	]);
	const [notes, setNotes] = useLocalStorage<Note[]>("app.notes", []);

	// One-time migrations: ensure dates + priority backfill
	useEffect(() => {
		let changed = false;
		const todayIso = format(new Date(), "yyyy-MM-dd");
		setTasks(prev => {
			const updated = prev.map(t => {
				const createdAt = t.createdAt ?? (t.dueDate ?? todayIso);
				const completedAt = t.status === "done" ? (t.completedAt ?? createdAt) : t.completedAt;
				// Backfill missing priority (default medium)
				const priority = t.priority ?? "medium";
				if (createdAt !== t.createdAt || completedAt !== t.completedAt || priority !== t.priority) {
					changed = true;
					return { ...t, createdAt, completedAt, priority };
				}
				return t;
			});
			return changed ? updated : prev;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const completionRate = useMemo(() => {
		const total = tasks.length || 1;
		const done = tasks.filter(t => t.status === "done").length;
		return Math.round((done / total) * 100);
	}, [tasks]);

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
		const total = tasks.length;
		const done = tasks.filter(t => t.status === "done").length;
		const inProgress = tasks.filter(t => t.status === "in-progress").length;
		const todo = total - done - inProgress;
		const summary =
			`Todos — ${format(new Date(), "yyyy-MM-dd")}\n` +
			`Total: ${total}\n` +
			`Done: ${done}\n` +
			`In progress: ${inProgress}\n` +
			`Todo: ${todo}\n`;
		try {
			// Prefer native share when available
			if (typeof navigator !== "undefined" && "share" in navigator) {
				await (navigator as any).share({ title: "Todo Summary", text: summary });
				return;
			}
			if ((navigator as any)?.clipboard?.writeText) {
				await (navigator as any).clipboard.writeText(summary);
				alert("Summary copied to clipboard.");
				return;
			}
			// Fallback: prompt
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
	}, [tasks]);

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			// Ignore when typing in inputs except for Escape
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
			if (e.key === "Escape") {
				// clear search if focused
				if (document.activeElement === searchRef.current) {
					setGlobalQuery("");
					searchRef.current?.blur();
				}
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [goToToday, shareSummary]);

	const addQuickTask = useCallback((title: string) => {
		const task: Task = { id: uid("t"), title, status: "todo", category: "other", createdAt: format(new Date(), "yyyy-MM-dd") };
		setTasks(prev => [task, ...prev]);
	}, []);

	const createTask = useCallback((newTask: Omit<Task, "id" | "createdAt" | "completedAt">) => {
		const task: Task = { ...newTask, id: uid("t"), createdAt: format(new Date(), "yyyy-MM-dd") };
		setTasks(prev => [task, ...prev]);
	}, []);
	const updateTask = useCallback((updated: Task) => {
		setTasks(prev => prev.map(t => {
			if (t.id !== updated.id) return t;
			const nowIso = format(new Date(), "yyyy-MM-dd");
			// preserve createdAt; manage completedAt based on status transition
			const wasDone = t.status === "done";
			const willBeDone = updated.status === "done";
			let completedAt = t.completedAt;
			if (!wasDone && willBeDone) {
				completedAt = nowIso;
			} else if (wasDone && !willBeDone) {
				completedAt = undefined;
			}
			return { ...t, ...updated, createdAt: t.createdAt ?? nowIso, completedAt };
		}));
	}, []);
	const removeTask = useCallback((id: string) => {
		setTasks(prev => prev.filter(t => t.id !== id));
	}, []);
	const toggleTask = useCallback((id: string) => {
		setTasks(prev => prev.map(t => {
			if (t.id !== id) return t;
			const nowIso = format(new Date(), "yyyy-MM-dd");
			const willBeDone = t.status !== "done";
			return {
				...t,
				status: willBeDone ? "done" : "todo",
				completedAt: willBeDone ? nowIso : undefined,
				createdAt: t.createdAt ?? nowIso
			};
		}));
	}, []);
	const markDone = useCallback((id: string) => {
		setTasks(prev => prev.map(t => (t.id === id ? { ...t, status: "done", completedAt: format(new Date(), "yyyy-MM-dd"), createdAt: t.createdAt ?? format(new Date(), "yyyy-MM-dd") } : t)));
	}, []);


	const addNote = useCallback((n: Omit<Note, "id">) => {
		setNotes(prev => [{ ...n, id: uid("n") }, ...prev]);
	}, []);
	const updateNote = useCallback((note: Note) => {
		setNotes(prev => prev.map(n => (n.id === note.id ? note : n)));
	}, []);
	const removeNote = useCallback((id: string) => {
		setNotes(prev => prev.filter(n => n.id !== id));
	}, []);

	// --- Pages manipulation ---
	const createPage = useCallback((title: string, parentId?: string | null) => {
		const now = format(new Date(), "yyyy-MM-dd");
		const page: Page = { id: uid("pg"), title: title || "Untitled", parentId: parentId ?? null, blocks: [], createdAt: now };
		setPages(prev => [...prev, page]);
		setSelectedPageId(page.id);
	}, []);

	const updatePageTitle = useCallback((id: string, title: string) => {
		setPages(prev => prev.map(p => (p.id === id ? { ...p, title: title || "Untitled", updatedAt: format(new Date(), "yyyy-MM-dd") } : p)));
	}, []);

	const addBlockToPage = useCallback((pageId: string, block: { type: 'text'; text: string } | { type: 'heading'; text: string; level?: 1 | 2 | 3 | 4 } | { type: 'todo'; text: string; checked?: boolean } | { type: 'divider' }) => {
		setPages(prev => prev.map(p => {
			if (p.id !== pageId) return p;
			const newBlock: PageBlock = block.type === 'divider'
				? { id: uid('blk'), type: 'divider' }
				: block.type === 'heading'
					? { id: uid('blk'), type: 'heading', text: block.text, level: block.level }
					: block.type === 'todo'
						? { id: uid('blk'), type: 'todo', text: block.text, checked: block.checked }
						: { id: uid('blk'), type: 'text', text: block.text };
			return { ...p, blocks: [...p.blocks, newBlock], updatedAt: format(new Date(), 'yyyy-MM-dd') };
		}));
	}, []);

	const toggleTodoBlock = useCallback((pageId: string, blockId: string) => {
		setPages(prev => prev.map(p => {
			if (p.id !== pageId) return p;
			return { ...p, blocks: p.blocks.map(b => (b.id === blockId && b.type === "todo" ? { ...b, checked: !b.checked } : b)), updatedAt: format(new Date(), "yyyy-MM-dd") };
		}));
	}, []);

	const updateTextBlock = useCallback((pageId: string, blockId: string, text: string) => {
		setPages(prev => prev.map(p => {
			if (p.id !== pageId) return p;
			return { ...p, blocks: p.blocks.map(b => (b.id === blockId && (b.type === "text" || b.type === "heading" || b.type === "todo") ? { ...b, text } : b)), updatedAt: format(new Date(), "yyyy-MM-dd") };
		}));
	}, []);

	const removeBlock = useCallback((pageId: string, blockId: string) => {
		setPages(prev => prev.map(p => (p.id === pageId ? { ...p, blocks: p.blocks.filter(b => b.id !== blockId), updatedAt: format(new Date(), "yyyy-MM-dd") } : p)));
	}, []);

	const deletePage = useCallback((id: string) => {
		// Also delete descendants
		const toDelete = new Set<string>();
		function collect(pid: string) {
			toDelete.add(pid);
			pages.filter(p => p.parentId === pid).forEach(ch => collect(ch.id));
		}
		collect(id);
		setPages(prev => prev.filter(p => !toDelete.has(p.id)));
		if (selectedPageId && toDelete.has(selectedPageId)) setSelectedPageId(null);
	}, [pages, selectedPageId]);

	return (
		<div className="h-full flex flex-col md:flex-row">
			<div className="hidden md:block">
				<Sidebar tasks={tasks} onToggleTask={toggleTask} onAddTask={addQuickTask}
					pages={pages} onCreatePage={createPage} onSelectPage={setSelectedPageId} selectedPageId={selectedPageId} />
			</div>
			<main className="flex-1 min-w-0 overflow-auto">
				<div className="px-3 sm:px-5 lg:px-6 pt-4 sm:pt-6 pb-16 sm:pb-12 max-w-screen-2xl mx-auto">
					<header className="sticky top-0 z-10 -mx-3 sm:-mx-5 lg:-mx-6 mb-4 sm:mb-6 px-3 sm:px-5 lg:px-6 py-2 
						bg-gradient-to-b from-sand-50/80 to-sand-50/60 supports-[backdrop-filter]:from-sand-50/60 supports-[backdrop-filter]:to-sand-50/40 
						dark:from-ink-900/70 dark:to-ink-900/50 backdrop-blur-md backdrop-saturate-150 
						border-b border-white/30 dark:border-ink-700/60 shadow-md 
						rounded-b-2xl sm:rounded-b-none flex items-center justify-between">
						<div className="flex items-center gap-2">
							<button
								className="md:hidden btn bg-sand-100 text-ink-700 hover:bg-sand-200 dark:bg-ink-700 dark:text-ink-50 dark:hover:bg-ink-600"
								onClick={() => setIsMobileNavOpen(true)}
								aria-label="Open menu"
							>
								☰
							</button>
							{selectedPage ? (
								<div>
									<div className="text-xl sm:text-2xl font-semibold tracking-tight text-primary">{selectedPage.title || 'Untitled'}</div>
									<div className="text-secondary text-sm sm:text-base">Page</div>
								</div>
							) : (
								<div>
									<div className="text-xl sm:text-2xl font-semibold tracking-tight text-primary">{periodLabel}</div>
									<div className="text-secondary text-sm sm:text-base">
										Completion rate: <span className="tabular-nums font-semibold text-ink-900 dark:text-ink-50">{completionRate}%</span>
									</div>
								</div>
							)}
						</div>
						<div className="flex items-center gap-2 flex-wrap justify-end">
							{!selectedPage && (
								<>
									<input
										ref={searchRef}
										value={globalQuery}
										onChange={e => setGlobalQuery(e.target.value)}
										placeholder="Search tasks… (press / to focus)"
										className="input hidden md:block md:w-64"
										aria-label="Global search"
									/>
									<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200 dark:bg-ink-700 dark:text-ink-50 dark:hover:bg-ink-600" onClick={goToToday}>Today</button>
								</>
							)}
							{selectedPage && (
								<>
									<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200 dark:bg-ink-700 dark:text-ink-50 dark:hover:bg-ink-600" onClick={() => setSelectedPageId(null)}>Exit page</button>
									<button className="btn-primary" onClick={() => createPage('Untitled', selectedPage.id)}>New subpage</button>
								</>
							)}
						</div>
					</header>
					{/* Mobile search input */}
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

					{selectedPage ? (
						<PageEditor
							page={selectedPage}
							onAddBlock={addBlockToPage}
							onUpdateTitle={updatePageTitle}
							onToggleTodo={toggleTodoBlock}
							onUpdateText={updateTextBlock}
							onRemoveBlock={removeBlock}
						/>
					) : (
						<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-4 sm:mb-5">
							<div className="lg:col-span-2" key={format(monthCursor, "yyyy-MM")}>
								<Suspense fallback={<div className="card p-6">Loading calendar…</div>}>
									<CalendarMonth
										monthDate={monthCursor}
										onChangeMonth={setMonthCursor}
										selectedDate={selectedDate}
										onSelectDate={setSelectedDate}
										tasks={tasks}
									/>
								</Suspense>
							</div>
							<div className="lg:col-span-1">
								<Suspense fallback={<div className="card p-6">Loading…</div>}>
									<TaskTypes tasks={tasks} />
								</Suspense>
							</div>
						</div>
					)}

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-4 sm:mb-5">
						<div className="lg:col-span-2" key={format(selectedDate, "yyyy-'W'w")}>
							<Suspense fallback={<div className="card p-6">Loading schedule…</div>}>
								<WeeklySchedule anchorDate={selectedDate} tasks={tasks} />
							</Suspense>
						</div>
						<div className="lg:col-span-1">
							<Suspense fallback={<div className="card p-6">Loading notes…</div>}>
								<Notes notes={notes} onAdd={addNote} onRemove={removeNote} onUpdate={updateNote} />
							</Suspense>
						</div>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-4 sm:mb-5">
						<div className="lg:col-span-2" key={format(selectedDate, "yyyy-MM-dd")}>
							<Suspense fallback={<div className="card p-6">Loading tasks…</div>}>
								<TodoList
									tasks={tasks}
									onCreate={createTask}
									onUpdate={updateTask}
									onRemove={removeTask}
									selectedDate={selectedDate}
									globalQuery={globalQuery}
								/>
							</Suspense>
						</div>
					</div>

					<div className="grid gap-5">
						<Suspense fallback={<div className="card p-6">Loading pomodoro…</div>}>
							<PomodoroTimer tasks={tasks} />
						</Suspense>
						<Suspense fallback={<div className="card p-6">Loading levels…</div>}>
							<Gamification tasks={tasks} anchorDate={selectedDate} />
						</Suspense>
						<Suspense fallback={<div className="card p-6">Loading…</div>}>
							<TasksInProgress tasks={tasks} onMarkDone={markDone} />
						</Suspense>
						<Suspense fallback={<div className="card p-6">Loading charts…</div>}>
							<PerformanceCharts tasks={tasks} anchorDate={selectedDate} />
						</Suspense>
					</div>
				</div>
			</main>

			{isMobileNavOpen && (
				<div className="fixed inset-0 z-50 md:hidden">
					<div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setIsMobileNavOpen(false)} />
					<div className="absolute inset-y-0 left-0 w-[85%] max-w-xs animate-slide-in-left">
						<Sidebar tasks={tasks} onToggleTask={toggleTask} onAddTask={addQuickTask}
							pages={pages} onCreatePage={createPage} onSelectPage={setSelectedPageId} selectedPageId={selectedPageId} />
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
		</div>
	);
}


