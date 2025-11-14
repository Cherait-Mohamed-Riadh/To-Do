import { memo, useMemo, useState } from "react";
import type { Task, TaskStatus } from "../types";

type Props = {
  tasks: Task[];
  onUpdate: (task: Task) => void;
};

const columns: { key: TaskStatus; title: string }[] = [
  { key: "todo", title: "To do" },
  { key: "in-progress", title: "In progress" },
  { key: "done", title: "Done" }
];

function BoardView({ tasks, onUpdate }: Props) {
  const byStatus = useMemo(() => {
    return columns.map(c => ({
      status: c.key,
      title: c.title,
      items: tasks.filter(t => t.status === c.key)
    }));
  }, [tasks]);

  const [dragId, setDragId] = useState<string | null>(null);

  function onDropStatus(status: TaskStatus) {
    if (!dragId) return;
    const task = tasks.find(t => t.id === dragId);
    if (!task || task.status === status) return;
    onUpdate({ ...task, status });
    setDragId(null);
  }

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="section-title">Board view</h3>
        <div className="text-xs text-ink-500">Drag tasks between columns</div>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {byStatus.map(col => (
          <div
            key={col.status}
            className="rounded-lg bg-sand-100 dark:bg-ink-700 p-2 min-h-[240px]"
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDropStatus(col.status as TaskStatus)}
          >
            <div className="font-medium text-sm mb-2">{col.title} <span className="text-ink-500">({col.items.length})</span></div>
            <div className="space-y-2">
              {col.items.map(item => (
                <div
                  key={item.id}
                  className="p-2 rounded bg-white dark:bg-ink-800 border border-sand-200 dark:border-ink-600 cursor-move"
                  draggable
                  onDragStart={() => setDragId(item.id)}
                >
                  <div className="text-sm font-medium truncate">{item.title}</div>
                  <div className="text-xs text-ink-500 truncate">
                    {(item.tags ?? []).slice(0,3).join(", ")}
                    {item.dueDate ? (item.tags?.length ? " • " : "") + item.dueDate : ""}
                  </div>
                </div>
              ))}
              {col.items.length === 0 && (
                <div className="text-xs text-ink-400 text-center py-6">No tasks</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(BoardView);

