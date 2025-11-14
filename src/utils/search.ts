import type { Task, Page, Workspace } from "../types";

export function normalize(str: string) {
  return (str || "").toLowerCase();
}

export function searchAll(q: string, data: { tasks: Task[]; pages: Page[]; workspaces: Workspace[] }) {
  const query = normalize(q);
  const scoredTasks = data.tasks
    .map(t => {
      const hay = [t.title, t.category, ...(t.tags ?? [])].map(normalize).join(" ");
      const score = hay.includes(query) ? 1 : 0;
      return { score, item: t };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.item);

  const scoredPages = data.pages
    .map(p => ({ score: normalize(p.title).includes(query) ? 1 : 0, item: p }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.item);

  const scoredWorkspaces = data.workspaces
    .map(w => ({ score: normalize(w.name).includes(query) ? 1 : 0, item: w }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.item);

  return { tasks: scoredTasks, pages: scoredPages, workspaces: scoredWorkspaces };
}


