import { addDays, endOfWeek, format, startOfWeek } from "date-fns";
import { useMemo } from "react";
import { Task } from "../types";
import { useLocalStorage } from "../hooks/useLocalStorage";

type Props = {
	tasks: Task[];
};

type Session = { id: string; date: string; mode: "focus" | "break"; seconds: number; taskId?: string };

export default function Reports({ tasks }: Props) {
	const [sessions] = useLocalStorage<Session[]>("app.pomo.sessions", []);
	const now = new Date();
	const weekStart = startOfWeek(now, { weekStartsOn: 1 });
	const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

	// Focus minutes per day this week
	const focusByDay = useMemo(() => {
		const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
		return days.map(d => {
			const key = format(d, "yyyy-MM-dd");
			const sec = sessions
				.filter(s => s.mode === "focus" && s.date === key)
				.reduce((acc, s) => acc + s.seconds, 0);
			return { date: d, label: format(d, "EEE"), minutes: Math.round(sec / 60) };
		});
	}, [sessions, weekStart]);

	const totalFocusThisWeek = useMemo(() => focusByDay.reduce((a, b) => a + b.minutes, 0), [focusByDay]);
	const mostProductive = useMemo(() => {
		const max = Math.max(0, ...focusByDay.map(d => d.minutes));
		return focusByDay.filter(d => d.minutes === max).map(d => d.label);
	}, [focusByDay]);

	// Completion percentage per category
	const categoryStats = useMemo(() => {
		const map = new Map<string, { total: number; done: number }>();
		for (const t of tasks) {
			const key = t.category;
			const entry = map.get(key) ?? { total: 0, done: 0 };
			entry.total += 1;
			if (t.status === "done") entry.done += 1;
			map.set(key, entry);
		}
		return Array.from(map.entries()).map(([category, { total, done }]) => {
			const pct = total > 0 ? Math.round((done / total) * 100) : 0;
			return { category, total, done, pct };
		});
	}, [tasks]);

	return (
		<div className="card section-gradient p-4 animate-fade-in">
			<div className="flex items-center justify-between mb-3">
				<h3 className="section-title">Reports</h3>
				<div className="text-sm text-ink-500">
					Week of {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
				</div>
			</div>

			<div className="grid md:grid-cols-3 gap-4">
				<div className="rounded-md border border-sand-200 p-3">
					<div className="text-xs text-ink-400 mb-1">Total focus this week</div>
					<div className="text-2xl font-semibold">{totalFocusThisWeek} min</div>
					<div className="mt-2 h-2 bg-sand-200 rounded-md overflow-hidden">
						<div className="h-full bg-ink-900" style={{ width: `${Math.min(100, Math.round((totalFocusThisWeek / Math.max(1, 7 * 60)) * 100))}%` }} />
					</div>
					<div className="text-[11px] text-ink-400 mt-1">Goal: 60 min/day</div>
				</div>
				<div className="rounded-md border border-sand-200 p-3">
					<div className="text-xs text-ink-400 mb-1">Most productive day(s)</div>
					<div className="text-lg font-medium">{mostProductive.length ? mostProductive.join(", ") : "—"}</div>
					<div className="mt-2 space-y-1">
						{focusByDay.map(d => (
							<div key={d.label} className="flex items-center gap-2">
								<div className="w-10 text-xs text-ink-500">{d.label}</div>
								<div className="flex-1 h-2 bg-sand-200 rounded">
									<div className="h-full bg-brand-600 rounded" style={{ width: `${Math.min(100, Math.round((d.minutes / 120) * 100))}%` }} />
								</div>
								<div className="w-10 text-right text-xs text-ink-500">{d.minutes}m</div>
							</div>
						))}
					</div>
				</div>
				<div className="rounded-md border border-sand-200 p-3">
					<div className="text-xs text-ink-400 mb-1">Completion by category</div>
					<div className="space-y-2">
						{categoryStats.map(c => (
							<div key={c.category}>
								<div className="flex items-center justify-between text-xs mb-1">
									<div className="text-ink-500">{c.category}</div>
									<div className="tabular-nums">{c.pct}%</div>
								</div>
								<div className="h-2 bg-sand-200 rounded">
									<div className="h-full bg-emerald-600 rounded" style={{ width: `${c.pct}%` }} />
								</div>
							</div>
						))}
						{categoryStats.length === 0 && (
							<div className="text-xs text-ink-400">No tasks yet.</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}


