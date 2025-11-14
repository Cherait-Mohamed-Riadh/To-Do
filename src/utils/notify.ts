export type NotifyResult = { ok: boolean; error?: string };

function env(name: string): string | undefined {
  try { return (import.meta as any).env?.[name] as string | undefined; } catch { return undefined; }
}

async function postJson(url: string, body: any, headers?: Record<string, string>) {
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(headers ?? {}) }, body: JSON.stringify(body) });
}

export async function notifyDiscord(message: string): Promise<NotifyResult> {
  try {
    const url = env("VITE_DISCORD_WEBHOOK_URL") || (window as any).__DISCORD_WEBHOOK_URL;
    if (!url) return { ok: false, error: "Discord webhook not configured" };
    const res = await postJson(url, { content: message });
    if (!res.ok) return { ok: false, error: `Discord ${res.status}` };
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Discord notify failed" }; }
}

export async function notifyTelegram(message: string): Promise<NotifyResult> {
  try {
    const token = env("VITE_TELEGRAM_BOT_TOKEN") || (window as any).__TELEGRAM_BOT_TOKEN;
    const chatId = env("VITE_TELEGRAM_CHAT_ID") || (window as any).__TELEGRAM_CHAT_ID;
    if (!token || !chatId) return { ok: false, error: "Telegram not configured" };
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await postJson(url, { chat_id: chatId, text: message, parse_mode: "HTML" });
    if (!res.ok) return { ok: false, error: `Telegram ${res.status}` };
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Telegram notify failed" }; }
}

