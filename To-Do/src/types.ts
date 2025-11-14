export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskCategory = "design" | "dev" | "meet" | "personal" | "other";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
	id: string;
	title: string;
	createdAt: string; // ISO date, when task was created
	completedAt?: string; // ISO datetime/date, when marked done
	dueDate?: string; // ISO date
	dueTime?: string; // "HH:mm"
	status: TaskStatus;
	category: TaskCategory;
	notes?: string;
	priority?: TaskPriority;
	tags?: string[];
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
	date: string; // ISO date
	content: string;
}

// --- Notion-like Pages ---
export type BlockType = "text" | "heading" | "todo" | "divider";

export interface PageBlockBase {
	id: string;
	type: BlockType;
}

export type PageBlock =
	| (PageBlockBase & { type: "text"; text: string })
	| (PageBlockBase & { type: "heading"; text: string; level?: 1 | 2 | 3 | 4 })
	| (PageBlockBase & { type: "todo"; text: string; checked?: boolean })
	| (PageBlockBase & { type: "divider" });

export interface Page {
	id: string;
	title: string;
	parentId?: string | null;
	icon?: string; // emoji/icon
	cover?: string; // optional image url
	blocks: PageBlock[];
	createdAt: string; // ISO date
	updatedAt?: string; // ISO date
}


