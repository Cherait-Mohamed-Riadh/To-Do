import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import type { Task, Page, Workspace } from "../types";
import { searchAll } from "../utils/search";

export type CommandPaletteProps = {
  isOpen: boolean;
  onClose: () => void;
};

type Result =
  | { type: "action"; id: string; title: string; run: () => void }
  | { type: "page"; id: string; title: string; workspaceId: string }
  | { type: "task"; id: string; title: string; workspaceId: string; pageId: string };

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { workspaces, pages, tasks, activeWorkspaceId, setActiveWorkspace, setActivePage } = useAppData();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [isOpen, onClose]);

  const baseActions: Result[] = useMemo(() => {
    return [
      {
        type: "action",
        id: "go-today",
        title: "Go to Today (T)",
        run: () => {
          const el = document.querySelector('[title="Go to today (T)"]') as HTMLButtonElement | null;
          el?.click();
        }
      },
      {
        type: "action",
        id: "focus-search",
        title: "Focus search (/)",
        run: () => {
          const input = document.querySelector('input[aria-label="Global search"]') as HTMLInputElement | null;
          input?.focus();
        }
      }
    ];
  }, []);

  const results: Result[] = useMemo(() => {
    const q = query.trim();
    if (!q) {
      const recentPages = pages.slice(0, 8).map(p => ({ type: "page", id: p.id, title: p.title, workspaceId: p.workspaceId } as Result));
      return [...baseActions, ...recentPages];
    }
    const found = searchAll(q, { tasks, pages, workspaces });
    const pageResults: Result[] = found.pages.map(p => ({ type: "page", id: p.id, title: p.title, workspaceId: p.workspaceId }));
    const taskResults: Result[] = found.tasks.slice(0, 10).map(t => ({ type: "task", id: t.id, title: t.title, workspaceId: t.workspaceId, pageId: t.pageId }));
    return [...baseActions, ...pageResults, ...taskResults];
  }, [baseActions, pages, tasks, query, workspaces]);

  function run(result: Result) {
    if (result.type === "action") {
      result.run();
      onClose();
      return;
    }
    if (result.type === "page") {
      setActiveWorkspace(result.workspaceId);
      setActivePage(result.id);
      navigate(`/app/${result.workspaceId}/${result.id}`);
      onClose();
      return;
    }
    if (result.type === "task") {
      setActiveWorkspace(result.workspaceId);
      setActivePage(result.pageId);
      navigate(`/app/${result.workspaceId}/${result.pageId}`);
      onClose();
      return;
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mx-auto mt-24 max-w-2xl">
        <div className="card p-2">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command, page, or task…"
            className="input w-full"
            aria-label="Command palette search"
          />
          <ul className="max-h-[50vh] overflow-auto divide-y divide-sand-200 dark:divide-ink-700 mt-2">
            {results.map((r, idx) => (
              <li key={r.type + ":" + r.id + ":" + idx}>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-sand-100 dark:hover:bg-ink-700"
                  onClick={() => run(r)}
                >
                  <div className="text-sm font-medium">
                    {r.type === "action" ? "⚡ " : r.type === "page" ? "📄 " : "✅ "}{r.title}
                  </div>
                  {r.type !== "action" && (
                    <div className="text-xs text-ink-500">{r.type === "page" ? "Page" : "Task"}</div>
                  )}
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3 py-4 text-sm text-ink-500">No results</li>
            )}
          </ul>
          <div className="px-3 py-2 text-xs text-ink-500">Press Esc to close • Ctrl/Cmd+K to toggle</div>
        </div>
      </div>
    </div>
  );
}


