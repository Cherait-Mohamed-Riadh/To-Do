import { useMemo, useState } from "react";
import { Page } from "../types";

interface PageTreeProps {
  pages: Page[];
  selectedPageId: string | null;
  onSelect: (id: string) => void;
  onCreate: (title: string, parentId?: string | null) => void;
}

export default function PageTree({ pages, selectedPageId, onSelect, onCreate }: PageTreeProps) {
  const children = useMemo(() => {
    const map = new Map<string | null, Page[]>();
    pages.forEach(p => {
      const key = p.parentId ?? null;
      const arr = map.get(key) || [];
      arr.push(p);
      map.set(key, arr);
    });
    return map;
  }, [pages]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  function toggle(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const roots = children.get(null) || [];

  return (
    <ul className="space-y-1">
      {roots.map(p => (
        <TreeNode key={p.id} node={p} depth={0} childrenMap={children} expanded={expanded}
          onToggle={toggle} onSelect={onSelect} onCreate={onCreate} selectedId={selectedPageId} />
      ))}
    </ul>
  );
}

function TreeNode({ node, depth, childrenMap, expanded, onToggle, onSelect, onCreate, selectedId }:
  { node: Page; depth: number; childrenMap: Map<string | null, Page[]>; expanded: Record<string, boolean>;
    onToggle: (id: string) => void; onSelect: (id: string) => void; onCreate: (title: string, parentId?: string | null) => void; selectedId: string | null }) {
  const kids = childrenMap.get(node.id) || [];
  const isOpen = expanded[node.id] ?? true;
  return (
    <li>
      <div className="group flex items-center gap-1">
        {kids.length > 0 ? (
          <button onClick={() => onToggle(node.id)} className="text-xs text-white/60 hover:text-white/80 w-5">{isOpen ? "▾" : "▸"}</button>
        ) : (
          <span className="w-5" />
        )}
        <button onClick={() => onSelect(node.id)}
          className={`flex-1 text-left px-2 py-1.5 rounded hover:bg-white/10 text-sm ${selectedId === node.id ? "bg-white/15" : ""}`}
          style={{ paddingLeft: depth ? undefined : undefined }}
        >
          <span className="truncate inline-block max-w-full">{node.title || "Untitled"}</span>
        </button>
        <button onClick={() => onCreate("Untitled", node.id)} className="opacity-0 group-hover:opacity-100 text-xs px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/15">+
        </button>
      </div>
      {kids.length > 0 && isOpen && (
        <ul className="mt-1 pl-4 space-y-1">
          {kids.map(ch => (
            <TreeNode key={ch.id} node={ch} depth={depth + 1} childrenMap={childrenMap} expanded={expanded}
              onToggle={onToggle} onSelect={onSelect} onCreate={onCreate} selectedId={selectedId} />
          ))}
        </ul>
      )}
    </li>
  );
}
