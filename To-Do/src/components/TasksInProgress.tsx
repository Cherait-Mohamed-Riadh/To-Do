import { Task } from "../types";
import { format, parseISO } from "date-fns";

type Props = {
	tasks: Task[];
	onMarkDone: (id: string) => void;
};

export default function TasksInProgress({ tasks, onMarkDone }: Props) {
	const inProgress = tasks.filter(t => t.status === "in-progress");
	return (
		<div className="card p-4 animate-fade-in">
			<h3 className="section-title mb-3">Tasks in progress</h3>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
				{inProgress.map(t => {
					const hasDue = !!t.dueDate;
					const dueLabel = hasDue ? `${format(parseISO(t.dueDate!), "MMM d")}${t.dueTime ? ` • ${t.dueTime}` : ""}` : "";
					return (
						<div key={t.id} className="relative rounded-xl overflow-hidden bg-gradient-to-br from-sand-100 to-white shadow-card p-4 animate-scale-in">
							<div className="flex items-center justify-between mb-1">
								<div className="text-xs text-ink-500 capitalize">{t.category}</div>
								{(t.priority ?? "medium") && (
									<span className={`badge ${t.priority === 'high' ? 'badge-red' : t.priority === 'low' ? 'badge-slate' : 'badge-amber'}`}>{t.priority ?? 'medium'}</span>
								)}
							</div>
							<div className="text-lg font-semibold mb-3">{t.title}</div>
							<div className="text-xs text-ink-500 mb-4 h-4">{hasDue ? dueLabel : ""}</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1 flex-wrap">
									{(t.tags ?? []).slice(0, 3).map(tag => (
										<span key={tag} className="badge-slate">{tag}</span>
									))}
									{(t.tags ?? []).length > 3 && <span className="text-xs text-ink-400">+{(t.tags ?? []).length - 3}</span>}
								</div>
								<button className="btn-primary" onClick={() => onMarkDone(t.id)}>Mark done</button>
							</div>
						</div>
					);
				})}
				{inProgress.length === 0 && <div className="text-ink-400 text-sm">No tasks in progress.</div>}
			</div>
		</div>
	);
}


