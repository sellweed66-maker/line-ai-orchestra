// Talks to satellite apps: GET /api/agent/tools and POST /api/agent/exec.
import { getSecret, type Db } from "./secrets.server";

export type SatTool = { action: string; description: string; parameters: unknown; risky?: boolean };

function joinUrl(base: string, path: string) {
  return base.replace(/\/+$/, "") + path;
}

function headers(key: string | null) {
  const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (key) {
    h["Authorization"] = `Bearer ${key}`;
    h["x-agent-key"] = key;
  }
  return h;
}

export function normalizeTools(raw: unknown): SatTool[] {
  const list = Array.isArray(raw) ? raw : ((raw as { tools?: unknown[] })?.tools ?? []);
  return (list as Record<string, unknown>[])
    .filter((t) => t && (t.action || t.name))
    .map((t) => ({
      action: String(t.action ?? t.name),
      description: String(t.description ?? ""),
      parameters: t.parameters ?? t.params ?? t.input_schema ?? {},
      risky: t.risky === true || t.dangerous === true || t.requires_confirmation === true || t.confirm === true ? true : undefined,
    }));
}

export async function fetchTools(db: Db, userId: string, app: { id: string; base_url: string }) {
  const key = await getSecret(db, userId, "app", app.id);
  const res = await fetch(joinUrl(app.base_url, "/api/agent/tools"), {
    headers: headers(key),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return normalizeTools(await res.json());
}

export async function execTool(
  db: Db,
  userId: string,
  app: { id: string; base_url: string },
  action: string,
  params: unknown,
): Promise<{ ok: boolean; output: string }> {
  const key = await getSecret(db, userId, "app", app.id);
  try {
    const res = await fetch(joinUrl(app.base_url, "/api/agent/exec"), {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify({ action, params, parameters: params }),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    await db
      .from("satellite_apps")
      .update({ status: "online", last_checked_at: new Date().toISOString() })
      .eq("id", app.id);
    return { ok: res.ok, output: (res.ok ? "" : `HTTP ${res.status}: `) + text.slice(0, 6000) };
  } catch (e) {
    await db
      .from("satellite_apps")
      .update({ status: "offline", last_checked_at: new Date().toISOString() })
      .eq("id", app.id);
    return { ok: false, output: `เชื่อมต่อแอพไม่ได้: ${(e as Error).message}` };
  }
}

export const RISKY_RE =
  /(delete|remove|destroy|drop|update|edit|modify|change|cancel|void|refund|reset|clear|purge|patch|archive|ลบ|แก้|ยกเลิก)/i;

export function isRisky(t: SatTool) {
  return t.risky === true || RISKY_RE.test(t.action);
}
