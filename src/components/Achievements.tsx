import { format } from "date-fns";
import { memo, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { Task } from "../types";

type Props = {
  tasks: Task[];
};

type Session = {
  id: string;
  date: string; // yyyy-MM-dd
  mode: "focus" | "break";
  seconds: number;
  taskId?: string;
};

type Achievement = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressText?: string;
};

function uniqueDaysWithCompletions(tasks: Task[]) {
  const days = new Set<string>();
  tasks.forEach(t => {
    if (t.completedAt) {
      try {
        const d = new Date(t.completedAt);
        const key = format(d, "yyyy-MM-dd");
        days.add(key);
      } catch {
        /* ignore */
      }
    }
  });
  return days;
}

function getDailyFocusMinutes(sessions: Session[]) {
  const map = new Map<string, number>();
  for (const s of sessions) {
    if (s.mode !== "focus") continue;
    map.set(s.date, (map.get(s.date) || 0) + Math.round(s.seconds / 60));
  }
  return map;
}

function Achievements({ tasks }: Props) {
  const [sessions] = useLocalStorage<Session[]>("app.pomo.sessions", []);
  const totalCompleted = useMemo(() => tasks.filter(t => t.status === "done").length, [tasks]);
  const daysWithCompletions = useMemo(() => uniqueDaysWithCompletions(tasks), [tasks]);
  const dailyFocus = useMemo(() => getDailyFocusMinutes(sessions), [sessions]);

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayFocus = dailyFocus.get(todayKey) || 0;

  // basic streak: count how many consecutive days back from today with at least 1 completion
  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = format(d, "yyyy-MM-dd");
      if (daysWithCompletions.has(key)) count++;
      else break;
    }
    return count;
  }, [daysWithCompletions]);

  const achievements: Achievement[] = [
    {
      id: "a1",
      emoji: "✅",
      title: "Active User",
      description: "Complete 10 tasks",
      unlocked: totalCompleted >= 10,
      progressText: `${Math.min(10, totalCompleted)}/10`,
    },
    {
      id: "a2",
      emoji: "🚀",
      title: "Productive",
      description: "Complete 25 tasks",
      unlocked: totalCompleted >= 25,
      progressText: `${Math.min(25, totalCompleted)}/25`,
    },
    {
      id: "a3",
      emoji: "🏆",
      title: "Goal Crusher",
      description: "Complete 50 tasks",
      unlocked: totalCompleted >= 50,
      progressText: `${Math.min(50, totalCompleted)}/50`,
    },
    {
      id: "a4",
      emoji: "🔥",
      title: "Streak Starter",
      description: "Finish tasks 5 days in a row",
      unlocked: streak >= 5,
      progressText: `${Math.min(5, streak)}/5 days`,
    },
    {
      id: "a5",
      emoji: "🧠",
      title: "Deep Focus",
      description: "100 minutes of focus in a day",
      unlocked: todayFocus >= 100,
      progressText: `${Math.min(100, todayFocus)}/100 min today`,
    },
  ];

  return (
    <div className="card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title">Achievements</h3>
        <div className="text-sm text-ink-400">{totalCompleted} completed • {streak} day streak</div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {achievements.map(a => (
          <div
            key={a.id}
            className={`rounded-md border p-3 ${a.unlocked ? "border-emerald-300 bg-emerald-50 dark:bg-ink-700/40" : "border-sand-200 bg-white dark:bg-ink-800"}`}
          >
            <div className="flex items-start gap-2">
              <div className="text-xl">{a.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{a.title}</div>
                <div className="text-sm text-ink-500">{a.description}</div>
                {a.progressText && !a.unlocked && (
                  <div className="text-xs text-ink-400 mt-1">{a.progressText}</div>
                )}
                {a.unlocked && (
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700">
                    <span>Unlocked</span> <span>🎉</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(Achievements);










