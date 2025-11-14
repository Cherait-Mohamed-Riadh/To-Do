import { memo } from "react";
import type { Task, TaskPriority, TaskStatus } from "../types";
import { format, parseISO } from "date-fns";
import { clsx } from "clsx";

type Props = {
  tasks: Task[];
  onUpdate: (task: Task) => void;
  onRemove: (id: string) => void;
};

const statusOrder: TaskStatus[] = ["todo", "in-progress", "done"];
const priorityOrder: TaskPriority[] = ["high", "medium", "low"];

function cycle<T>(arr: T[], current: T): T {
  const idx = arr.indexOf(current);
  const next = (idx + 1) % arr.length;
  return arr[next];
}

function StatusPill({ value, onChange }: { value: TaskStatus; onChange: (v: TaskStatus) => void }) {
  return (
    <button
      className={clsx(
        "px-2 py-1 rounded-full text-xs font-medium border transition-colors",
        value === "todo" && "bg-sand-100 border-sand-200 text-ink-700 dark:bg-ink-700 dark:border-ink-600 dark:text-ink-50",
        value === "in-progress" && "bg-amber-100 border-amber-200 text-amber-800 dark:bg-amber-400/10 dark:border-amber-400/20 dark:text-amber-300",
        value === "done" && "bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-400/10 dark:border-emerald-400/20 dark:text-emerald-300"
      )}
      onClick={() => onChange(cycle(statusOrder, value))}
      title="Click to change status"
    >
      {value === "todo" ? "Todo" : value === "in-progress" ? "In progress" : "Done"}
    </button>
  );
}

function PriorityChip({ value, onChange }: { value: TaskPriority; onChange: (v: TaskPriority) => void }) {
  return (
    <button
      className={clsx(
        "px-2 py-1 rounded-full text-xs font-medium border transition-colors",
        value === "high" && "bg-red-100 border-red-200 text-red-700 dark:bg-red-400/10 dark:border-red-400/20 dark:text-red-300",
        value === "medium" && "bg-amber-100 border-amber-200 text-amber-800 dark:bg-amber-400/10 dark:border-amber-400/20 dark:text-amber-300",
        value === "low" && "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-400/10 dark:border-slate-400/20 dark:text-slate-300"
      )}
      onClick={() => onChange(cycle(priorityOrder, value))}
      title="Click to change priority"
    >
      {value}
    </button>
  );
}

function ProTableView({ tasks, onUpdate, onRemove }: Props) {
  return (
    <div className="card p-0 overflow-x-auto">
      <div className="px-4 py-3 border-b border-sand-200 dark:border-ink-700 flex items-center justify-between">
        <h3 className="section-title m-0">Board (Table) view</h3>
        <div className="text-xs text-ink-500">تصميم مستوحى من Monday.com</div>
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-sand-100 dark:bg-ink-800 text-ink-600 dark:text-ink-200">
          <tr>
            <th className="text-left px-4 py-2 w-[40%]">Item</th>
            <th className="text-left px-4 py-2">Owner</th>
            <th className="text-left px-4 py-2">Status</th>
            <th className="text-left px-4 py-2">Priority</th>
            <th className="text-left px-4 py-2">Due date</th>
            <th className="text-left px-4 py-2">Tags</th>
            <th className="text-right px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr key={task.id} className="border-t border-sand-200 dark:border-ink-700 hover:bg-sand-50 dark:hover:bg-ink-800/60">
              <td className="px-4 py-2">
                <input
                  className="input !bg-transparent !border-transparent px-0 py-1 w-full"
                  value={task.title}
                  onChange={e => onUpdate({ ...task, title: e.target.value })}
                />
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-indigo-500 text-white grid place-items-center text-[11px]">
                    {task.assigneeId ? task.assigneeId.slice(0, 2).toUpperCase() : "--"}
                  </div>
                  <div className="text-xs text-ink-500">
                    {task.assigneeId ? task.assigneeId : "Unassigned"}
                  </div>
                  <button
                    className="btn bg-sand-100 text-ink-700 hover:bg-sand-200 dark:bg-ink-700 dark:text-ink-50 dark:hover:bg-ink-600 px-2 py-1 text-xs"
                    onClick={() => onUpdate({ ...task, assigneeId: task.assigneeId ? undefined : "me" })}
                  >
                    {task.assigneeId ? "Clear" : "Assign me"}
                  </button>
                </div>
              </td>
              <td className="px-4 py-2">
                <StatusPill value={task.status} onChange={(v) => onUpdate({ ...task, status: v, completedAt: v === "done" ? new Date().toISOString() : undefined })} />
              </td>
              <td className="px-4 py-2">
                <PriorityChip value={task.priority ?? "medium"} onChange={(v) => onUpdate({ ...task, priority: v })} />
              </td>
              <td className="px-4 py-2">
                <input
                  type="date"
                  className="input !bg-transparent !border-transparent px-0 py-1"
                  value={task.dueDate ?? ""}
                  onChange={e => onUpdate({ ...task, dueDate: e.target.value || undefined })}
                />
                {task.dueDate && (
                  <div className="text-[11px] text-ink-400 mt-1">{format(parseISO(task.dueDate), "EEE, MMM d")}</div>
                )}
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-1 flex-wrap">
                  {(task.tags ?? []).map(tag => (
                    <span key={tag} className="badge-slate">{tag}</span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-2 text-right whitespace-nowrap">
                <button className="btn bg-ink-900 text-white hover:bg-ink-700 mr-2" onClick={() => onUpdate({ ...task, status: "done" })}>Done</button>
                <button className="btn bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-400/20 dark:text-red-200 dark:hover:bg-red-400/30" onClick={() => onRemove(task.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-ink-400">لا توجد مهام مطابقة حاليا</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default memo(ProTableView);

