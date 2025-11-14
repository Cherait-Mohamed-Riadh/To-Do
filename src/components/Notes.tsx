import { useCallback, useMemo, useRef, useState } from "react";
import { Note } from "../types";

type Props = {
	notes: Note[];
	workspaceId: string;
	pageId: string;
	onAdd: (n: Omit<Note, "id">) => void;
	onRemove: (id: string) => void;
};

type Mode = "edit" | "preview";

function escapeHtml(str: string) {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

// Very small Markdown renderer (headings, bold, italic, inline code, lists, checkboxes, links)
function renderMarkdown(md: string) {
	const escaped = escapeHtml(md);
	// line-wise transforms
	const lines = escaped.split(/\n/).map(line => {
		// checkboxes
		line = line.replace(/^\s*\- \[ \] /, '<input type="checkbox" disabled /> ');
		line = line.replace(/^\s*\- \[x\] /i, '<input type="checkbox" checked disabled /> ');
		// headings
		if (/^######\s+/.test(line)) return `<h6>${line.replace(/^######\s+/, "")}</h6>`;
		if (/^#####\s+/.test(line)) return `<h5>${line.replace(/^#####\s+/, "")}</h5>`;
		if (/^####\s+/.test(line)) return `<h4>${line.replace(/^####\s+/, "")}</h4>`;
		if (/^###\s+/.test(line)) return `<h3>${line.replace(/^###\s+/, "")}</h3>`;
		if (/^##\s+/.test(line)) return `<h2>${line.replace(/^##\s+/, "")}</h2>`;
		if (/^#\s+/.test(line)) return `<h1>${line.replace(/^#\s+/, "")}</h1>`;
		// unordered list
		if (/^\s*[-*]\s+/.test(line)) return `<li>${line.replace(/^\s*[-*]\s+/, "")}</li>`;
		return `<p>${line}</p>`;
	});
	let html = lines.join("\n");
	// wrap consecutive <li> in <ul>
	html = html.replace(/(?:<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
	// inline styles
	html = html
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
		.replace(/`([^`]+?)`/g, "<code>$1</code>")
		.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1<\/a>');
	return html;
}

export default function Notes({ notes, workspaceId, pageId, onAdd, onRemove }: Props) {
	const [content, setContent] = useState("");
	const [mode, setMode] = useState<Mode>("edit");
	const taRef = useRef<HTMLTextAreaElement | null>(null);

	const previewHtml = useMemo(() => renderMarkdown(content || "اكتب ملاحظة…"), [content]);

	const insert = useCallback((before: string, after: string = "") => {
		const el = taRef.current;
		if (!el) return;
		const start = el.selectionStart ?? el.value.length;
		const end = el.selectionEnd ?? el.value.length;
		const selected = el.value.slice(start, end);
		const next = el.value.slice(0, start) + before + selected + after + el.value.slice(end);
		setContent(next);
		// restore selection roughly after insertion
		setTimeout(() => {
			el.focus();
			const caret = start + before.length + selected.length + after.length;
			el.selectionStart = el.selectionEnd = caret;
		}, 0);
	}, []);

	const add = useCallback(() => {
		const c = content.trim();
		if (!c) return;
		onAdd({
			content: c,
			date: new Date().toISOString(),
			workspaceId,
			pageId
		});
		setContent("");
		setMode("edit");
	}, [content, onAdd, pageId, workspaceId]);

	const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") {
			e.preventDefault();
			add();
		}
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
			e.preventDefault();
			insert("**", "**");
		}
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
			e.preventDefault();
			insert("*", "*");
		}
	}, [add, insert]);

	return (
		<div className="card p-4 h-full flex flex-col animate-fade-in">
			<div className="flex items-center justify-between mb-3">
				<h3 className="section-title">Notes</h3>
			</div>

			{/* Toolbar */}
			<div className="flex justify-end mb-2">
				<div className="flex gap-1">
					<button
						className={`btn ${mode === "edit" ? "btn-primary" : "btn-outline"}`}
						onClick={() => setMode("edit")}
					>
						Edit
					</button>
					<button
						className={`btn ${mode === "preview" ? "btn-primary" : "btn-outline"}`}
						onClick={() => setMode("preview")}
					>
						Preview
					</button>
				</div>
			</div>

			{mode === "edit" ? (
				<textarea
					ref={taRef}
					value={content}
					onChange={e => setContent(e.target.value)}
					onKeyDown={onKeyDown}
					className="input min-h-[140px] resize-vertical font-mono"
					placeholder="Write a note with Markdown… (Ctrl/Cmd+Enter to save)"
				/>
			) : (
				<div className="rounded-lg border border-sand-300 p-3 dark:border-ink-600 bg-white dark:bg-ink-700 min-h-[140px] prose prose-sm max-w-none dark:prose-invert">
					<div dangerouslySetInnerHTML={{ __html: previewHtml }} />
				</div>
			)}

			<div className="mt-2">
				<button className="btn-primary" onClick={add}>Save note</button>
			</div>

			<ul className="mt-4 divide-y divide-sand-200 overflow-auto">
				{notes.map(n => (
					<li key={n.id} className="py-3">
						<div className="text-xs text-ink-400">{new Date(n.date).toLocaleString()}</div>
						<div className="mt-1 prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: renderMarkdown(n.content) }} />
						<button className="btn bg-red-100 text-red-700 hover:bg-red-200 mt-2" onClick={() => onRemove(n.id)}>Delete</button>
					</li>
				))}
				{notes.length === 0 && <li className="py-6 text-center text-ink-400">No notes yet.</li>}
			</ul>
		</div>
	);
}

