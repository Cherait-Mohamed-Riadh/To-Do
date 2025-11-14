import type { Task } from "../types";

export type AutomationContext = {
  emit: (event: string, payload: unknown) => void;
};

export type AutomationRule = {
  id: string;
  name: string;
  description?: string;
  when: (prev: Task, next: Task) => boolean;
  action: (prev: Task, next: Task, ctx: AutomationContext) => Promise<void> | void;
};

const rules: AutomationRule[] = [];

export function registerRule(rule: AutomationRule) {
  const exists = rules.some(r => r.id === rule.id);
  if (!exists) rules.push(rule);
}

export function listRules() {
  return [...rules];
}

export function runAutomations(prev: Task, next: Task) {
  const ctx: AutomationContext = {
    emit: (event, payload) => {
      try {
        window.dispatchEvent(new CustomEvent("automation:" + event, { detail: payload }));
      } catch {
        // no-op in non-browser env
      }
    }
  };
  for (const rule of rules) {
    try {
      if (rule.when(prev, next)) {
        Promise.resolve(rule.action(prev, next, ctx)).catch(() => {});
      }
    } catch {
      // ignore rule failure
    }
  }
}

// Built-in sample rules (can be removed/extended later)
registerRule({
  id: "celebrate-high-priority-done",
  name: "Celebrate completion of high-priority tasks",
  description: "Fires when a task moves to done and priority is high.",
  when: (prev, next) => prev.status !== "done" && next.status === "done" && (next.priority ?? "medium") === "high",
  action: (_prev, next, ctx) => {
    ctx.emit("toast", { kind: "success", message: `High priority completed: ${next.title}` });
  }
});

registerRule({
  id: "remind-upcoming",
  name: "Remind on date change",
  description: "Fires when due date is added or changed.",
  when: (prev, next) => (prev.dueDate || "") !== (next.dueDate || ""),
  action: (_prev, next, ctx) => {
    if (next.dueDate) ctx.emit("toast", { kind: "info", message: `Due ${next.dueDate} • ${next.title}` });
  }
});


