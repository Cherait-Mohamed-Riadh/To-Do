import { useEffect, useState } from "react";

type Toast = { id: string; kind: "success" | "info" | "error"; message: string };

function cls(kind: Toast["kind"]) {
  if (kind === "success") return "bg-emerald-600 text-white";
  if (kind === "error") return "bg-red-600 text-white";
  return "bg-ink-900 text-white";
}

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onAutomationToast(e: Event) {
      const detail = (e as CustomEvent).detail as any;
      if (!detail?.message) return;
      const toast: Toast = {
        id: Math.random().toString(36).slice(2),
        kind: (detail.kind as Toast["kind"]) || "info",
        message: String(detail.message)
      };
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 4000);
    }
    window.addEventListener("automation:toast", onAutomationToast as any);
    return () => window.removeEventListener("automation:toast", onAutomationToast as any);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`rounded-lg px-3 py-2 shadow-lg ${cls(t.kind)}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}


