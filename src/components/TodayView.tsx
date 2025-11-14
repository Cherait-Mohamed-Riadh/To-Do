import { format, isSameDay, parseISO } from "date-fns";
import { useMemo } from "react";
import { Task, TaskPriority } from "../types";

type Props = {
	tasks: Task[];
	onUpdate: (task: Task) => void;
};

export default function TodayView({ tasks, onUpdate }: Props) {
	const today = new Date();
	const dueToday = useMemo(
		() => tasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), today)),
		[tasks, today]
	);

	// Suggest highest priority, earliest time, then earliest created
	const suggestion = useMemo(() => {
		const rankPriority: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
		return dueToday
			.filter(t => t.status !== "done")
			.slice()
			.sort((a, b) => {
				const ap = rankPriority[a.priority ?? "medium"];
				const bp = rankPriority[b.priority ?? "medium"];
				if (ap !== bp) return ap - bp;
				if (a.dueTime && b.dueTime && a.dueTime !== b.dueTime) return a.dueTime.localeCompare(b.dueTime);
				return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
			})[0];
	}, [dueToday]);

	return (
		<div className="card section-gradient p-4 animate-fade-in">
			<div className="flex items-center justify-between mb-3">
				<h3 className="section-title">Today</h3>
				<div className="text-sm text-ink-500">{format(today, "EEE, MMM d")}</div>
			</div>
			{suggestion ? (
				<div className="mb-3 rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-400/10 p-3">
					<div className="text-sm font-medium">Start with this task 🔥</div>
					<div className="text-sm text-ink-700 dark:text-ink-200 mt-1">{suggestion.title}</div>
					<div className="mt-2">
						<button
							className="btn-primary"
							onClick={() => onUpdate({ ...suggestion, status: "in-progress" })}
						>
							Start now
						</button>
					</div>
				</div>
			) : (
				<div className="mb-3 text-sm text-ink-400">No suggestion available.</div>
			)}
			<div>
				<div className="text-sm font-medium mb-2">Tasks due today</div>
				<ul className="divide-y divide-sand-200 dark:divide-ink-700">
					{dueToday.map(t => (
						<li key={t.id} className="py-2 flex items-center justify-between">
							<div className="min-w-0">
								<div className="font-medium truncate">{t.title}</div>
								<div className="text-xs text-ink-500">
									{t.dueTime ? `⏰ ${t.dueTime}` : "•"} • {t.category}{t.priority ? ` • ${t.priority}` : ""}
								</div>
							</div>
							<div className="flex items-center gap-2">
								{t.status !== "done" && (
									<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200" onClick={() => onUpdate({ ...t, status: "in-progress" })}>
										Start
									</button>
								)}
								<button className="btn bg-ink-900 text-white hover:bg-ink-700" onClick={() => onUpdate({ ...t, status: "done" })}>
									Done
								</button>
							</div>
						</li>
					))}
					{dueToday.length === 0 && <li className="py-6 text-center text-ink-400">No tasks due today.</li>}
				</ul>
			</div>
		</div>
	);
}


