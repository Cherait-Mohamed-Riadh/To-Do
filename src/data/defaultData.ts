import { format } from "date-fns";
import { createId } from "../utils/id";
import {
	Note,
	Page,
	Task,
	TaskCategory,
	TaskPriority,
	User,
	Workspace,
	WorkspaceMember
} from "../types";

const todayIso = format(new Date(), "yyyy-MM-dd");
const nowIso = new Date().toISOString();

const defaultUserId = createId("user");
const defaultWorkspaceId = createId("ws");

function buildPage(
	title: string,
	slug: string,
	type: Page["type"],
	icon?: string
): Page {
	const id = createId("page");
	return {
		id,
		workspaceId: defaultWorkspaceId,
		title,
		slug,
		type,
		icon,
		orderIndex: 0,
		createdAt: nowIso,
		updatedAt: nowIso,
		parentPageId: null,
		contentJson: undefined
	};
}

function buildTask(
	title: string,
	pageId: string,
	options: {
		status?: Task["status"];
		category?: TaskCategory;
		priority?: TaskPriority;
		dueDateOffset?: number;
		dueTime?: string;
	} = {}
): Task {
	const dueDate =
		typeof options.dueDateOffset === "number"
			? format(
					new Date(Date.now() + options.dueDateOffset * 24 * 60 * 60 * 1000),
					"yyyy-MM-dd"
			  )
			: todayIso;
	return {
		id: createId("task"),
		workspaceId: defaultWorkspaceId,
		pageId,
		title,
		status: options.status ?? "todo",
		category: options.category ?? "dev",
		priority: options.priority ?? "medium",
		dueDate,
		dueTime: options.dueTime,
		createdAt: todayIso,
		updatedAt: nowIso
	};
}

const todayPage = buildPage("Today", "today", "today", "📅");
const tasksPage = buildPage("Tasks", "tasks", "tasks", "✅");
const calendarPage = buildPage("Calendar", "calendar", "calendar", "🗓️");
const notesPage = buildPage("Notes", "notes", "notes", "📝");

const orderedPages: Page[] = [todayPage, tasksPage, calendarPage, notesPage].map(
	(page, index) => ({ ...page, orderIndex: index })
);

export const defaultUser: User = {
	id: defaultUserId,
	name: "Your Name",
	email: ""
};

export const defaultWorkspace: Workspace = {
	id: defaultWorkspaceId,
	name: "Personal HQ",
	icon: "🚀",
	color: "#6366f1",
	description: "Your productivity command center",
	createdAt: nowIso,
	updatedAt: nowIso
};

export const defaultWorkspaceMember: WorkspaceMember = {
	id: createId("member"),
	workspaceId: defaultWorkspaceId,
	userId: defaultUserId,
	role: "owner",
	joinedAt: nowIso
};

export const defaultPages: Page[] = orderedPages;

// Start with no default tasks so new users see an empty list and can add their own.
export const defaultTasks: Task[] = [];

export const defaultNotes: Note[] = [
	{
		id: createId("note"),
		workspaceId: defaultWorkspaceId,
		pageId: notesPage.id,
		date: new Date().toISOString(),
		content: "Keep capturing quick learnings and wins here."
	}
];
