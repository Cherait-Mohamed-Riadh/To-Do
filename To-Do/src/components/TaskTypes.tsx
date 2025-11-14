import { Task } from "../types";
import { useMemo } from "react";

type Props = {
	tasks: Task[];
};

export default function TaskTypes({ tasks }: Props) {
	const byCategory = useMemo(() => tasks.reduce(
		(acc, t) => {
			acc[t.category] = (acc[t.category] ?? 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	), [tasks]);

	const doneCount = useMemo(() => tasks.filter(t => t.status === 'done').length, [tasks]);
	const total = tasks.length || 1;
	const completion = Math.round((doneCount / total) * 100);

	const items = [
		{ key: "design", name: "Design team", color: "bg-pink-200 text-pink-900" },
		{ key: "meet", name: "Meet", color: "bg-blue-200 text-blue-900" },
		{ key: "dev", name: "Development team", color: "bg-rose-200 text-rose-900" },
		{ key: "personal", name: "Personal", color: "bg-emerald-200 text-emerald-900" },
		{ key: "other", name: "Another", color: "bg-yellow-200 text-yellow-900" }
	];

	return (
		<div className="card p-4 h-full animate-fade-in">
			<h3 className="section-title mb-3">Task types</h3>
			<div className="mb-4">
				<div className="h-2 rounded bg-sand-200 overflow-hidden">
					<div className="h-full bg-emerald-500" style={{ width: `${completion}%` }} />
				</div>
				<div className="mt-1 text-xs text-ink-500">Overall completion: {completion}%</div>
			</div>
			<ul className="space-y-2">
				{items.map(i => (
					<li key={i.key} className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className={`h-3 w-3 rounded ${i.color}`}></span>
							<span className="text-sm">{i.name}</span>
						</div>
						<span className="text-sm text-ink-500">{byCategory[i.key] ?? 0}</span>
					</li>
				))}
			</ul>
		</div>
	);
}


