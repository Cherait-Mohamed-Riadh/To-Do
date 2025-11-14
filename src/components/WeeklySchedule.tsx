import { addDays, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import { Task } from "../types";

type Props = {
	anchorDate: Date;
	tasks: Task[];
};

export default function WeeklySchedule({ anchorDate, tasks }: Props) {
	const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
	const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

	function tasksForDay(d: Date) {
		return tasks
			.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), d))
			.sort((a, b) => (a.dueTime || "99:99").localeCompare(b.dueTime || "99:99"));
	}

	return (
		<div className="card p-4 animate-fade-in">
			<div className="flex items-center justify-between mb-3">
				<h3 className="section-title">This week</h3>
				<div className="text-sm text-ink-400 dark:text-ink-300">{format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}</div>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
				{days.map(d => (
					<div key={d.toISOString()} className="rounded-lg border border-sand-200 bg-white dark:bg-ink-700 dark:border-ink-600 p-2 min-h-[140px]">
						<div className="text-xs text-ink-500 dark:text-ink-300 mb-1">{format(d, "EEE d")}</div>
						<ul className="space-y-2">
							{tasksForDay(d).map(t => (
								<li key={t.id} className="text-xs">
									<span className="inline-block w-20 text-ink-400 dark:text-ink-300">{t.dueTime || "—"}</span>
									<span className="font-medium">{t.title}</span>
								</li>
							))}
							{tasksForDay(d).length === 0 && <li className="text-ink-300 dark:text-ink-400 text-xs">No items</li>}
						</ul>
					</div>
				))}
			</div>
		</div>
	);
}


