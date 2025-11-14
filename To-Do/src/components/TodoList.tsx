import { format, isSameDay, parseISO } from "date-fns";
import { memo, useMemo, useState } from "react";
import { Task, TaskCategory, TaskPriority, TaskStatus } from "../types";
import { clsx } from "clsx";

type TodoListProps = {
	tasks: Task[];
	onCreate: (task: Omit<Task, "id" | "createdAt" | "completedAt">) => void;
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
	const [draftTitle, setDraftTitle] = useState("");
	const [draftDate, setDraftDate] = useState<string>("");
	const [draftTime, setDraftTime] = useState<string>("");
	const [draftCategory, setDraftCategory] = useState<TaskCategory>("dev");
	const [draftPriority, setDraftPriority] = useState<TaskPriority>("medium");
	const [draftTags, setDraftTags] = useState<string>("");

	// Inline editing state
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editCategory, setEditCategory] = useState<TaskCategory>("dev");
	const [editDate, setEditDate] = useState<string>("");
	const [editTime, setEditTime] = useState<string>("");
	const [editPriority, setEditPriority] = useState<TaskPriority>("medium");
	const [editTags, setEditTags] = useState<string>("");

	const [query, setQuery] = useState<string>("");
	const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
	const [categoryFilter, setCategoryFilter] = useState<"all" | TaskCategory>("all");
	const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
	const [groupByPriority, setGroupByPriority] = useState<boolean>(false);
	const [dense, setDense] = useState<boolean>(false);

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
		return [...filtered].sort((a, b) => {
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
	}, [filtered]);

	const grouped = useMemo(() => {
		if (!groupByPriority) return { all: sorted } as any;
		const buckets: Record<TaskPriority, Task[]> = { high: [], medium: [], low: [] };
		sorted.forEach(t => buckets[(t.priority ?? "medium")]?.push(t));
		return buckets;
	}, [sorted, groupByPriority]);

	function addTask() {
		if (!draftTitle.trim()) return;
		const computedDate = draftDate || (selectedDate ? format(selectedDate, "yyyy-MM-dd") : "");
		onCreate({
			title: draftTitle.trim(),
			dueDate: computedDate || undefined,
			dueTime: draftTime || undefined,
			status: "todo",
			category: draftCategory,
			priority: draftPriority,
			tags: draftTags
				.split(",")
				.map(s => s.trim())
				.filter(Boolean)
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

	function renderRow(t: Task) {
		const isOverdue = t.dueDate ? parseISO(t.dueDate).getTime() < new Date().setHours(0,0,0,0) && t.status !== "done" : false;
		const liPad = dense ? "py-1.5" : "py-2.5";
		return (
			<li key={t.id} className={clsx("group relative flex items-start gap-3 px-3", liPad, "animate-scale-in bg-white")}> 
				<div className={clsx("absolute left-0 top-0 bottom-0 w-1 rounded-r-md", priorityAccent(t.priority))} aria-hidden />
				<input type="checkbox" className="mt-1 h-5 w-5" checked={t.status === "done"} onChange={() => toggleStatus(t)} aria-label="Toggle done" />
				<div className="flex-1 min-w-0">
					{editingId === t.id ? (
						<div className="grid md:grid-cols-[1fr_auto_auto_auto_auto] gap-2">
							<input className="input" value={editTitle} onChange={e => setEditTitle(e.target.value)} aria-label="Edit title" />
							<select className="input md:w-[150px]" value={editCategory} onChange={e => setEditCategory(e.target.value as TaskCategory)} aria-label="Edit category">
								{categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
							<input className="input md:w-36" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} aria-label="Edit due date" />
							<input className="input md:w-28" type="time" value={editTime} onChange={e => setEditTime(e.target.value)} aria-label="Edit due time" />
							<select className="input md:w-[120px]" value={editPriority} onChange={e => setEditPriority(e.target.value as TaskPriority)} aria-label="Edit priority">
								<option value="high">High</option>
								<option value="medium">Medium</option>
								<option value="low">Low</option>
							</select>
							<input className="input" placeholder="Tags (comma)" value={editTags} onChange={e => setEditTags(e.target.value)} aria-label="Edit tags" />
							<div className="flex gap-2 mt-2 md:col-span-5">
								<button
									className="btn-primary"
									onClick={() => {
										const nextTags = editTags.split(",").map(s => s.trim()).filter(Boolean);
										onUpdate({
											...t,
											title: editTitle.trim() || t.title,
											category: editCategory,
											dueDate: editDate || undefined,
											dueTime: editTime || undefined,
											priority: editPriority,
											tags: nextTags
										});
										setEditingId(null);
									}}
							>
								Save
							</button>
							<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200" onClick={() => setEditingId(null)}>Cancel</button>
						</div>
					</div>
					) : (
						<>
							<div className={clsx("font-medium", dense && "text-[15px]", t.status === "done" && "line-through text-ink-300")}>{t.title}</div>
							<div className="text-[11px] leading-relaxed text-ink-500 flex items-center gap-2 flex-wrap mt-0.5">
								<span className={clsx("badge", {
									"badge-blue": t.category === "dev",
									"badge-pink": t.category === "design",
									"badge-green": t.category === "meet"
								})}>{t.category}</span>
								{(t.priority ?? "medium") && (
									<span className={clsx("badge", {
										"badge-red": (t.priority ?? "medium") === "high",
										"badge-amber": (t.priority ?? "medium") === "medium",
										"badge-slate": (t.priority ?? "medium") === "low"
									})}>{t.priority ?? "medium"}</span>
								)}
								{t.dueDate && (
									<span className={clsx(isOverdue && "text-red-600 font-medium")}>{format(parseISO(t.dueDate), "EEE, MMM d")} {t.dueTime ? `• ${t.dueTime}` : ""}</span>
								)}
								{t.status !== "done" && <span className="text-emerald-600">{t.status === "in-progress" ? "In progress" : "Todo"}</span>}
								{(t.tags ?? []).length > 0 && (
									<span className="flex items-center gap-1 flex-wrap">
										{(t.tags ?? []).map(tag => (
											<span key={tag} className="badge-slate">{tag}</span>
										))}
									</span>
								)}
							</div>
						</>
					)}
				</div>
				<div className="flex gap-2 flex-wrap opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
					{editingId === t.id ? null : (
						<button
							className="btn bg-sand-100 text-ink-700 hover:bg-sand-200"
							onClick={() => {
								setEditingId(t.id);
								setEditTitle(t.title);
								setEditCategory(t.category);
								setEditDate(t.dueDate ?? "");
								setEditTime(t.dueTime ?? "");
								setEditPriority(t.priority ?? "medium");
								setEditTags((t.tags ?? []).join(", "));
							}}
						>
							Edit
						</button>
					)}
					<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200" onClick={() => onUpdate({ ...t, status: "in-progress" })}>Start</button>
					<button className="btn bg-ink-900 text-white hover:bg-ink-700" onClick={() => onUpdate({ ...t, status: "done" })}>Done</button>
					<button className="btn bg-red-100 text-red-700 hover:bg-red-200" onClick={() => onRemove(t.id)}>Delete</button>
				</div>
			</li>
		);
	}

	return (
		<div className="card p-4 animate-fade-in">
			<div className="flex items-center justify-between mb-3">
				<h3 className="section-title">Tasks</h3>
				<div className="flex items-center gap-3">
					<label className="flex items-center gap-2 text-xs text-ink-500">
						<input type="checkbox" checked={groupByPriority} onChange={e => setGroupByPriority(e.target.checked)} />
						Group by priority
					</label>
					<label className="flex items-center gap-2 text-xs text-ink-500">
						<input type="checkbox" checked={dense} onChange={e => setDense(e.target.checked)} />
						Dense
					</label>
					<div className="text-sm text-ink-400">{filtered.length} items</div>
				</div>
			</div>

			{/* Summary bar */}
			{(() => {
				const total = filtered.length || 1;
				const done = filtered.filter(t => t.status === "done").length;
				const percent = Math.round((done / total) * 100);
				return (
					<div className="mb-3">
						<div className="h-2 rounded bg-sand-200 overflow-hidden">
							<div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} />
						</div>
						<div className="mt-1 text-xs text-ink-500">Completed {done} of {total} ({percent}%)</div>
					</div>
				);
			})()}

			{/* Filters */}
			<div className="grid md:grid-cols-[1fr_auto_auto_auto] gap-2 mb-3">
				<input
					className="input"
					placeholder="Search by title, tag, or category…"
					value={query}
					onChange={e => setQuery(e.target.value)}
					aria-label="Search tasks"
				/>
				<select className="input md:w-[150px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} aria-label="Filter status">
					<option value="all">All status</option>
					<option value="todo">Todo</option>
					<option value="in-progress">In progress</option>
					<option value="done">Done</option>
				</select>
				<select className="input md:w-[150px]" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as any)} aria-label="Filter category">
					<option value="all">All categories</option>
					{categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
				</select>
				<select className="input md:w-[150px]" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)} aria-label="Filter priority">
					<option value="all">All priorities</option>
					<option value="high">High</option>
					<option value="medium">Medium</option>
					<option value="low">Low</option>
				</select>
			</div>

			<form className="grid md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2" onSubmit={e => { e.preventDefault(); addTask(); }}>
				<input
					className="input"
					placeholder="Add a task..."
					value={draftTitle}
					onChange={e => setDraftTitle(e.target.value)}
					aria-label="Task title"
				/>
				<select className="input md:w-[150px]" value={draftCategory} onChange={e => setDraftCategory(e.target.value as TaskCategory)} aria-label="Category">
					{categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
				</select>
				<input className="input md:w-36" type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)} aria-label="Due date" />
				<input className="input md:w-28" type="time" value={draftTime} onChange={e => setDraftTime(e.target.value)} aria-label="Due time" />
				<select className="input md:w-[120px]" value={draftPriority} onChange={e => setDraftPriority(e.target.value as TaskPriority)} aria-label="Priority">
					<option value="high">High</option>
					<option value="medium">Medium</option>
					<option value="low">Low</option>
				</select>
				<button className="btn-primary" type="submit">Add</button>
			</form>
			<div className="mt-2">
				<input
					className="input"
					placeholder="Tags (comma separated)"
					value={draftTags}
					onChange={e => setDraftTags(e.target.value)}
					aria-label="Tags"
				/>
			</div>

			<div className="mt-4 space-y-6">
				{groupByPriority ? (
					(["high","medium","low"] as TaskPriority[]).map(priority => {
						const list = grouped[priority];
						if (!list || list.length === 0) return null;
						return (
							<div key={priority}>
								<div className="flex items-center gap-2 mb-2">
									<div className={clsx("text-sm font-semibold capitalize", {
										"text-red-700": priority === "high",
										"text-amber-700": priority === "medium",
										"text-slate-700": priority === "low"
									})}>{priority} priority</div>
									<div className="h-px flex-1 bg-gradient-to-r from-sand-300/80 to-transparent" />
								</div>
								<ul className="divide-y divide-sand-200 rounded-lg overflow-hidden border border-sand-200 bg-white">
									{list.map((t: Task) => renderRow(t))}
								</ul>
							</div>
						);
					})
				) : (
					<ul className="divide-y divide-sand-200 rounded-xl overflow-hidden border border-sand-200 bg-white">
						{sorted.map((t: Task) => renderRow(t))}
						{filtered.length === 0 && <li className="py-8 text-center text-ink-400">No tasks yet for this selection.</li>}
					</ul>
				)}
			</div>
		</div>
	);
}

export default memo(TodoList);

function priorityAccent(priority: TaskPriority | undefined) {
	const p = priority ?? "medium";
	return {
		"high": "bg-red-500/70",
		"medium": "bg-amber-500/60",
		"low": "bg-slate-500/50"
	}[p];
}


