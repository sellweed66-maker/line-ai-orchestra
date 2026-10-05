// AI Rotation & Fallback Engine: tries providers in priority order and
// falls through to the next one on any error (429, quota, 5xx, bad key...).
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import { getSecret, type Db } from "./secrets.server";

export function makeModel(provider: ProviderId, apiKey: string, model: string): LanguageModel {
  const cfg = PROVIDERS[provider];
  const p = createOpenAICompatible({
    name: provider,
    baseURL: cfg.baseURL,
    apiKey,
    headers: provider === "openrouter" ? { "HTTP-Referer": "https://lovable.app", "X-Title": "AI Hub" } : undefined,
  });
  return p.chatModel(model || cfg.defaultModel);
}

export function describeAiError(e: unknown): string {
  const err = e as { statusCode?: number; message?: string; responseBody?: string };
  const code = err?.statusCode;
  let msg = err?.message ?? String(e);
  if (code === 429) msg = "Rate limit / โควตาเต็ม (429)";
  else if (code === 401 || code === 403) msg = `API Key ไม่ถูกต้องหรือไม่มีสิทธิ์ (${code})`;
  else if (code) msg = `HTTP ${code}: ${msg}`;
  return msg.slice(0, 300);
}

export type Attempt = { provider: ProviderId; ok: boolean; error?: string };

export async function runWithFallback<T>(
  db: Db,
  userId: string,
  fn: (model: LanguageModel, provider: ProviderId) => Promise<T>,
  only?: ProviderId,
): Promise<{ result: T; provider: ProviderId; attempts: Attempt[] }> {
  let q = db.from("ai_providers").select("*").eq("user_id", userId).eq("has_key", true).order("priority");
  q = only ? q.eq("provider", only) : q.eq("enabled", true);
  const { data: rows, error } = await q;
  if (error) throw error;
  if (!rows || rows.length === 0) {
    throw new Error("ยังไม่มี AI ที่พร้อมใช้งาน — ไปที่หน้า AI Settings เพื่อใส่ API Key อย่างน้อย 1 ค่าย");
  }
  const attempts: Attempt[] = [];
  for (const row of rows) {
    const provider = row.provider as ProviderId;
    const key = await getSecret(db, userId, "ai", provider);
    if (!key) continue;
    try {
      const result = await fn(makeModel(provider, key, row.model), provider);
      attempts.push({ provider, ok: true });
      await db
        .from("ai_providers")
        .update({ last_status: "online", last_error: null, last_used_at: new Date().toISOString() })
        .eq("id", row.id);
      return { result, provider, attempts };
    } catch (e) {
      const msg = describeAiError(e);
      attempts.push({ provider, ok: false, error: msg });
      await db.from("ai_providers").update({ last_status: "error", last_error: msg }).eq("id", row.id);
    }
  }
  throw new Error(
    "AI ทุกค่ายใช้งานไม่ได้ตอนนี้: " + attempts.map((a) => `${PROVIDERS[a.provider].label} → ${a.error}`).join(" | "),
  );
}
