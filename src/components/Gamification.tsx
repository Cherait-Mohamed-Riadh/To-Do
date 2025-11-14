import { addDays, endOfWeek, format, isAfter, isBefore, isWithinInterval, parseISO, startOfWeek } from "date-fns";
import { useEffect, useMemo } from "react";
import { Task } from "../types";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { motion } from "framer-motion";

type TrophyTier = "starter" | "bronze" | "silver" | "gold" | "diamond";

type LevelHistoryEntry = {
	week: string; // yyyy-'W'II for week starting Monday
	completed: number;
	levelAfter: number;
	trophy?: TrophyTier;
};

type LevelState = {
	currentLevel: number;
	lastEvaluatedWeek: string | null; // the week key for the last FULL week we evaluated
	bestWeeklyCompleted: number;
	history: LevelHistoryEntry[];
};

function getWeekKey(date: Date) {
	const start = startOfWeek(date, { weekStartsOn: 1 });
	return format(start, "yyyy-'W'II");
}

function getTrophyForCount(count: number): TrophyTier {
	if (count >= 30) return "diamond";
	if (count >= 20) return "gold";
	if (count >= 10) return "silver";
	if (count >= 5) return "bronze";
	return "starter";
}

function countCompletedInInterval(tasks: Task[], start: Date, end: Date) {
	return tasks.filter(t => {
		if (!t.completedAt) return false;
		try {
			const d = parseISO(t.completedAt);
			return isWithinInterval(d, { start, end });
		} catch {
			return false;
		}
	}).length;
}

type Props = {
	tasks: Task[];
	anchorDate: Date;
};

