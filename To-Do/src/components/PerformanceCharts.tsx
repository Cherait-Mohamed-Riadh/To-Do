import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, ReferenceLine } from "recharts";
import type { TooltipProps } from "recharts";
import { Task } from "../types";
import { useLocalStorage } from "../hooks/useLocalStorage";

type Props = {
	tasks: Task[];
	anchorDate: Date;
};

type Range = "daily" | "weekly" | "monthly";
type Mode = "totals" | "cumulative";

export default function PerformanceCharts({ tasks, anchorDate }: Props) {
	const [range, setRange] = useLocalStorage<Range>("app.charts.range", "daily");
	const [mode, setMode] = useLocalStorage<Mode>("app.charts.mode", "totals");

	const data = useMemo(() => {
		function parseDate(value?: string) {
			try {
				return value ? parseISO(value) : null;
			} catch {
				return null;
			}
		}
		// Prefer createdAt / completedAt; gracefully fall back to dueDate for legacy items
		function getCreatedDate(task: Task) {
			return parseDate(task.createdAt) ?? parseDate(task.dueDate);
		}
		function getCompletedDate(task: Task) {
			return parseDate(task.completedAt);
		}

		if (range === "daily") {
			const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
			const end = endOfWeek(anchorDate, { weekStartsOn: 1 });
			return eachDayOfInterval({ start, end }).map(d => ({
				label: format(d, "EEE"),
				done: tasks.filter(t => {
					const cd = getCompletedDate(t);
					return cd && format(cd, "yyyy-MM-dd") === format(d, "yyyy-MM-dd");
				}).length,
				created: tasks.filter(t => {
					const cr = getCreatedDate(t);
					return cr && format(cr, "yyyy-MM-dd") === format(d, "yyyy-MM-dd");
				}).length
			}));
		}
		if (range === "weekly") {
			const start = startOfMonth(anchorDate);
			const end = endOfMonth(anchorDate);
			const weeks = [];
			let cursor = startOfWeek(start, { weekStartsOn: 1 });
			while (cursor <= end) {
				const wStart = cursor;
				const wEnd = endOfWeek(cursor, { weekStartsOn: 1 });
				weeks.push({ wStart, wEnd });
				cursor = addDays(wEnd, 1);
			}
			return weeks.map((w, idx) => ({
				label: `W${idx + 1}`,
				done: tasks.filter(t => {
					const cd = getCompletedDate(t);
					return cd && cd >= w.wStart && cd <= w.wEnd;
				}).length,
				created: tasks.filter(t => {
					const cr = getCreatedDate(t);
					return cr && cr >= w.wStart && cr <= w.wEnd;
				}).length
			}));
		}
		// monthly - last 6 months
		const months = Array.from({ length: 6 }, (_, i) => {
			const d = new Date(anchorDate);
			d.setMonth(d.getMonth() - (5 - i));
			return d;
		});
		return months.map(m => {
			const s = startOfMonth(m);
			const e = endOfMonth(m);
			return {
				label: format(m, "MMM"),
				done: tasks.filter(t => {
					const cd = getCompletedDate(t);
					return cd && cd >= s && cd <= e;
				}).length,
				created: tasks.filter(t => {
					const cr = getCreatedDate(t);
					return cr && cr >= s && cr <= e;
				}).length
			};
		});
	}, [tasks, anchorDate, range]);

	// Build cumulative series and quick stats
	const enhanced = useMemo(() => {
		let createdCum = 0;
		let doneCum = 0;
		let createdTotal = 0;
		let doneTotal = 0;
		const series = data.map(d => {
			createdCum += d.created;
			doneCum += d.done;
			createdTotal += d.created;
			doneTotal += d.done;
			return { ...d, createdCum, doneCum };
		});
		const length = Math.max(series.length, 1);
		return {
			series,
			avgCreated: createdTotal / length,
			avgDone: doneTotal / length
		};
	}, [data]);

	function CustomTooltip({ active, label, payload }: TooltipProps<number, string>) {
		if (!active || !payload || payload.length === 0) return null;
		const createdItem = payload.find(p => (p.dataKey as string)?.toLowerCase().includes("created"));
		const doneItem = payload.find(p => (p.dataKey as string)?.toLowerCase().includes("done"));
		return (
			<div className="rounded-md border border-sand-200 bg-white/95 dark:bg-ink-800/95 px-3 py-2 shadow-md">
				<div className="text-sm font-medium mb-1">{label}</div>
				{createdItem && (
					<div className="text-xs flex items-center gap-2">
						<span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#6366f1" }} />
						<span className="text-ink-500">created:</span>
						<span className="font-semibold">{createdItem.value}</span>
					</div>
				)}
				{doneItem && (
					<div className="text-xs flex items-center gap-2 mt-0.5">
						<span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#10b981" }} />
						<span className="text-ink-500">done:</span>
						<span className="font-semibold">{doneItem.value}</span>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="card p-4 animate-fade-in">
			<div className="flex items-center justify-between mb-3">
				<h3 className="section-title">Performance</h3>
				<div className="flex gap-2">
					<select className="input" value={range} onChange={e => setRange(e.target.value as Range)}>
						<option value="daily">Daily (This week)</option>
						<option value="weekly">Weekly (This month)</option>
						<option value="monthly">Monthly (6 mo)</option>
					</select>
					<select className="input" value={mode} onChange={e => setMode(e.target.value as Mode)} aria-label="Chart mode">
						<option value="totals">Totals</option>
						<option value="cumulative">Cumulative</option>
					</select>
				</div>
			</div>
			<div className="grid lg:grid-cols-2 gap-4">
				<div className="h-64">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data} margin={{ left: 0, right: 8, top: 10 }}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="label" />
							<YAxis allowDecimals={false} />
							<Tooltip content={<CustomTooltip />} />
							<Legend />
							<Bar dataKey="created" fill="#a3a3f3" name="Created" />
							<Bar dataKey="done" fill="#10b981" name="Completed" />
						</BarChart>
					</ResponsiveContainer>
				</div>
				<div className="h-64">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={enhanced.series} margin={{ left: 0, right: 8, top: 10 }}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="label" />
							<YAxis allowDecimals={false} />
							<Tooltip content={<CustomTooltip />} />
							<Legend />
							{mode === "totals" && (
								<>
									<ReferenceLine y={enhanced.avgCreated} stroke="#6366f1" strokeDasharray="4 4" ifOverflow="extendDomain" />
									<ReferenceLine y={enhanced.avgDone} stroke="#10b981" strokeDasharray="4 4" ifOverflow="extendDomain" />
								</>
							)}
							<Line
								type="monotone"
								dataKey={mode === "cumulative" ? "createdCum" : "created"}
								name={mode === "cumulative" ? "Created (cum.)" : "Created"}
								stroke="#6366f1"
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4 }}
								isAnimationActive
							/>
							<Line
								type="monotone"
								dataKey={mode === "cumulative" ? "doneCum" : "done"}
								name={mode === "cumulative" ? "Completed (cum.)" : "Completed"}
								stroke="#10b981"
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4 }}
								isAnimationActive
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			</div>
		</div>
	);
}


