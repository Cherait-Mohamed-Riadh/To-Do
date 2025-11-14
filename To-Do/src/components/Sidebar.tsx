import { format, isThisMonth, isThisWeek, parseISO } from "date-fns";
import { memo, useRef, useState } from "react";
import { Task, Page } from "../types";
import PageTree from "./PageTree";
import { useLocalStorage } from "../hooks/useLocalStorage";

type SidebarProps = {
	tasks: Task[];
	onToggleTask: (id: string) => void;
	onAddTask: (title: string) => void;
	pages: Page[];
	onCreatePage: (title: string, parentId?: string | null) => void;
	onSelectPage: (id: string | null) => void;
	selectedPageId: string | null;
};

function Sidebar({ tasks, onToggleTask, onAddTask, pages, onCreatePage, onSelectPage, selectedPageId }: SidebarProps) {
	const weekTasks = tasks.filter(t => t.dueDate && isThisWeek(parseISO(t.dueDate!)));
	const monthTasks = tasks.filter(t => t.dueDate && isThisMonth(parseISO(t.dueDate!)));
	const [profile, setProfile] = useLocalStorage<{ name: string; avatar?: string }>("app.profile", { name: "Your name" });
	const [editing, setEditing] = useState(false);
	const [nameDraft, setNameDraft] = useState(profile.name ?? "");
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	function handleAddQuickTask(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = e.currentTarget;
		const fd = new FormData(form);
		const title = (fd.get("title") as string)?.trim();
		if (title) {
			onAddTask(title);
			form.reset();
		}
	}

	const pageTree = pages.filter(p => !p.parentId);

	function handleAddRootPage() {
		onCreatePage("Untitled");
	}

	return (
		<aside className="h-full w-full md:w-64 md:shrink-0 lg:w-72 xl:w-80 bg-[var(--sidebar)] text-white flex flex-col">
			<header className="px-4 sm:px-5 pt-5 sm:pt-6 pb-3 sm:pb-4 border-b border-white/10">
				<div className="flex items-center gap-2">
					<div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg bg-brand-600 grid place-items-center shadow-sm">
						<span className="text-fluid-xs sm:text-fluid-sm font-bold tracking-tight">Td</span>
					</div>
					<div className="font-semibold text-fluid-sm sm:text-fluid-base leading-tight">Todos</div>
				</div>
			</header>
			<div className="flex-1 overflow-auto px-3 sm:px-4 py-4 space-y-6">
				<section>
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-[11px] sm:text-xs uppercase tracking-wider text-white/60 font-medium">Pages</h3>
						<button onClick={handleAddRootPage} className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/15">+ New</button>
					</div>
					{pageTree.length === 0 ? (
						<div className="text-white/40 text-fluid-xs">No pages yet</div>
					) : (
						<PageTree pages={pages} selectedPageId={selectedPageId} onSelect={(id) => onSelectPage(id)} onCreate={onCreatePage} />
					)}
				</section>
				<section>
					<h3 className="text-[11px] sm:text-xs uppercase tracking-wider text-white/60 mb-2 font-medium">This week</h3>
					<ul className="space-y-2">
						{weekTasks.length === 0 && <li className="text-white/50 text-fluid-xs">No tasks this week</li>}
						{weekTasks.map(t => (
							<li key={t.id} className="flex items-start gap-2">
								<input
									type="checkbox"
									checked={t.status === "done"}
									onChange={() => onToggleTask(t.id)}
									className="mt-1 h-5 w-5 rounded border-white/30 bg-transparent"
									aria-label="toggle task"
								/>
								<div className="flex-1">
									<div className={`text-fluid-xs sm:text-sm ${t.status === "done" ? "line-through text-white/50" : ""}`}>{t.title}</div>
									{t.dueDate && <div className="text-[11px] text-white/50">{format(parseISO(t.dueDate), "EEE, MMM d")}</div>}
								</div>
							</li>
						))}
					</ul>
				</section>
				<section>
					<h3 className="text-[11px] sm:text-xs uppercase tracking-wider text-white/60 mb-2 font-medium">This month</h3>
					<ul className="space-y-2">
						{monthTasks.length === 0 && <li className="text-white/50 text-fluid-xs">No tasks this month</li>}
						{monthTasks.map(t => (
							<li key={t.id} className="flex items-start gap-2">
								<input
									type="checkbox"
									checked={t.status === "done"}
									onChange={() => onToggleTask(t.id)}
									className="mt-1 h-5 w-5 rounded border-white/30 bg-transparent"
									aria-label="toggle task"
								/>
								<div className="flex-1">
									<div className={`text-fluid-xs sm:text-sm ${t.status === "done" ? "line-through text-white/50" : ""}`}>{t.title}</div>
									{t.dueDate && <div className="text-[11px] text-white/50">{format(parseISO(t.dueDate), "EEE, MMM d")}</div>}
								</div>
							</li>
						))}
					</ul>
				</section>

				<section className="pt-2 border-t border-white/10">
					<h3 className="text-[11px] sm:text-xs uppercase tracking-wider text-white/60 mb-2 font-medium">Quick add</h3>
					<form onSubmit={handleAddQuickTask} className="flex gap-2">
						<input name="title" required placeholder="New task..." className="flex-1 rounded-md bg-white/10 px-3 py-2.5 sm:py-2 text-fluid-xs placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30" />
						<button className="bg-white text-ink-900 text-fluid-xs sm:text-sm font-medium px-3 py-2.5 sm:py-2 rounded-md hover:bg-sand-100" type="submit">Add</button>
					</form>
				</section>
			</div>
			<footer className="mt-auto p-4 border-t border-white/10">
				<div className="flex items-center gap-3">
					<button
						type="button"
							onClick={() => fileInputRef.current?.click()}
							className="relative h-10 w-10 rounded-full overflow-hidden ring-1 ring-white/15 grid place-items-center bg-white/10 hover:bg-white/15"
							aria-label="Change profile picture"
							title="Change profile picture"
						>
						{profile.avatar ? (
							<img src={profile.avatar} alt="Profile avatar" className="h-full w-full object-cover" />
						) : (
							<span className="text-fluid-xs sm:text-sm font-semibold">
								{(profile.name || "Y N").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()}
							</span>
						)}
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={async e => {
								const f = e.target.files?.[0];
								if (!f) return;
								const reader = new FileReader();
								reader.onload = () => {
									const url = typeof reader.result === "string" ? reader.result : undefined;
									if (url) setProfile(prev => ({ ...prev, avatar: url }));
								};
								reader.readAsDataURL(f);
							}}
						/>
					</button>
					<div className="flex-1 min-w-0">
						<div className="flex items-center justify-between gap-2">
							<div className="truncate text-white/90 font-medium text-fluid-xs sm:text-sm">
								{profile.name || "Your name"}
							</div>
							<button
								type="button"
								onClick={() => { setEditing(v => !v); setNameDraft(profile.name ?? ""); }}
								className="p-1 rounded hover:bg-white/10"
								aria-label="Edit profile"
								title="Edit name"
							>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-white/70">
									<path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793zM12.172 5l-8.5 8.5A2 2 0 0 0 3 14.914V17h2.086a2 2 0 0 0 1.414-.586L15 7.828 12.172 5z" />
								</svg>
							</button>
						</div>
						{editing && (
							<form
								className="mt-2 w-full min-w-0 flex items-center gap-2"
								onSubmit={e => {
									e.preventDefault();
									setProfile(prev => ({ ...prev, name: nameDraft.trim() || "Your name" }));
									setEditing(false);
								}}
							>
								<input
									autoFocus
									value={nameDraft}
									onChange={e => setNameDraft(e.target.value)}
									placeholder="Enter your name"
									className="flex-1 min-w-0 rounded-md bg-white/10 px-2 py-1 text-fluid-xs sm:text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
								/>
								<button className="shrink-0 whitespace-nowrap bg-white text-ink-900 text-xs font-medium px-2 py-1 rounded hover:bg-sand-100" type="submit">
									Save
								</button>
							</form>
						)}
					</div>
				</div>
			</footer>
		</aside>
	);
}

export default memo(Sidebar);


