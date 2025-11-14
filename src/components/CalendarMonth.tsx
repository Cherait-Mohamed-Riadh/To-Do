import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isEqual, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { Task } from "../types";
import { clsx } from "clsx";

type Props = {
	monthDate: Date;
	onChangeMonth: (d: Date) => void;
	selectedDate: Date;
	onSelectDate: (d: Date) => void;
	tasks: Task[];
};

export default function CalendarMonth({ monthDate, onChangeMonth, selectedDate, onSelectDate, tasks }: Props) {
	const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
	const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
	const days = eachDayOfInterval({ start, end });

	function prevMonth() {
		onChangeMonth(addDays(startOfMonth(monthDate), -1));
	}
	function nextMonth() {
		onChangeMonth(addDays(endOfMonth(monthDate), 1));
	}

	function countTasksByDate(d: Date) {
		return tasks.filter(t => t.dueDate && isEqual(parseISO(t.dueDate), d)).length;
	}

	return (
		<div className="card p-4 animate-fade-in">
			<div className="flex items-center justify-between mb-3">
				<h3 className="section-title">{format(monthDate, "MMMM yyyy")}</h3>
				<div className="flex gap-2">
					<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200" onClick={prevMonth} aria-label="Previous month">←</button>
					<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200" onClick={nextMonth} aria-label="Next month">→</button>
				</div>
			</div>
			<div className="-mx-2 sm:mx-0 overflow-x-auto">
				<div className="min-w-[560px] sm:min-w-0 px-2">
					<div className="grid grid-cols-7 text-xs text-ink-500 dark:text-ink-300 mb-1">
						{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d} className="px-2 py-1">{d}</div>)}
					</div>
					<div className="grid grid-cols-7 gap-1">
						{days.map(d => {
							const isCurrentMonth = isSameMonth(d, monthDate);
							const taskCount = countTasksByDate(d);
							return (
								<button
									key={d.toISOString()}
									onClick={() => onSelectDate(d)}
									className={clsx(
										"rounded-lg px-2 py-2 text-left border",
										isCurrentMonth
											? "bg-white border-sand-200 dark:bg-ink-700 dark:border-ink-600"
											: "bg-sand-100 border-sand-200 text-ink-400 dark:bg-ink-800 dark:border-ink-700 dark:text-ink-300",
										isToday(d) && "ring-2 ring-ink-900 dark:ring-ink-50",
										isEqual(d, selectedDate) && "outline outline-2 outline-ink-900 dark:outline-ink-50"
									)}
								>
									<div className="text-sm font-medium text-ink-900 dark:text-ink-50">{format(d, "d")}</div>
									{taskCount > 0 && <div className="text-[10px] text-ink-500 dark:text-ink-300">{taskCount} task{taskCount > 1 ? "s" : ""}</div>}
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}


