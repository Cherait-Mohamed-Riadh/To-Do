import { format, isAfter, isBefore, parseISO } from "date-fns";
import { memo, useMemo } from "react";
import { Task } from "../types";

type Props = {
  tasks: Task[];
};

function scoreTask(t: Task) {
  let score = 0;
  // High priority first
  const p = t.priority ?? "medium";
  if (p === "high") score += 50;
  else if (p === "medium") score += 20;
  // Overdue boost
  try {
    if (t.dueDate && isBefore(parseISO(t.dueDate), new Date()) && t.status !== "done") {
      score += 40;
    }
  } catch { /* ignore */ }
  // Age boost (older tasks first)
  try {
    const created = t.createdAt ? parseISO(t.createdAt) : null;
    if (created) {
      const days = Math.max(0, Math.round((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)));
      score += Math.min(40, days);
    }
  } catch { /* ignore */ }
  // Not started vs in-progress
  if (t.status === "in-progress") score += 10;
  return score;
}

function Suggestions({ tasks }: Props) {
  const pending = tasks.filter(t => t.status !== "done");
  const top = useMemo(() => {
    return [...pending].sort((a, b) => scoreTask(b) - scoreTask(a)).slice(0, 5);
  }, [pending]);

  // Derive ideal time from past completions (hour bucket with most completed)
  const idealTime = useMemo(() => {
    const buckets = new Map<number, number>();
    for (const t of tasks) {
      if (!t.completedAt) continue;
      try {
        const d = new Date(t.completedAt);
        const h = d.getHours();
        buckets.set(h, (buckets.get(h) || 0) + 1);
      } catch { /* ignore */ }
    }
    if (buckets.size === 0) return null;
    let bestHour = 9;
    let bestCount = -1;
    for (const [h, c] of buckets) {
      if (c > bestCount) { bestCount = c; bestHour = h; }
    }
    const start = `${String(bestHour).padStart(2, "0")}:00`;
    const endHour = (bestHour + 2) % 24;
    const end = `${String(endHour).padStart(2, "0")}:00`;
    return `${start}–${end}`;
  }, [tasks]);

  const overdueCount = useMemo(() => {
    let c = 0;
    const now = new Date();
    for (const t of tasks) {
      try {
        if (t.dueDate && isBefore(parseISO(t.dueDate), now) && t.status !== "done") c++;
      } catch { /* ignore */ }
    }
    return c;
  }, [tasks]);

  return (
    <div className="card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title">Smart suggestions</h3>
        {idealTime && <div className="text-sm text-ink-500">Best time: {idealTime}</div>}
      </div>
      <div className="text-xs text-ink-500 mb-2">
        {overdueCount > 0 ? `${overdueCount} overdue — knock these out first` : "You're on track — pick a priority task"}
      </div>
      <ul className="divide-y divide-sand-200">
        {top.map(t => (
          <li key={t.id} className="py-2 flex items-start gap-2">
            <span className="badge badge-slate">{t.priority ?? "medium"}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-ink-500">
                {t.dueDate ? `Due ${format(parseISO(t.dueDate), "EEE, MMM d")}` : "No due date"}
                {t.category ? ` • ${t.category}` : ""}
              </div>
            </div>
          </li>
        ))}
        {top.length === 0 && <li className="py-6 text-ink-400 text-center">All set. Add more tasks to get suggestions.</li>}
      </ul>
    </div>
  );
}

export default memo(Suggestions);










