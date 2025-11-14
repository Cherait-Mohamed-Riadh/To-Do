import { Suspense, lazy, useCallback, useEffect, useMemo } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { format } from "date-fns";
import { useAppData } from "../context/AppDataContext";
import type { Task, TaskPriority, TaskStatus, TaskCategory } from "../types";
import type { AppLayoutOutletContext } from "../layouts/AppLayout";
import { celebrateConfetti } from "../utils/reward";

const TodayView = lazy(() => import("../components/TodayView"));
const CalendarMonth = lazy(() => import("../components/CalendarMonth"));
const WeeklySchedule = lazy(() => import("../components/WeeklySchedule"));
const TaskTypes = lazy(() => import("../components/TaskTypes"));
const Notes = lazy(() => import("../components/Notes"));
const TodoList = lazy(() => import("../components/TodoList"));
const PomodoroTimer = lazy(() => import("../components/PomodoroTimer"));
const Gamification = lazy(() => import("../components/Gamification"));
const DashboardWidgets = lazy(() => import("../components/DashboardWidgets"));
const Suggestions = lazy(() => import("../components/Suggestions"));
const TasksInProgress = lazy(() => import("../components/TasksInProgress"));
const PerformanceCharts = lazy(() => import("../components/PerformanceCharts"));
const Achievements = lazy(() => import("../components/Achievements"));
const Reports = lazy(() => import("../components/Reports"));

