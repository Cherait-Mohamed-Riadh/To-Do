import { format, isSameDay, parseISO } from "date-fns";
import { memo, useMemo, useRef, useState } from "react";
import { Task, TaskCategory, TaskPriority, TaskStatus } from "../types";
import { clsx } from "clsx";
import BoardView from "./BoardView";
import ProTableView from "./ProTableView";

type TodoListCreateInput = {
	title: string;
	status: TaskStatus;
	category: TaskCategory;
	priority?: TaskPriority;
	dueDate?: string;
	dueTime?: string;
	notes?: string;
	tags?: string[];
	orderIndex?: number;
	estimatedMinutes?: number;
};

type TodoListProps = {
	tasks: Task[];
	onCreate: (task: TodoListCreateInput) => void;
	onUpdate: (task: Task) => void;
	onRemove: (id: string) => void;
	selectedDate?: Date | null;
	globalQuery?: string;
};

const categoryOptions: { value: TaskCategory; label: string }[] = [
	{ value: "design", label: "Design" },
	{ value: "dev", label: "Development" },
	{ value: "meet", label: "Meet" },
	{ value: "personal", label: "Personal" },
	{ value: "other", label: "Other" }
];

function TodoList({ tasks, onCreate, onUpdate, onRemove, selectedDate, globalQuery }: TodoListProps) {
	const [view, setView] = useState<"list" | "board" | "table">("list");
	const [draftTitle, setDraftTitle] = useState("");
	const [draftDate, setDraftDate] = useState<string>("");
	const [draftTime, setDraftTime] = useState<string>("");
	const [draftCategory, setDraftCategory] = useState<TaskCategory>("dev");
	const [draftPriority, setDraftPriority] = useState<TaskPriority>("medium");
	const [draftTags, setDraftTags] = useState<string>("");

	const [query, setQuery] = useState<string>("");
	const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
	const [categoryFilter, setCategoryFilter] = useState<"all" | TaskCategory>("all");
	const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
	const [manualSort, setManualSort] = useState<boolean>(false);
	const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);

	const filtered = useMemo(() => {
		let base = tasks;
		if (selectedDate) {
			base = base.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), selectedDate));
		}
		if (statusFilter !== "all") {
			base = base.filter(t => t.status === statusFilter);
		}
		if (categoryFilter !== "all") {
			base = base.filter(t => t.category === categoryFilter);
		}
		if (priorityFilter !== "all") {
			base = base.filter(t => (t.priority ?? "medium") === priorityFilter);
		}
		const effectiveQuery = `${globalQuery ?? ""} ${query}`.trim();
		if (effectiveQuery) {
			const q = effectiveQuery.toLowerCase();
			base = base.filter(t => {
				const inTitle = t.title.toLowerCase().includes(q);
				const inTags = (t.tags ?? []).some(tag => tag.toLowerCase().includes(q));
				const inCategory = t.category.toLowerCase().includes(q);
				return inTitle || inTags || inCategory;
			});
		}
		return base;
	}, [tasks, selectedDate, statusFilter, categoryFilter, priorityFilter, query, globalQuery]);

	const sorted = useMemo(() => {
		const statusRank: Record<TaskStatus, number> = { "in-progress": 0, "todo": 1, "done": 2 };
		const priorityRank: Record<TaskPriority, number> = { "high": 0, "medium": 1, "low": 2 };
		const arr = [...filtered];
		if (manualSort) {
			return arr.sort((a, b) => {
				const ao = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
				const bo = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
				if (ao !== bo) return ao - bo;
				return a.title.localeCompare(b.title);
			});
		}
		return arr.sort((a, b) => {
			const r = statusRank[a.status] - statusRank[b.status];
			if (r !== 0) return r;
			// higher priority first (default to medium)
			const ap = priorityRank[a.priority ?? "medium"];
			const bp = priorityRank[b.priority ?? "medium"];
			if (ap !== bp) return ap - bp;
			// earlier dates first, undefined dates last
			if (a.dueDate && b.dueDate) {
				const da = parseISO(a.dueDate).getTime();
				const db = parseISO(b.dueDate).getTime();
				if (da !== db) return da - db;
			} else if (a.dueDate && !b.dueDate) return -1;
			else if (!a.dueDate && b.dueDate) return 1;
			// then by due time if present
			if (a.dueTime && b.dueTime && a.dueTime !== b.dueTime) return a.dueTime.localeCompare(b.dueTime);
			// finally by title
			return a.title.localeCompare(b.title);
		});
	}, [filtered, manualSort]);

	function addTask() {
		if (!draftTitle.trim()) return;
		const computedDate = draftDate || (selectedDate ? format(selectedDate, "yyyy-MM-dd") : "");
		const tagsArr = draftTags.split(",").map(t => t.trim()).filter(Boolean);
		onCreate({
			title: draftTitle.trim(),
			dueDate: computedDate || undefined,
			dueTime: draftTime || undefined,
			status: "todo",
			category: draftCategory,
			priority: draftPriority,
			tags: tagsArr.length ? tagsArr : undefined
		});
		setDraftTitle("");
		setDraftDate("");
		setDraftTime("");
		setDraftPriority("medium");
		setDraftTags("");
	}

	function toggleStatus(task: Task) {
		const next: TaskStatus = task.status === "done" ? "todo" : "done";
		onUpdate({ ...task, status: next });
	}

	function googleCalendarLink(t: Task) {
		const base = "https://calendar.google.com/calendar/render";
		const params = new URLSearchParams({ action: "TEMPLATE", text: t.title });
		if (t.dueDate) {
			const start = t.dueDate.replace(/-/g, "");
			params.set("dates", `${start}/${start}`);
		}
		params.set("details", `From Todo app • category: ${t.category}${t.priority ? " • priority: " + t.priority : ""}`);
		return `${base}?${params.toString()}`;
	}

	function handleReorder(fromIdx: number, toIdx: number) {
		if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
		const arr = [...sorted];
		const [moved] = arr.splice(fromIdx, 1);
		if (!moved) return;
		arr.splice(toIdx, 0, moved);
		// assign new indices in current view
		arr.forEach((t, i) => {
			if ((t.orderIndex ?? i) !== i) {
				onUpdate({ ...t, orderIndex: i });
			}
		});
	}

	return (
		<div className="card p-4 animate-fade-in">
			<div className="flex items-center justify-between mb-3">
				<h3 className="section-title">Tasks</h3>
				<div className="flex items-center gap-3">
					<div className="rounded-lg overflow-hidden border border-sand-200 dark:border-ink-600">
						<button className={`px-3 py-2 text-sm ${view === "list" ? "bg-brand-600 text-white" : "bg-white dark:bg-ink-700 text-ink-700 dark:text-ink-50"}`} onClick={() => setView("list")} aria-pressed={view === "list"}>List</button>
						<button className={`px-3 py-2 text-sm ${view === "board" ? "bg-brand-600 text-white" : "bg-white dark:bg-ink-700 text-ink-700 dark:text-ink-50"}`} onClick={() => setView("board")} aria-pressed={view === "board"}>Board</button>
						<button className={`px-3 py-2 text-sm ${view === "table" ? "bg-brand-600 text-white" : "bg-white dark:bg-ink-700 text-ink-700 dark:text-ink-50"}`} onClick={() => setView("table")} aria-pressed={view === "table"}>Table</button>
					</div>
					<label className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-300">
						<input type="checkbox" checked={manualSort} onChange={e => setManualSort(e.target.checked)} />
						Manual sort
					</label>
					<div className="text-sm text-ink-500 dark:text-ink-200 tabular-nums">{filtered.length} items</div>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap gap-2 mb-3">
				<input
					className="input flex-1 min-w-[220px]"
					placeholder="Search by title, tag, or category…"
					value={query}
					onChange={e => setQuery(e.target.value)}
					aria-label="Search tasks"
				/>
				<select className="input w-[150px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} aria-label="Filter status">
					<option value="all">All status</option>
					<option value="todo">Todo</option>
					<option value="in-progress">In progress</option>
					<option value="done">Done</option>
				</select>
				<select className="input w-[160px]" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as any)} aria-label="Filter category">
					<option value="all">All categories</option>
					{categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
				</select>
				<select className="input w-[150px]" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)} aria-label="Filter priority">
					<option value="all">All priorities</option>
					<option value="high">High</option>
					<option value="medium">Medium</option>
					<option value="low">Low</option>
				</select>
			</div>

			{view === "table" ? (
				<ProTableView tasks={filtered} onUpdate={onUpdate} onRemove={onRemove} />
			) : view === "board" ? (
				<div className="mt-2">
					<BoardView tasks={filtered} onUpdate={onUpdate} />
				</div>
			) : (
				<>
					<form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); addTask(); }}>
						<input
							className="input flex-[1_1_260px] min-w-[220px]"
							placeholder="Add a task..."
							value={draftTitle}
							onChange={e => setDraftTitle(e.target.value)}
							aria-label="Task title"
						/>
						<select className="input flex-[0_1_180px] w-[180px]" value={draftCategory} onChange={e => setDraftCategory(e.target.value as TaskCategory)} aria-label="Category">
							{categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
						<input className="input flex-[0_1_160px] w-[160px]" type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)} aria-label="Due date" />
						<input className="input flex-[0_1_120px] w-[120px]" type="time" value={draftTime} onChange={e => setDraftTime(e.target.value)} aria-label="Due time" />
						<select className="input flex-[0_1_140px] w-[140px]" value={draftPriority} onChange={e => setDraftPriority(e.target.value as TaskPriority)} aria-label="Priority">
							<option value="high">High</option>
							<option value="medium">Medium</option>
							<option value="low">Low</option>
						</select>
						<input
							className="input flex-[1_1_220px] min-w-[200px]"
							placeholder="tags (comma separated)"
							value={draftTags}
							onChange={e => setDraftTags(e.target.value)}
							aria-label="Tags"
						/>
						<button className="btn-primary flex-none" type="submit">Add</button>
					</form>

					<ul className="mt-4 divide-y divide-sand-200 dark:divide-ink-700">
						{sorted.map((t, idx) => (
							<li
								key={t.id}
								className="py-2 flex items-start gap-3 animate-scale-in"
								draggable={manualSort}
								onDragStart={() => setDragFromIdx(idx)}
								onDragOver={e => { if (manualSort) e.preventDefault(); }}
								onDrop={e => { e.preventDefault(); if (dragFromIdx !== null) { handleReorder(dragFromIdx, idx); setDragFromIdx(null); } }}
							>
								<input type="checkbox" className="mt-1 h-5 w-5" checked={t.status === "done"} onChange={() => toggleStatus(t)} />
								<div className="flex-1 min-w-0">
									<div className={clsx("font-medium", t.status === "done" && "line-through text-ink-300")}>{t.title}</div>
									<div className="text-xs text-ink-400 dark:text-ink-300 flex items-center gap-2 mt-0.5">
										<span className={clsx("badge", {
											"badge-blue": t.category === "dev",
											"badge-pink": t.category === "design",
											"badge-green": t.category === "meet"
										})}>
											{t.category}
										</span>
										{(t.priority ?? "medium") && (
											<span className={clsx("badge", {
												"badge-red": (t.priority ?? "medium") === "high",
												"badge-amber": (t.priority ?? "medium") === "medium",
												"badge-slate": (t.priority ?? "medium") === "low"
											})}>
											{t.priority ?? "medium"}
											</span>
										)}
										{t.dueDate && <span>{format(parseISO(t.dueDate), "EEE, MMM d")}{t.dueTime ? ` • ${t.dueTime}` : ""}</span>}
										{t.status !== "done" && <span className="text-emerald-600 dark:text-emerald-400">{t.status === "in-progress" ? "In progress" : "Todo"}</span>}
										{(t.tags ?? []).length > 0 && (
											<span className="flex items-center gap-1 flex-wrap">
												{(t.tags ?? []).map(tag => (
													<span key={tag} className="badge-slate">{tag}</span>
												))}
											</span>
										)}
								</div>
							</div>
							<div className="flex gap-2 flex-wrap">
								<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200 dark:bg-ink-700 dark:text-ink-50 dark:hover:bg-ink-600" onClick={() => onUpdate({ ...t, status: "in-progress" })}>Start</button>
								<button className="btn bg-ink-900 text-white hover:bg-ink-700" onClick={() => onUpdate({ ...t, status: "done" })}>Done</button>
								<button className="btn bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-400/20 dark:text-red-200 dark:hover:bg-red-400/30" onClick={() => onRemove(t.id)}>Delete</button>
								{t.dueDate && (
									<a className="btn bg-sand-100 text-ink-700 hover:bg-sand-200 dark:bg-ink-700 dark:text-ink-50 dark:hover:bg-ink-600" href={googleCalendarLink(t)} target="_blank" rel="noreferrer">
										Add to GCal
										</a>
									)}
							</div>
						</li>
						))}
						{filtered.length === 0 && <li className="py-8 text-center text-ink-400">No tasks yet for this selection.</li>}
					</ul>
				</>
			)}
		</div>
	);
}

export default memo(TodoList);
