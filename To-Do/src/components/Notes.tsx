import { useMemo, useState } from "react";
import { Note } from "../types";

type Props = {
	notes: Note[];
	onAdd: (n: Omit<Note, "id">) => void;
	onRemove: (id: string) => void;
	onUpdate: (note: Note) => void;
};

export default function Notes({ notes, onAdd, onRemove, onUpdate }: Props) {
	const [content, setContent] = useState("");
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState<"newest" | "oldest">("newest");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingContent, setEditingContent] = useState("");

	function add() {
		const c = content.trim();
		if (!c) return;
		onAdd({ content: c, date: new Date().toISOString() });
		setContent("");
	}

	function startEdit(n: Note) {
		setEditingId(n.id);
		setEditingContent(n.content);
	}

	function saveEdit(n: Note) {
		const c = editingContent.trim();
		if (!c) {
			// empty means delete
			onRemove(n.id);
			setEditingId(null);
			return;
		}
		onUpdate({ ...n, content: c, date: n.date });
		setEditingId(null);
	}

	function cancelEdit() {
		setEditingId(null);
		setEditingContent("");
	}

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		let list = q ? notes.filter(n => n.content.toLowerCase().includes(q)) : notes;
		list = [...list].sort((a, b) => {
			const da = new Date(a.date).getTime();
			const db = new Date(b.date).getTime();
			return sort === "newest" ? db - da : da - db;
		});
		return list;
	}, [notes, query, sort]);

	return (
		<div className="card p-4 h-full flex flex-col animate-fade-in">
			<div className="flex items-center justify-between mb-3">
				<h3 className="section-title">Notes</h3>
				<div className="flex items-center gap-2">
					<input
						value={query}
						onChange={e => setQuery(e.target.value)}
						className="input hidden sm:block sm:w-56"
						placeholder="Search notes…"
						aria-label="Search notes"
					/>
					<select className="input sm:w-36" value={sort} onChange={e => setSort(e.target.value as any)} aria-label="Sort notes">
						<option value="newest">Newest first</option>
						<option value="oldest">Oldest first</option>
					</select>
				</div>
			</div>
			<textarea
				value={content}
				onChange={e => setContent(e.target.value)}
				className="input min-h-[90px] resize-vertical"
				placeholder="Write a note..."
			/>
			<div className="mt-2">
				<button className="btn-primary" onClick={add}>Save note</button>
			</div>
			<ul className="mt-4 divide-y divide-sand-200 overflow-auto">
				{filtered.map(n => (
					<li key={n.id} className="py-3">
						<div className="text-xs text-ink-400">{new Date(n.date).toLocaleString()}</div>
						{editingId === n.id ? (
							<div className="mt-2">
								<textarea
									value={editingContent}
									onChange={e => setEditingContent(e.target.value)}
									className="input min-h-[90px]"
									aria-label="Edit note"
								/>
								<div className="mt-2 flex gap-2">
									<button className="btn-primary" onClick={() => saveEdit(n)}>Save</button>
									<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200" onClick={cancelEdit}>Cancel</button>
								</div>
							</div>
						) : (
							<>
								<div className="whitespace-pre-wrap">{n.content}</div>
								<div className="mt-2 flex gap-2 flex-wrap">
									<button className="btn bg-sand-100 text-ink-700 hover:bg-sand-200" onClick={() => startEdit(n)}>Edit</button>
									<button
										className="btn bg-sand-100 text-ink-700 hover:bg-sand-200"
										onClick={async () => {
											try {
												await (navigator as any)?.clipboard?.writeText(n.content);
												alert("Note copied to clipboard.");
											} catch {
												window.prompt("Copy note:", n.content);
											}
										}}
									>
										Copy
									</button>
									<button className="btn bg-red-100 text-red-700 hover:bg-red-200" onClick={() => onRemove(n.id)}>Delete</button>
								</div>
							</>
						)}
					</li>
				))}
				{filtered.length === 0 && <li className="py-6 text-center text-ink-400">No matching notes.</li>}
			</ul>
		</div>
	);
}


