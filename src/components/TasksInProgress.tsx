import { Task } from "../types";

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
				{inProgress.map(t => (
					<div key={t.id} className="relative rounded-xl overflow-hidden bg-gradient-to-br from-sand-100 to-white shadow-card p-4 animate-scale-in">
						<div className="text-xs text-ink-500 mb-1 capitalize">{t.category}</div>
						<div className="text-lg font-semibold mb-6">{t.title}</div>
						<button className="btn-primary" onClick={() => onMarkDone(t.id)}>Mark done</button>
					</div>
				))}
				{inProgress.length === 0 && <div className="text-ink-400 text-sm">No tasks in progress.</div>}
			</div>
		</div>
	);
}


