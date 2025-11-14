export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskCategory = "design" | "dev" | "meet" | "personal" | "other";
export type TaskPriority = "low" | "medium" | "high";

export type PageType =
	| "today"
	| "tasks"
	| "calendar"
	| "notes"
	| "dashboard"
	| "weekly"
	| "reports"
	| "custom";

export interface User {
	id: string;
	name: string;
	email?: string;
	avatarUrl?: string;
}

export interface Workspace {
	id: string;
	name: string;
	icon?: string;
	color?: string;
	description?: string;
	createdAt: string;
	updatedAt: string;
}

export type WorkspaceRole = "owner" | "editor" | "viewer";

export interface WorkspaceMember {
	id: string;
	workspaceId: string;
	userId: string;
	role: WorkspaceRole;
	joinedAt: string;
}

export interface Page {
	id: string;
	workspaceId: string;
	title: string;
	slug: string;
	icon?: string;
	parentPageId?: string | null;
	type: PageType;
	orderIndex?: number;
	coverImageUrl?: string;
	createdAt: string;
	updatedAt: string;
	contentJson?: string; // full Tiptap doc JSON string
}

export interface Task {
	id: string;
	workspaceId: string;
	pageId: string;
	title: string;
	createdAt: string; // ISO date, when task was created
	updatedAt?: string;
	completedAt?: string; // ISO datetime/date, when marked done
	dueDate?: string; // ISO date
	dueTime?: string; // "HH:mm"
	status: TaskStatus;
	category: TaskCategory;
	notes?: string;
	priority?: TaskPriority;
	tags?: string[];
	orderIndex?: number; // optional manual sort index, smaller first
	estimatedMinutes?: number;
	assigneeId?: string;
}

export interface Tag {
	id: string;
	label: string;
	color?: string;
	workspaceId: string;
	createdAt: string;
	updatedAt: string;
}

export type ExpenseCategory = "daily" | "monthly" | "misc";
export interface Expense {
	id: string;
	date: string; // ISO date
	amount: number;
	category: ExpenseCategory;
	note?: string;
}

export interface Note {
	id: string;
	workspaceId: string;
	pageId: string;
	date: string; // ISO date
	content: string;
}

