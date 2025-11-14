import { Page, PageBlock } from "../types";
import { useState } from "react";

interface PageEditorProps {
  page: Page;
  // Provide explicit block shapes to satisfy TS for discriminated union
  onAddBlock: (
    pageId: string,
    block:
      | { type: 'text'; text: string }
      | { type: 'heading'; text: string; level?: 1 | 2 | 3 | 4 }
      | { type: 'todo'; text: string; checked?: boolean }
      | { type: 'divider' }
  ) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onToggleTodo: (pageId: string, blockId: string) => void;
  onUpdateText: (pageId: string, blockId: string, text: string) => void;
  onRemoveBlock: (pageId: string, blockId: string) => void;
}

export default function PageEditor({ page, onAddBlock, onUpdateTitle, onToggleTodo, onUpdateText, onRemoveBlock }: PageEditorProps) {
  const [titleDraft, setTitleDraft] = useState(page.title);
  const [newText, setNewText] = useState("");

  function commitTitle() {
    if (titleDraft.trim() !== page.title) onUpdateTitle(page.id, titleDraft.trim());
  }

  function addTextBlock() {
    if (!newText.trim()) return;
    onAddBlock(page.id, { type: 'text', text: newText.trim() });
    setNewText("");
  }

  function addHeading() {
    if (!newText.trim()) return;
  onAddBlock(page.id, { type: 'heading', text: newText.trim(), level: 2 });
    setNewText("");
  }

  function addTodo() {
    if (!newText.trim()) return;
  onAddBlock(page.id, { type: 'todo', text: newText.trim(), checked: false });
    setNewText("");
  }

  function addDivider() {
    onAddBlock(page.id, { type: 'divider' });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <input
          value={titleDraft}
          onChange={e => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          placeholder="Page title"
          className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none border-b border-transparent focus:border-brand-600 pb-2"
        />
        <div className="text-xs text-ink-600 dark:text-ink-300 mt-1">Updated {page.updatedAt || page.createdAt}</div>
      </div>

      <div className="space-y-4 mb-8">
        {page.blocks.map(b => {
          if (b.type === "heading") {
            const Tag = b.level === 1 ? "h1" : b.level === 2 ? "h2" : b.level === 3 ? "h3" : "h4";
            return (
              <div key={b.id} className="group relative">
                <Tag className="font-semibold text-xl tracking-tight">
                  <EditableInline value={b.text} onChange={t => onUpdateText(page.id, b.id, t)} />
                </Tag>
                <RemoveButton onClick={() => onRemoveBlock(page.id, b.id)} />
              </div>
            );
          }
          if (b.type === "text") {
            return (
              <div key={b.id} className="group relative">
                <p className="leading-relaxed">
                  <EditableInline value={b.text} onChange={t => onUpdateText(page.id, b.id, t)} />
                </p>
                <RemoveButton onClick={() => onRemoveBlock(page.id, b.id)} />
              </div>
            );
          }
          if (b.type === "todo") {
            return (
              <div key={b.id} className="group relative flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={b.checked}
                  onChange={() => onToggleTodo(page.id, b.id)}
                  className="mt-1 h-5 w-5 rounded border-ink-300 dark:border-ink-600 bg-transparent"
                />
                <div className={`flex-1 ${b.checked ? "line-through text-ink-400 dark:text-ink-300" : ""}`}>
                  <EditableInline value={b.text} onChange={t => onUpdateText(page.id, b.id, t)} />
                </div>
                <RemoveButton onClick={() => onRemoveBlock(page.id, b.id)} />
              </div>
            );
          }
          if (b.type === "divider") {
            return (
              <div key={b.id} className="group relative">
                <hr className="border-t border-ink-200 dark:border-ink-600" />
                <RemoveButton onClick={() => onRemoveBlock(page.id, b.id)} />
              </div>
            );
          }
          return null;
        })}
      </div>

      <div className="space-y-2">
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Type to add block…"
          className="w-full rounded-md bg-white/60 dark:bg-ink-700 px-3 py-2 text-sm placeholder:text-ink-500 dark:placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-600 dark:focus:ring-brand-400"
        />
        <div className="flex flex-wrap gap-2">
          <button onClick={addTextBlock} className="btn-outline text-xs">Text</button>
          <button onClick={addHeading} className="btn-outline text-xs">Heading</button>
          <button onClick={addTodo} className="btn-outline text-xs">Todo</button>
          <button onClick={addDivider} className="btn-outline text-xs">Divider</button>
        </div>
      </div>
    </div>
  );
}

function EditableInline({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      onInput={e => setDraft((e.target as HTMLElement).innerText)}
      onBlur={() => { if (draft !== value) onChange(draft); }}
      className="outline-none focus:ring-2 focus:ring-brand-600/40 rounded-sm"
    >
      {value}
    </span>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-ink-400 hover:text-red-600 dark:hover:text-red-300"
      title="Remove block"
    >
      ×
    </button>
  );
}