export default function PageViewRoute() {
	const { workspaceId: workspaceParam, pageId: pageParam } = useParams<{ workspaceId: string; pageId: string }>();
	const workspaceId = workspaceParam ?? "";
	const pageId = pageParam ?? "";
	const hasValidParams = Boolean(workspaceParam && pageParam);
	const outlet = useOutletContext<AppLayoutOutletContext>();
	const {
		workspaces,
		pages,
		tasks,
		notes,
		setActiveWorkspace,
		setActivePage,
		createTask,
		updateTask,
		removeTask,
		createNote,
		removeNote
	} = useAppData();

	if (!workspaceId || !pageId) {
		return (
			<div className="card p-6">
				<h2 className="text-lg font-semibold">Workspace or page not specified</h2>
				<p className="text-sm text-ink-500 mt-2">
					Please select a workspace and page from the sidebar to continue.
				</p>
			</div>
		);
	}

	useEffect(() => {
		if (workspaceParam) setActiveWorkspace(workspaceParam);
		if (pageParam) setActivePage(pageParam);
	}, [workspaceParam, pageParam, setActivePage, setActiveWorkspace]);

	const page = useMemo(
		() => pages.find(p => p.id === pageId && p.workspaceId === workspaceId),
		[pageId, pages, workspaceId]
	);

	const workspace = useMemo(
		() => workspaces.find(ws => ws.id === workspaceId),
		[workspaces, workspaceId]
	);

	const pageTasks = useMemo(
		() => tasks.filter(task => task.pageId === pageId && task.workspaceId === workspaceId),
		[tasks, pageId, workspaceId]
	);

	const workspaceTasks = useMemo(
		() => tasks.filter(task => task.workspaceId === workspaceId),
		[tasks, workspaceId]
	);

	const pageNotes = useMemo(
		() => notes.filter(note => note.pageId === pageId && note.workspaceId === workspaceId),
		[notes, pageId, workspaceId]
	);

	const handleCreateTask = useCallback(
		(input: {
			title: string;
			status: TaskStatus;
			category: TaskCategory;
			priority?: TaskPriority;
			dueDate?: string;
			dueTime?: string;
			notes?: string;
			tags?: string[];
			orderIndex?: number;
			estimatedMinutes?: number;
			assigneeId?: string;
		}) => {
			if (!workspaceId || !pageId) return;
			createTask({
				workspaceId,
				pageId,
				title: input.title,
				status: input.status ?? "todo",
				category: input.category ?? "other",
				priority: input.priority,
				dueDate: input.dueDate,
				dueTime: input.dueTime,
				notes: input.notes,
				tags: input.tags,
				orderIndex: input.orderIndex,
				estimatedMinutes: input.estimatedMinutes,
				assigneeId: input.assigneeId
			});
		},
		[createTask, pageId, workspaceId]
	);

	const handleUpdateTask = useCallback(
		async (task: Task) => {
			const previous = tasks.find(t => t.id === task.id);
			updateTask(task.id, task);
			if (previous?.status !== "done" && task.status === "done") {
				await celebrateConfetti();
			}
		},
		[tasks, updateTask]
	);

	const handleToggleTask = useCallback(
		async (taskId: string) => {
			const task = tasks.find(t => t.id === taskId);
			if (!task) return;
			const willBeDone = task.status !== "done";
			updateTask(taskId, { status: willBeDone ? "done" : "todo" });
			if (willBeDone) {
				await celebrateConfetti();
			}
		},
		[tasks, updateTask]
	);

	const handleMarkDone = useCallback(
		async (taskId: string) => {
			updateTask(taskId, { status: "done", completedAt: format(new Date(), "yyyy-MM-dd") });
			await celebrateConfetti();
		},
		[updateTask]
	);

	const handleRemoveTask = useCallback(
		(taskId: string) => {
			removeTask(taskId);
		},
		[removeTask]
	);

	const handleAddNote = useCallback(
		(data: { content: string; date: string; workspaceId: string; pageId: string }) => {
			createNote({
				content: data.content,
				date: data.date,
				workspaceId: data.workspaceId,
				pageId: data.pageId
			});
		},
		[createNote]
	);

	const handleRemoveNote = useCallback(
		(noteId: string) => {
			removeNote(noteId);
		},
		[removeNote]
	);

	if (!hasValidParams) {
		return (
			<div className="card p-6">
				<h2 className="text-lg font-semibold">Workspace or page not specified</h2>
				<p className="text-sm text-ink-500 mt-2">
					Please select a workspace and page from the sidebar to continue.
				</p>
			</div>
		);
	}

	if (!page || !workspace) {
		return (
			<div className="card p-6">
				<h2 className="text-lg font-semibold">Page not found</h2>
				<p className="text-sm text-ink-500 mt-2">
					The page you are looking for does not exist in this workspace.
				</p>
			</div>
		);
	}

	const { selectedDate, setSelectedDate, monthCursor, setMonthCursor, globalQuery } = outlet;

	switch (page.type) {
		case "today":
			return (
				<div className="space-y-5 animate-fade-in">
					<section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
						<div className="lg:col-span-3">
							<Suspense fallback={<div className="card p-6">Loading today…</div>}>
								<TodayView tasks={workspaceTasks} onUpdate={handleUpdateTask} />
							</Suspense>
						</div>
					</section>
					<section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
						<div className="lg:col-span-2" key={format(monthCursor, "yyyy-MM")}>
							<Suspense fallback={<div className="card p-6">Loading calendar…</div>}>
								<CalendarMonth
									monthDate={monthCursor}
									onChangeMonth={setMonthCursor}
									selectedDate={selectedDate}
									onSelectDate={setSelectedDate}
									tasks={workspaceTasks}
								/>
							</Suspense>
						</div>
						<div className="lg:col-span-1">
							<Suspense fallback={<div className="card p-6">Loading types…</div>}>
								<TaskTypes tasks={workspaceTasks} />
							</Suspense>
						</div>
					</section>
					<section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
						<div className="lg:col-span-2" key={format(selectedDate, "yyyy-'W'w")}>
							<Suspense fallback={<div className="card p-6">Loading schedule…</div>}>
								<WeeklySchedule anchorDate={selectedDate} tasks={workspaceTasks} />
							</Suspense>
						</div>
						<div className="lg:col-span-1">
							<Suspense fallback={<div className="card p-6">Loading notes…</div>}>
								<Notes
									notes={pageNotes}
									workspaceId={workspaceId}
									pageId={pageId}
									onAdd={handleAddNote}
									onRemove={handleRemoveNote}
								/>
							</Suspense>
						</div>
					</section>
					<section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
						<div className="lg:col-span-2" key={format(selectedDate, "yyyy-MM-dd")}>
							<Suspense fallback={<div className="card p-6">Loading tasks…</div>}>
								<TodoList
									tasks={pageTasks}
									onCreate={handleCreateTask}
									onUpdate={handleUpdateTask}
									onRemove={handleRemoveTask}
									selectedDate={selectedDate}
									globalQuery={globalQuery}
								/>
							</Suspense>
						</div>
					</section>
					<section className="grid gap-5">
						<Suspense fallback={<div className="card p-6">Loading pomodoro…</div>}>
							<PomodoroTimer tasks={workspaceTasks} />
						</Suspense>
						<Suspense fallback={<div className="card p-6">Loading levels…</div>}>
							<Gamification tasks={workspaceTasks} anchorDate={selectedDate} />
						</Suspense>
						<Suspense fallback={<div className="card p-6">Loading widgets…</div>}>
							<DashboardWidgets tasks={workspaceTasks} />
						</Suspense>
						<Suspense fallback={<div className="card p-6">Loading suggestions…</div>}>
							<Suggestions tasks={workspaceTasks} />
						</Suspense>
						<Suspense fallback={<div className="card p-6">Loading progress…</div>}>
							<TasksInProgress tasks={workspaceTasks} onMarkDone={handleMarkDone} />
						</Suspense>
						<Suspense fallback={<div className="card p-6">Loading charts…</div>}>
							<PerformanceCharts tasks={workspaceTasks} anchorDate={selectedDate} />
						</Suspense>
						<Suspense fallback={<div className="card p-6">Loading achievements…</div>}>
							<Achievements tasks={workspaceTasks} />
						</Suspense>
						<Suspense fallback={<div className="card p-6">Loading reports…</div>}>
							<Reports tasks={workspaceTasks} />
						</Suspense>
					</section>
				</div>
			);
		case "tasks":
			return (
				<div className="space-y-5 animate-fade-in">
					<Suspense fallback={<div className="card p-6">Loading tasks…</div>}>
						<TodoList
							tasks={pageTasks}
							onCreate={handleCreateTask}
							onUpdate={handleUpdateTask}
							onRemove={handleRemoveTask}
							selectedDate={selectedDate}
							globalQuery={globalQuery}
						/>
					</Suspense>
				</div>
			);
		case "calendar":
			return (
				<div className="space-y-5 animate-fade-in">
					<Suspense fallback={<div className="card p-6">Loading calendar…</div>}>
						<CalendarMonth
							monthDate={monthCursor}
							onChangeMonth={setMonthCursor}
							selectedDate={selectedDate}
							onSelectDate={setSelectedDate}
							tasks={workspaceTasks}
						/>
					</Suspense>
					<Suspense fallback={<div className="card p-6">Loading weekly schedule…</div>}>
						<WeeklySchedule anchorDate={selectedDate} tasks={workspaceTasks} />
					</Suspense>
				</div>
			);
		case "notes":
			return (
				<div className="space-y-5 animate-fade-in">
					<Suspense fallback={<div className="card p-6">Loading notes…</div>}>
						<Notes
							notes={pageNotes}
							workspaceId={workspaceId}
							pageId={pageId}
							onAdd={handleAddNote}
							onRemove={handleRemoveNote}
						/>
					</Suspense>
				</div>
			);
		case "dashboard":
			return (
				<div className="space-y-5 animate-fade-in">
					<Suspense fallback={<div className="card p-6">Loading widgets…</div>}>
						<DashboardWidgets tasks={workspaceTasks} />
					</Suspense>
					<Suspense fallback={<div className="card p-6">Loading charts…</div>}>
						<PerformanceCharts tasks={workspaceTasks} anchorDate={selectedDate} />
					</Suspense>
					<Suspense fallback={<div className="card p-6">Loading achievements…</div>}>
						<Achievements tasks={workspaceTasks} />
					</Suspense>
					<Suspense fallback={<div className="card p-6">Loading reports…</div>}>
						<Reports tasks={workspaceTasks} />
					</Suspense>
				</div>
			);
		case "weekly":
			return (
				<div className="space-y-5 animate-fade-in">
					<Suspense fallback={<div className="card p-6">Loading weekly schedule…</div>}>
						<WeeklySchedule anchorDate={selectedDate} tasks={workspaceTasks} />
					</Suspense>
					<Suspense fallback={<div className="card p-6">Loading in-progress tasks…</div>}>
						<TasksInProgress tasks={workspaceTasks} onMarkDone={handleMarkDone} />
					</Suspense>
				</div>
			);
		case "reports":
			return (
				<div className="space-y-5 animate-fade-in">
					<Suspense fallback={<div className="card p-6">Loading reports…</div>}>
						<Reports tasks={workspaceTasks} />
					</Suspense>
				</div>
			);
		default:
			return (
				<div className="card p-6 space-y-3">
					<h2 className="text-lg font-semibold">{page.title}</h2>
					<p className="text-sm text-ink-500">
						This page type does not have a custom view yet. Tasks created here will still show up in the
						database and other filtered views.
					</p>
					<Suspense fallback={<div className="card p-6">Loading tasks…</div>}>
						<TodoList
							tasks={pageTasks}
							onCreate={handleCreateTask}
							onUpdate={handleUpdateTask}
							onRemove={handleRemoveTask}
							selectedDate={selectedDate}
							globalQuery={globalQuery}
						/>
					</Suspense>
				</div>
			);
	}
}
