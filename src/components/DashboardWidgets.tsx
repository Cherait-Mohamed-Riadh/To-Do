import { eachDayOfInterval, format, isAfter, isBefore, parseISO, subDays } from "date-fns";
import { memo, useMemo } from "react";
import { Task } from "../types";

type Props = {
  tasks: Task[];
};

function DashboardWidgets({ tasks }: Props) {
  const now = new Date();
  const from = subDays(now, 29);

  const { mostActiveDay, postponedCount } = useMemo(() => {
    const days = eachDayOfInterval({ start: from, end: now });
    const counts = new Array(7).fill(0); // 0=Sun .. 6=Sat
    for (const t of tasks) {
      if (!t.completedAt) continue;
      try {
        const d = parseISO(t.completedAt);
        if (isBefore(d, from) || isAfter(d, now)) continue;
        counts[d.getDay()]++;
      } catch { /* ignore */ }
    }
    let bestIdx = 0, bestVal = -1;
    for (let i = 0; i < 7; i++) {
      if (counts[i] > bestVal) { bestVal = counts[i]; bestIdx = i; }
    }
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const mostActiveDay = `${dayNames[bestIdx]} (${bestVal})`;

    const postponedCount = tasks.filter(t => {
      try {
        return t.dueDate && t.status !== "done" && isBefore(parseISO(t.dueDate), now);
      } catch { return false; }
    }).length;

    return { mostActiveDay, postponedCount };
  }, [tasks, from, now]);

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="rounded-md border border-sand-200 p-3">
        <div className="text-xs text-ink-400">Most active day (30d)</div>
        <div className="text-xl font-semibold mt-1">{mostActiveDay}</div>
      </div>
      <div className="rounded-md border border-sand-200 p-3">
        <div className="text-xs text-ink-400">Postponed tasks</div>
        <div className="text-xl font-semibold mt-1">{postponedCount}</div>
      </div>
    </div>
  );
}

export default memo(DashboardWidgets);










