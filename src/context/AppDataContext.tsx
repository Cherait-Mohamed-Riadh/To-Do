import {
	createContext,
	useCallback,
	useContext,
	useMemo
} from "react";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
	Note,
	Page,
	Task,
	TaskCategory,
	TaskPriority,
	TaskStatus,
	User,
	Workspace,
	WorkspaceMember
} from "../types";
import {
	defaultNotes,
	defaultPages,
	defaultTasks,
	defaultUser,
	defaultWorkspace,
	defaultWorkspaceMember
} from "../data/defaultData";
import { createId } from "../utils/id";
import { runAutomations } from "../utils/automations";

type CreateTaskInput = {
	workspaceId: string;
	pageId: string;
	title: string;
	status?: TaskStatus;
	category?: TaskCategory;
	priority?: TaskPriority;
	dueDate?: string;
	dueTime?: string;
	notes?: string;
	tags?: string[];
	orderIndex?: number;
	estimatedMinutes?: number;
	assigneeId?: string;
};

type UpdateTaskInput = Partial<Omit<Task, "id" | "workspaceId" | "pageId" | "createdAt">>;

type CreateNoteInput = {
	workspaceId: string;
	pageId: string;
	content: string;
	date?: string;
};

type AppDataContextValue = {
	user: User;
	workspaces: Workspace[];
	workspaceMembers: WorkspaceMember[];
	pages: Page[];
	tasks: Task[];
	notes: Note[];
	activeWorkspaceId: string;
	activePageId: string;
	setActiveWorkspace: (workspaceId: string) => void;
	setActivePage: (pageId: string) => void;
	createTask: (input: CreateTaskInput) => Task;
	updateTask: (taskId: string, changes: UpdateTaskInput) => void;
	removeTask: (taskId: string) => void;
	replaceTasks: (tasks: Task[]) => void;
	createNote: (input: CreateNoteInput) => Note;
	removeNote: (noteId: string) => void;
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

const STORAGE_KEYS = {
	user: "app.user",
	workspaces: "app.workspaces",
	workspaceMembers: "app.workspaceMembers",
	pages: "app.pages",
	tasks: "app.tasks",
	notes: "app.notes",
	activeWorkspaceId: "app.activeWorkspaceId",
	activePageId: "app.activePageId"
} as const;

function ensureActiveWorkspace(
	workspaceId: string | undefined,
	workspaces: Workspace[]
): string {
	if (workspaceId && workspaces.some(ws => ws.id === workspaceId)) {
		return workspaceId;
	}
	return workspaces[0]?.id ?? "";
}

function ensureActivePage(
	pageId: string | undefined,
	workspaces: Workspace[],
	pages: Page[],
	workspaceId: string
): string {
	const candidates = pages.filter(p => p.workspaceId === workspaceId);
	if (pageId && candidates.some(p => p.id === pageId)) {
		return pageId;
	}
	return candidates[0]?.id ?? "";
}

export function AppDataProvider({ children }: { children: ReactNode }) {
	const [user] = useLocalStorage<User>(STORAGE_KEYS.user, defaultUser);
	const [workspaces] = useLocalStorage<Workspace[]>(STORAGE_KEYS.workspaces, [defaultWorkspace]);
	const [workspaceMembers] = useLocalStorage<WorkspaceMember[]>(
		STORAGE_KEYS.workspaceMembers,
		[defaultWorkspaceMember]
	);
	const [pages] = useLocalStorage<Page[]>(STORAGE_KEYS.pages, defaultPages);
	const [tasks, setTasks] = useLocalStorage<Task[]>(STORAGE_KEYS.tasks, defaultTasks);
	const [notes, setNotes] = useLocalStorage<Note[]>(STORAGE_KEYS.notes, defaultNotes);
	const [storedWorkspaceId, setStoredWorkspaceId] = useLocalStorage<string>(
		STORAGE_KEYS.activeWorkspaceId,
		defaultWorkspace.id
	);
	const [storedPageId, setStoredPageId] = useLocalStorage<string>(
		STORAGE_KEYS.activePageId,
		defaultPages[0]?.id ?? ""
	);

	const activeWorkspaceId = useMemo(
		() => ensureActiveWorkspace(storedWorkspaceId, workspaces),
		[storedWorkspaceId, workspaces]
	);

	const activePageId = useMemo(
		() => ensureActivePage(storedPageId, workspaces, pages, activeWorkspaceId),
		[storedPageId, workspaces, pages, activeWorkspaceId]
	);

	const setActiveWorkspace = useCallback(
		(workspaceId: string) => {
			setStoredWorkspaceId(workspaceId);
			const fallbackPageId = ensureActivePage(undefined, workspaces, pages, workspaceId);
			if (fallbackPageId) {
				setStoredPageId(fallbackPageId);
			}
		},
		[pages, setStoredPageId, setStoredWorkspaceId, workspaces]
	);

	const setActivePage = useCallback(
		(pageId: string) => {
			setStoredPageId(pageId);
			const page = pages.find(p => p.id === pageId);
			if (page) {
				setStoredWorkspaceId(page.workspaceId);
			}
		},
		[pages, setStoredPageId, setStoredWorkspaceId]
	);

	const createTask = useCallback(
		(input: CreateTaskInput): Task => {
			const nowIso = new Date().toISOString();
			const createdAt = format(new Date(), "yyyy-MM-dd");
			const task: Task = {
				id: createId("task"),
				workspaceId: input.workspaceId,
				pageId: input.pageId,
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
				assigneeId: input.assigneeId,
				createdAt,
				updatedAt: nowIso
			};
			setTasks(prev => [task, ...prev]);
			return task;
		},
		[setTasks]
	);

	const updateTask = useCallback(
		(taskId: string, changes: UpdateTaskInput) => {
			const nowIso = new Date().toISOString();
			const todayIso = format(new Date(), "yyyy-MM-dd");
			const prevTask = tasks.find(t => t.id === taskId);
			setTasks(prev =>
				prev.map(task => {
					if (task.id !== taskId) return task;
					const nextStatus = (changes.status ?? task.status) as TaskStatus;
					const wasDone = task.status === "done";
					const willBeDone = nextStatus === "done";
					const completedAt =
						"completedAt" in changes
							? changes.completedAt
							: willBeDone
								? wasDone
									? task.completedAt ?? todayIso
									: todayIso
								: undefined;
					const nextTask = {
						...task,
						...changes,
						status: nextStatus,
						completedAt,
						updatedAt: nowIso,
						createdAt: task.createdAt ?? todayIso
					};
					if (prevTask) {
						runAutomations(prevTask, nextTask);
					}
					return nextTask;
				})
			);
		},
		[setTasks, tasks]
	);

	const removeTask = useCallback(
		(taskId: string) => {
			setTasks(prev => prev.filter(task => task.id !== taskId));
		},
		[setTasks]
	);

	const replaceTasks = useCallback(
		(incoming: Task[]) => {
			setTasks(
				incoming.map(task => ({
					...task,
					id: task.id ?? createId("task"),
					workspaceId: task.workspaceId ?? activeWorkspaceId,
					pageId: task.pageId ?? activePageId,
					createdAt: task.createdAt ?? format(new Date(), "yyyy-MM-dd"),
					updatedAt: task.updatedAt ?? new Date().toISOString()
				}))
			);
		},
		[activePageId, activeWorkspaceId, setTasks]
	);

	const createNote = useCallback(
		(input: CreateNoteInput): Note => {
			const note: Note = {
				id: createId("note"),
				workspaceId: input.workspaceId,
				pageId: input.pageId,
				date: input.date ?? new Date().toISOString(),
				content: input.content
			};
			setNotes(prev => [note, ...prev]);
			return note;
		},
		[setNotes]
	);

	const removeNote = useCallback(
		(noteId: string) => {
			setNotes(prev => prev.filter(note => note.id !== noteId));
		},
		[setNotes]
	);

	const value = useMemo<AppDataContextValue>(
		() => ({
			user,
			workspaces,
			workspaceMembers,
			pages,
			tasks,
			notes,
			activeWorkspaceId,
			activePageId,
			setActiveWorkspace,
			setActivePage,
			createTask,
			updateTask,
			removeTask,
			replaceTasks,
			createNote,
			removeNote
		}),
		[
			user,
			workspaces,
			workspaceMembers,
			pages,
			tasks,
			notes,
			activeWorkspaceId,
			activePageId,
			setActiveWorkspace,
			setActivePage,
			createTask,
			updateTask,
			removeTask,
			replaceTasks,
			createNote,
			removeNote
		]
	);

	return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
	const context = useContext(AppDataContext);
	if (!context) {
		throw new Error("useAppData must be used within an AppDataProvider");
	}
	return context;
}


