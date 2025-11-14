import { useEffect, useMemo, useRef, useState } from "react";
import { Task } from "../types";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { format } from "date-fns";

type PomodoroTimerProps = {
	tasks: Task[];
};

type Session = {
	id: string;
	date: string; // ISO day string yyyy-MM-dd
	mode: "focus" | "break";
	seconds: number; // duration in seconds
	taskId?: string;
};

function uid() {
	return Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
}

export default function PomodoroTimer({ tasks }: PomodoroTimerProps) {
	const [focusMinutes, setFocusMinutes] = useLocalStorage<number>("app.pomo.focusMin", 25);
	const [breakMinutes, setBreakMinutes] = useLocalStorage<number>("app.pomo.breakMin", 5);
	const [longBreakMinutes, setLongBreakMinutes] = useLocalStorage<number>("app.pomo.longBreakMin", 15);
	const [longBreakEvery, setLongBreakEvery] = useLocalStorage<number>("app.pomo.longBreakEvery", 4);
	const [autoStartNext, setAutoStartNext] = useLocalStorage<boolean>("app.pomo.autoStartNext", true);
	const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>("app.pomo.soundEnabled", true);
	const [desktopNotify, setDesktopNotify] = useLocalStorage<boolean>("app.pomo.desktopNotify", true);
	const [vibrateEnabled, setVibrateEnabled] = useLocalStorage<boolean>("app.pomo.vibrate", true);
	const [pauseOnHide, setPauseOnHide] = useLocalStorage<boolean>("app.pomo.pauseOnHide", false);
	const [dailyGoalMinutes, setDailyGoalMinutes] = useLocalStorage<number>("app.pomo.dailyGoalMin", 120);

	const [mode, setMode] = useLocalStorage<"focus" | "break">("app.pomo.mode", "focus");
	const [remaining, setRemaining] = useLocalStorage<number>("app.pomo.remaining", focusMinutes * 60);
	const [running, setRunning] = useLocalStorage<boolean>("app.pomo.running", false);
	// Absolute timestamp when the current countdown ends (ms since epoch)
	const [endAtMs, setEndAtMs] = useLocalStorage<number | null>("app.pomo.endAt", null);
	const [selectedTaskId, setSelectedTaskId] = useLocalStorage<string | undefined>("app.pomo.taskId", undefined);
	const [sessions, setSessions] = useLocalStorage<Session[]>("app.pomo.sessions", []);
	const [streak, setStreak] = useLocalStorage<number>("app.pomo.streak", 0); // completed focus sessions since last long break
	const [isLongBreak, setIsLongBreak] = useLocalStorage<boolean>("app.pomo.isLongBreak", false);
	const [showSettings, setShowSettings] = useState(false);

	// Keep remaining in sync when durations change and not running
	useEffect(() => {
		if (!running) {
			const seconds = mode === "focus"
				? focusMinutes * 60
				: (isLongBreak ? longBreakMinutes : breakMinutes) * 60;
			setRemaining(seconds);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [focusMinutes, breakMinutes, longBreakMinutes, mode, isLongBreak]);

	const tickRef = useRef<number | null>(null);
	useEffect(() => {
		function getCurrentTotalSeconds() {
			return (mode === "focus"
				? focusMinutes
				: (isLongBreak ? longBreakMinutes : breakMinutes)) * 60;
		}

		function handleSessionCompletion() {
			// log session
			const dur = getCurrentTotalSeconds();
			const today = format(new Date(), "yyyy-MM-dd");
			setSessions(s => [{ id: uid(), date: today, mode, seconds: dur, taskId: selectedTaskId }, ...s ]);
			notifySessionEnd(mode, isLongBreak);

			// compute next mode and duration
			let nextMode: "focus" | "break" = mode === "focus" ? "break" : "focus";
			let nextIsLongBreak = false;
			let nextSeconds = 0;
			if (mode === "focus") {
				const newStreak = streak + 1;
				setStreak(newStreak);
				if (longBreakEvery > 0 && newStreak % longBreakEvery === 0) {
					nextIsLongBreak = true;
					nextSeconds = longBreakMinutes * 60;
				} else {
					nextSeconds = breakMinutes * 60;
				}
			} else {
				// break ended, go back to focus, and reset long break flag
				nextIsLongBreak = false;
				nextSeconds = focusMinutes * 60;
				if (isLongBreak) {
					// reset streak after a long break
					setStreak(0);
				}
			}
			setIsLongBreak(nextIsLongBreak);
			setMode(nextMode);

			if (autoStartNext) {
				setRunning(true);
				setRemaining(nextSeconds);
				setEndAtMs(Date.now() + nextSeconds * 1000);
			} else {
				setRunning(false);
				setRemaining(nextSeconds);
				setEndAtMs(null);
			}
		}

		// Ensure endAtMs is set when starting
		if (running && !endAtMs) {
			setEndAtMs(Date.now() + Math.max(1, remaining) * 1000);
		}

		if (!running) {
			if (tickRef.current) {
				window.clearInterval(tickRef.current);
				tickRef.current = null;
			}
			return;
		}
		if (tickRef.current) return;
		tickRef.current = window.setInterval(() => {
			const now = Date.now();
			if (!endAtMs) return;
			const newRemaining = Math.max(0, Math.round((endAtMs - now) / 1000));
			setRemaining(newRemaining);
			if (newRemaining <= 0) {
				handleSessionCompletion();
			}
		}, 250);
		return () => {
			if (tickRef.current) {
				window.clearInterval(tickRef.current);
				tickRef.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [running, endAtMs, mode, focusMinutes, breakMinutes, longBreakMinutes, selectedTaskId, streak, isLongBreak, autoStartNext, longBreakEvery]);

	function start() {
		setRunning(true);
		setEndAtMs(Date.now() + Math.max(1, remaining) * 1000);
	}
	function pause() {
		setRunning(false);
		if (endAtMs) {
			const secsLeft = Math.max(0, Math.round((endAtMs - Date.now()) / 1000));
			setRemaining(secsLeft);
		}
		setEndAtMs(null);
	}
	function reset() {
		setRunning(false);
		setEndAtMs(null);
		setRemaining((mode === "focus" ? focusMinutes : (isLongBreak ? longBreakMinutes : breakMinutes)) * 60);
	}
	function skip() {
		// skip to next mode without logging
		const nextMode = mode === "focus" ? "break" : "focus";
		setMode(nextMode);
		let nextIsLongBreak = false;
		let seconds = 0;
		if (nextMode === "break") {
			// when skipping from focus to break, decide if long break
			const willBe = longBreakEvery > 0 && (streak + 1) % longBreakEvery === 0;
			nextIsLongBreak = willBe;
			seconds = (willBe ? longBreakMinutes : breakMinutes) * 60;
		} else {
			seconds = focusMinutes * 60;
		}
		setIsLongBreak(nextIsLongBreak);
		setRemaining(seconds);
		if (running) {
			setEndAtMs(Date.now() + seconds * 1000);
		} else {
			setEndAtMs(null);
		}
	}

	function playBeep() {
		if (!soundEnabled) return;
		try {
			const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
			const o = ctx.createOscillator();
			const g = ctx.createGain();
			o.type = "sine";
			o.frequency.setValueAtTime(880, ctx.currentTime);
			g.gain.setValueAtTime(0.0001, ctx.currentTime);
			g.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.01);
			g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
			o.connect(g).connect(ctx.destination);
			o.start();
			o.stop(ctx.currentTime + 0.3);
		} catch {
			// ignore audio issues
		}
	}

	async function notifySessionEnd(currentMode: "focus" | "break", wasLongBreak: boolean) {
		playBeep();
		if (vibrateEnabled && "vibrate" in navigator) {
			try {
				navigator.vibrate([120, 60, 120]);
			} catch {
				// ignore vibration errors
			}
		}
		if (!desktopNotify) return;
		try {
			if (!("Notification" in window)) return;
			if (Notification.permission === "default") {
				await Notification.requestPermission();
			}
			if (Notification.permission === "granted") {
				const title = currentMode === "focus" ? "Focus session complete" : (wasLongBreak ? "Long break complete" : "Break complete");
				const body = currentMode === "focus" ? "Time for a break." : "Back to focus!";
				new Notification(title, { body });
			}
		} catch {
			// ignore notification errors
		}
	}

	const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
	const ss = (remaining % 60).toString().padStart(2, "0");

	const todayIso = format(new Date(), "yyyy-MM-dd");
	const todayStats = useMemo(() => {
		const today = sessions.filter(s => s.date === todayIso);
		const focusSec = today.filter(s => s.mode === "focus").reduce((a, b) => a + b.seconds, 0);
		const breakSec = today.filter(s => s.mode === "break").reduce((a, b) => a + b.seconds, 0);
		return { focusMin: Math.round(focusSec / 60), breakMin: Math.round(breakSec / 60), sessions: today.length };
	}, [sessions, todayIso]);

	const totalThisSession = (mode === "focus"
		? focusMinutes
		: (isLongBreak ? longBreakMinutes : breakMinutes)) * 60;
	const progress = Math.min(1, Math.max(0, 1 - remaining / Math.max(1, totalThisSession)));
	const circumference = 2 * Math.PI * 46; // r=46
	const strokeDashoffset = circumference * (1 - progress);

	// ETA text
	const etaText = running && endAtMs ? format(new Date(endAtMs), "h:mm a") : null;

	// Cycles until next long break
	const cyclesUntilLongBreak = useMemo(() => {
		if (longBreakEvery <= 0) return null;
		if (isLongBreak) return 0;
		if (mode === "focus") {
			return (longBreakEvery - ((streak % longBreakEvery) + 1));
		}
		// on short break, next focus will increment streak
		return (longBreakEvery - (streak % longBreakEvery));
	}, [mode, streak, longBreakEvery, isLongBreak]);

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			const target = e.target as HTMLElement | null;
			const isTyping = target && (["INPUT","TEXTAREA"].includes(target.tagName) || (target as any).isContentEditable);
			if (isTyping) return;
			if (e.code === "Space") {
				e.preventDefault();
				running ? pause() : start();
			}
			if (e.key.toLowerCase() === "r") {
				e.preventDefault();
				reset();
			}
			if (e.key.toLowerCase() === "n") {
				e.preventDefault();
				skip();
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [running]);

	// Optionally pause when the tab/window becomes hidden to avoid accidental overruns
	useEffect(() => {
		function onVisibility() {
			if (pauseOnHide && document.hidden && running) {
				pause();
			}
		}
		document.addEventListener("visibilitychange", onVisibility);
		return () => document.removeEventListener("visibilitychange", onVisibility);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pauseOnHide, running]);

	function exportCsv() {
		const header = ["date","mode","seconds","minutes","task"].join(",");
		const rows = sessions
			.slice()
			.reverse()
			.map(s => [
				s.date,
				s.mode,
				s.seconds,
				Math.round(s.seconds / 60),
				(tasks.find(t => t.id === s.taskId)?.title || "")
			].join(","));
		const csv = [header, ...rows].join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `pomodoro_sessions_${todayIso}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	return (
		<div className="card p-4 animate-fade-in">
			<div className="flex items-center justify-between mb-3">
				<h3 className="section-title">Pomodoro</h3>
				<div className="text-sm text-ink-400">{todayStats.focusMin} min focus today</div>
			</div>
			<div className="grid md:grid-cols-[1fr_auto_auto] gap-3 items-center">
				<div className="flex items-center gap-3">
					<div className="relative h-20 w-20 grid place-items-center">
						<svg viewBox="0 0 100 100" className="absolute inset-0">
							<circle cx="50" cy="50" r="46" stroke="#eee" strokeWidth="6" fill="none" />
							<circle
								cx="50"
								cy="50"
								r="46"
								stroke={mode === "focus" ? "#ef4444" : (isLongBreak ? "#3b82f6" : "#f59e0b")}
								strokeWidth="6"
								fill="none"
								strokeDasharray={circumference}
								strokeDashoffset={strokeDashoffset}
								strokeLinecap="round"
								transform="rotate(-90 50 50)"
							/>
						</svg>
						<div className="text-xl font-semibold tabular-nums">{mm}:{ss}</div>
					</div>
					<span className={mode === "focus" ? "badge-red" : (isLongBreak ? "badge-blue" : "badge-amber")}>
						{mode === "focus" ? "Focus" : (isLongBreak ? "Long break" : "Break")}
					</span>
					{etaText && (
						<div className="text-xs text-ink-500">ETA {etaText}</div>
					)}
				</div>
				<div className="flex items-center gap-2">
					<label className="text-sm text-ink-500">Focus</label>
					<input className="input w-20" type="number" min={5} max={120} value={focusMinutes} onChange={e => setFocusMinutes(Math.max(5, Math.min(120, Number(e.target.value) || 0)))} />
					<label className="text-sm text-ink-500">Break</label>
					<input className="input w-20" type="number" min={1} max={60} value={breakMinutes} onChange={e => setBreakMinutes(Math.max(1, Math.min(60, Number(e.target.value) || 0)))} />
				</div>
				<div className="flex gap-2">
					{!running ? (
						<button className="btn-primary" onClick={start}>Start</button>
					) : (
						<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200" onClick={pause}>Pause</button>
					)}
					<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200" onClick={reset}>Reset</button>
					<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200" onClick={skip}>Skip</button>
				</div>
			</div>
			<div className="mt-3">
				<div className="flex items-center text-sm text-ink-500">
					Today: {todayStats.sessions} sessions • {todayStats.breakMin} min break
					{cyclesUntilLongBreak !== null && cyclesUntilLongBreak !== undefined && (
						<span className="ml-2">
							• long break in {cyclesUntilLongBreak === 0 ? "next" : cyclesUntilLongBreak} focus
						</span>
					)}
				</div>
			</div>
			{/* Daily goal progress */}
			<div className="mt-3">
				<div className="flex items-center justify-between text-xs text-ink-500 mb-1">
					<div>Daily goal</div>
					<div>{Math.min(todayStats.focusMin, dailyGoalMinutes)} / {dailyGoalMinutes} min</div>
				</div>
				<div className="h-2 bg-sand-200 rounded-md overflow-hidden">
					<div
						className="h-full bg-ink-900"
						style={{ width: `${Math.min(100, Math.round((todayStats.focusMin / Math.max(1, dailyGoalMinutes)) * 100))}%` }}
					/>
				</div>
			</div>
			{/* Settings and actions */}
			<div className="mt-4 flex flex-wrap gap-2">
				<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200" onClick={() => setShowSettings(v => !v)}>
					{showSettings ? "Close settings" : "Settings"}
				</button>
				<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200" onClick={exportCsv}>
					Export CSV
				</button>
			</div>
			{showSettings && (
				<div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
					<div className="flex items-center gap-2">
						<label className="text-sm text-ink-500">Long break</label>
						<input className="input w-20" type="number" min={5} max={60} value={longBreakMinutes} onChange={e => setLongBreakMinutes(Math.max(5, Math.min(60, Number(e.target.value) || 0)))} />
						<label className="text-sm text-ink-500">every</label>
						<input className="input w-20" type="number" min={1} max={12} value={longBreakEvery} onChange={e => setLongBreakEvery(Math.max(1, Math.min(12, Number(e.target.value) || 0)))} />
						<span className="text-sm text-ink-500">focus cycles</span>
					</div>
					<label className="flex items-center gap-2 text-sm">
						<input type="checkbox" checked={autoStartNext} onChange={e => setAutoStartNext(e.target.checked)} />
						Auto-start next session
					</label>
					<label className="flex items-center gap-2 text-sm">
						<input type="checkbox" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} />
						Sound alert
					</label>
					<label className="flex items-center gap-2 text-sm">
						<input type="checkbox" checked={vibrateEnabled} onChange={e => setVibrateEnabled(e.target.checked)} />
						Vibration
					</label>
					<label className="flex items-center gap-2 text-sm">
						<input type="checkbox" checked={pauseOnHide} onChange={e => setPauseOnHide(e.target.checked)} />
						Pause when tab hidden
					</label>
					<label className="flex items-center gap-2 text-sm">
						<input type="checkbox" checked={desktopNotify} onChange={e => setDesktopNotify(e.target.checked)} />
						Desktop notification
					</label>
					<div className="flex items-center gap-2">
						<label className="text-sm text-ink-500">Daily goal</label>
						<input className="input w-24" type="number" min={15} max={600} value={dailyGoalMinutes} onChange={e => setDailyGoalMinutes(Math.max(15, Math.min(600, Number(e.target.value) || 0)))} />
						<span className="text-sm text-ink-500">min</span>
					</div>
					<div className="text-xs text-ink-400">
						Shortcuts: Space start/pause • r reset • n skip
					</div>
				</div>
			)}
		</div>
	);
}


