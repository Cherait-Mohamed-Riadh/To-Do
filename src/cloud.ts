import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Task } from "./types";

let client: SupabaseClient | null = null;

function ensureClient(): SupabaseClient | null {
	const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
	const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
	if (!url || !key) return null;
	try {
		const u = new URL(url);
		if (u.protocol !== "https:") {
			console.warn("Insecure Supabase URL blocked. Only https is allowed in production.");
			if (import.meta.env.PROD) return null;
		}
	} catch {
		return null;
	}
	if (!client) client = createClient(url, key, { auth: { persistSession: false }, global: { headers: { "X-Client-Info": "todo-app" } } });
	return client;
}

export function cloudConfigured(): boolean {
	return !!ensureClient();
}

export async function syncUpTasks(tasks: Task[]): Promise<{ ok: boolean; error?: string }> {
	const c = ensureClient();
	if (!c) return { ok: false, error: "Cloud not configured" };
	try {
		// Simple upsert into a shared bucket keyed by a device id
		const deviceId = getDeviceId();
		const { error } = await c.from("todos").upsert({ device_id: deviceId, payload: tasks, updated_at: new Date().toISOString() }, { onConflict: "device_id" });
		if (error) throw error;
		return { ok: true };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Sync failed" };
	}
}

export async function fetchTasksFromCloud(): Promise<{ ok: boolean; tasks?: Task[]; error?: string }> {
	const c = ensureClient();
	if (!c) return { ok: false, error: "Cloud not configured" };
	try {
		const deviceId = getDeviceId();
		const { data, error } = await c.from("todos").select("payload").eq("device_id", deviceId).single();
		if (error) throw error;
		const payload = (data as any)?.payload ?? [];
		return { ok: true, tasks: payload as Task[] };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Fetch failed" };
	}
}

function getDeviceId(): string {
	try {
		const key = "app.deviceId";
		let id = localStorage.getItem(key);
		if (!id) {
			id = `dev_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
			localStorage.setItem(key, id);
		}
		return id;
	} catch {
		return "dev_unknown";
	}
}