export default function Gamification({ tasks, anchorDate }: Props) {
	const [state, setState] = useLocalStorage<LevelState>("app.gamification", {
		currentLevel: 1,
		lastEvaluatedWeek: null,
		bestWeeklyCompleted: 0,
		history: []
	});

	// XP-based level alongside weekly progression
	const completedTasks = useMemo(() => tasks.filter(t => !!t.completedAt), [tasks]);
	function xpForTask(t: Task) {
		let base = 10;
		const p = t.priority ?? "medium";
		if (p === "high") base += 10;
		else if (p === "medium") base += 5;
		return base;
	}
	const totalXp = useMemo(() => completedTasks.reduce((sum, t) => sum + xpForTask(t), 0), [completedTasks]);
	const xpPerLevel = 200;
	const xpLevel = Math.max(1, Math.floor(totalXp / xpPerLevel) + 1);
	const xpIntoLevel = totalXp % xpPerLevel;
	const xpProgressPct = Math.round((xpIntoLevel / xpPerLevel) * 100);

	// Weekly and monthly goals
	const [weeklyGoal, setWeeklyGoal] = useLocalStorage<number>("app.goals.weeklyTarget", 10);
	const [monthlyGoal, setMonthlyGoal] = useLocalStorage<number>("app.goals.monthlyTarget", 40);
	const [goalClaims, setGoalClaims] = useLocalStorage<{ weekClaimed?: string; monthClaimed?: string }>("app.goals.claims", {});

	// Determine key weeks relative to "now" to avoid awarding mid-week
	const now = new Date();
	const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
	const lastWeekStart = addDays(currentWeekStart, -7);
	const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });
	const prevWeekStart = addDays(currentWeekStart, -14);
	const prevWeekEnd = endOfWeek(prevWeekStart, { weekStartsOn: 1 });

	const lastWeekKey = getWeekKey(lastWeekStart);

	// Live stats for UI
	const thisWeekStats = useMemo(() => {
		const start = currentWeekStart;
		const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
		const done = countCompletedInInterval(tasks, start, end);
		return { start, end, done };
	}, [tasks, currentWeekStart]);

	const lastWeekStats = useMemo(() => {
		const done = countCompletedInInterval(tasks, lastWeekStart, lastWeekEnd);
		return { start: lastWeekStart, end: lastWeekEnd, done };
	}, [tasks, lastWeekStart, lastWeekEnd]);

	const prevWeekStats = useMemo(() => {
		const done = countCompletedInInterval(tasks, prevWeekStart, prevWeekEnd);
		return { start: prevWeekStart, end: prevWeekEnd, done };
	}, [tasks, prevWeekStart, prevWeekEnd]);

	// Weekly evaluation: run once per full week (for the last completed week)
	useEffect(() => {
		// Only evaluate after last week has actually ended (always true),
		// and only once per lastWeekKey.
		if (state.lastEvaluatedWeek === lastWeekKey) return;

		const improved = lastWeekStats.done > prevWeekStats.done;
		const nextLevel = improved ? state.currentLevel + 1 : state.currentLevel;
		const trophy = getTrophyForCount(lastWeekStats.done);
		const best = Math.max(state.bestWeeklyCompleted, lastWeekStats.done);

		setState(prev => ({
			...prev,
			currentLevel: nextLevel,
			lastEvaluatedWeek: lastWeekKey,
			bestWeeklyCompleted: best,
			history: [
				...prev.history.slice(-25), // keep recent history compact
				{
					week: lastWeekKey,
					completed: lastWeekStats.done,
					levelAfter: nextLevel,
					trophy
				}
			]
		}));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lastWeekKey, lastWeekStats.done, prevWeekStats.done]);

	const lastWeekTrophy = getTrophyForCount(lastWeekStats.done);
	const onTrack = thisWeekStats.done > lastWeekStats.done;

	// Claim weekly/monthly rewards once per period
	useEffect(() => {
		try {
			const thisWeekKey = getWeekKey(now);
			if (thisWeekStats.done >= weeklyGoal && goalClaims.weekClaimed !== thisWeekKey) {
				setGoalClaims(prev => ({ ...prev, weekClaimed: thisWeekKey }));
				if ("Notification" in window && Notification.permission === "granted") {
					new Notification("Weekly goal achieved 🎉", { body: `You completed ${thisWeekStats.done} tasks.` });
				}
			}
			const monthKey = format(now, "yyyy-MM");
			const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
			const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
			const monthDone = countCompletedInInterval(tasks, monthStart, monthEnd);
			if (monthDone >= monthlyGoal && goalClaims.monthClaimed !== monthKey) {
				setGoalClaims(prev => ({ ...prev, monthClaimed: monthKey }));
				if ("Notification" in window && Notification.permission === "granted") {
					new Notification("Monthly goal achieved 🏆", { body: `You completed ${monthDone} tasks.` });
				}
			}
		} catch {
			// ignore notifications errors
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [thisWeekStats.done, weeklyGoal, monthlyGoal, tasks]);

	function TrophyBadge({ tier }: { tier: TrophyTier }) {
		const map: Record<TrophyTier, { emoji: string; label: string; className: string }> = {
			starter: { emoji: "🎯", label: "Starter", className: "badge-slate" },
			bronze: { emoji: "🥉", label: "Bronze", className: "badge-amber" },
			silver: { emoji: "🥈", label: "Silver", className: "badge-blue" },
			gold: { emoji: "🥇", label: "Gold", className: "badge-yellow" },
			diamond: { emoji: "💎", label: "Diamond", className: "badge-cyan" }
		};
		const m = map[tier];
		return (
			<span className={`badge ${m.className}`}>
				<span className="mr-1">{m.emoji}</span>{m.label}
			</span>
		);
	}

	return (
		<div className="card p-4 animate-fade-in">
			<div className="flex items-center justify-between mb-3">
				<h3 className="section-title">Levels & Trophies</h3>
				<div className="text-sm text-ink-400">Level up weekly by improving</div>
			</div>

			{/* XP Level with animated progress */}
			<div className="rounded-md border border-sand-200 p-3 mb-3">
				<div className="flex items-center justify-between">
					<div className="text-sm font-medium">XP Level</div>
					<div className="text-sm text-ink-500">Lv. {xpLevel}</div>
				</div>
				<div className="mt-2 h-2 bg-sand-200 rounded-md overflow-hidden">
					<motion.div
						className="h-full bg-brand-600"
						initial={false}
						animate={{ width: `${xpProgressPct}%` }}
						transition={{ type: "spring", stiffness: 160, damping: 22 }}
					/>
				</div>
				<div className="mt-1 text-xs text-ink-500">{xpIntoLevel} / {xpPerLevel} XP</div>
			</div>

			{/* Goals */}
			<div className="grid gap-3 md:grid-cols-3 mb-3">
				<div className="rounded-md border border-sand-200 p-3">
					<div className="text-xs text-ink-400 mb-1">Weekly goal</div>
					<div className="flex items-baseline justify-between">
						<div className="text-lg font-semibold">{thisWeekStats.done}/{weeklyGoal}</div>
						<select className="input md:w-[110px]" value={weeklyGoal} onChange={e => setWeeklyGoal(Number(e.target.value) || 10)}>
							<option value={5}>5</option>
							<option value={10}>10</option>
							<option value={15}>15</option>
							<option value={20}>20</option>
						</select>
					</div>
					<div className="mt-2 h-2 bg-sand-200 rounded-md overflow-hidden">
						<div className="h-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${Math.min(100, Math.round((thisWeekStats.done / Math.max(1, weeklyGoal)) * 100))}%` }} />
					</div>
					{goalClaims.weekClaimed === getWeekKey(now) && (
						<div className="mt-2 text-xs text-emerald-700">Goal achieved 🎉</div>
					)}
				</div>
				<div className="rounded-md border border-sand-200 p-3">
					<div className="text-xs text-ink-400 mb-1">Monthly goal</div>
					<div className="flex items-baseline justify-between">
						<div className="text-lg font-semibold">
							{(() => {
								try {
									const start = new Date(now.getFullYear(), now.getMonth(), 1);
									const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
									return countCompletedInInterval(tasks, start, end);
								} catch { return 0; }
							})()}/{monthlyGoal}
						</div>
						<select className="input md:w-[110px]" value={monthlyGoal} onChange={e => setMonthlyGoal(Number(e.target.value) || 40)}>
							<option value={20}>20</option>
							<option value={30}>30</option>
							<option value={40}>40</option>
							<option value={60}>60</option>
						</select>
					</div>
					<div className="mt-2 h-2 bg-sand-200 rounded-md overflow-hidden">
						{(() => {
							try {
								const start = new Date(now.getFullYear(), now.getMonth(), 1);
								const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
								const monthDone = countCompletedInInterval(tasks, start, end);
								return <div className="h-full bg-amber-600 transition-[width] duration-500" style={{ width: `${Math.min(100, Math.round((monthDone / Math.max(1, monthlyGoal)) * 100))}%` }} />;
							} catch {
								return <div className="h-full bg-amber-600" style={{ width: "0%" }} />;
							}
						})()}
					</div>
					{(() => {
						try {
							const monthKey = format(now, "yyyy-MM");
							return goalClaims.monthClaimed === monthKey ? <div className="mt-2 text-xs text-amber-700">Goal achieved 🏆</div> : null;
						} catch { return null; }
					})()}
				</div>
				<div className="rounded-md border border-sand-200 p-3">
					<div className="text-xs text-ink-400 mb-1">Streak level</div>
					<div className="flex items-baseline gap-2">
						<div className="text-2xl font-semibold">Lv. {state.currentLevel}</div>
						<div className="text-xs text-ink-500">Best week {state.bestWeeklyCompleted}</div>
					</div>
				</div>
			</div>

			<div className="grid gap-3 md:grid-cols-3">
				<div className="rounded-md border border-sand-200 p-3 flex items-center justify-between">
					<div>
						<div className="text-xs text-ink-400">Current level</div>
						<div className="text-2xl font-semibold">Lv. {state.currentLevel}</div>
					</div>
					<div className="text-right">
						<div className="text-xs text-ink-400">Best week</div>
						<div className="text-lg font-medium">{state.bestWeeklyCompleted}</div>
					</div>
				</div>
				<div className="rounded-md border border-sand-200 p-3">
					<div className="text-xs text-ink-400 mb-1">This week</div>
					<div className="flex items-baseline gap-2">
						<div className="text-2xl font-semibold text-ink-900">{thisWeekStats.done}</div>
						<span className="text-sm text-ink-500">completed</span>
					</div>
					<div className="text-xs text-ink-500 mt-1">
						{onTrack ? "On track to level up 🎉" : "Beat last week to level up"}
					</div>
				</div>
				<div className="rounded-md border border-sand-200 p-3">
					<div className="text-xs text-ink-400 mb-1">Last week</div>
					<div className="flex items-baseline gap-2">
						<div className="text-2xl font-semibold text-ink-900">{lastWeekStats.done}</div>
						<span className="text-sm text-ink-500">completed</span>
					</div>
					<div className="mt-1"><TrophyBadge tier={lastWeekTrophy} /></div>
				</div>
			</div>

			<div className="mt-4">
				<div className="text-sm font-medium mb-2">Recent trophies</div>
				<div className="flex flex-wrap gap-2">
					{state.history.slice(-8).map(h => (
						<span key={h.week} className="inline-flex items-center gap-2 rounded-md border border-sand-200 px-2 py-1 text-sm">
							<span className="text-ink-500">{h.week}</span>
							<TrophyBadge tier={h.trophy ?? "starter"} />
							<span className="text-ink-500">{h.completed} done</span>
							<span className="badge badge-slate">Lv {h.levelAfter}</span>
						</span>
					))}
					{state.history.length === 0 && (
						<span className="text-sm text-ink-400">No trophies yet. Finish tasks to earn your first!</span>
					)}
				</div>
			</div>
		</div>
	);
}


