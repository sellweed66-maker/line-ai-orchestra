// AI Rotation & Fallback Engine: tries providers in priority order and
// falls through to the next one on any error (429, quota, 5xx, bad key...).
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { wrapLanguageModel, type LanguageModel, type LanguageModelMiddleware } from "ai";
import { COOLDOWN_MS, PROVIDERS, type ProviderId } from "@/lib/providers";
import { getSecret, type Db } from "./secrets.server";

// Some providers (e.g. Groq) reject `reasoning_content` on assistant messages
// that the SDK resends during multi-step tool calls — strip reasoning parts.
const stripReasoning: LanguageModelMiddleware = {
  transformParams: async ({ params }) => ({
    ...params,
    prompt: params.prompt.map((m) =>
      m.role === "assistant" && Array.isArray(m.content)
        ? { ...m, content: m.content.filter((c) => c.type !== "reasoning") }
        : m,
    ),
  }),
};

export function makeModel(provider: ProviderId, apiKey: string, model: string): LanguageModel {
  const cfg = PROVIDERS[provider];
  const p = createOpenAICompatible({
    name: provider,
    baseURL: cfg.baseURL,
    apiKey,
    headers: provider === "openrouter" ? { "HTTP-Referer": "https://lovable.app", "X-Title": "AI Hub" } : undefined,
  });
  return wrapLanguageModel({ model: p.chatModel(model || cfg.defaultModel), middleware: stripReasoning });
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

export type Attempt = { provider: ProviderId; label: string; ok: boolean; error?: string };

/** Secret for one provider row: keyed by row id; legacy rows were keyed by provider name. */
export async function getRowKey(db: Db, userId: string, row: { id: string; provider: string }) {
  return (await getSecret(db, userId, "ai", row.id)) ?? (await getSecret(db, userId, "ai", row.provider));
}

export async function runWithFallback<T>(
  db: Db,
  userId: string,
  fn: (model: LanguageModel, provider: ProviderId) => Promise<T>,
  onlyRowId?: string,
): Promise<{ result: T; provider: ProviderId; attempts: Attempt[] }> {
  let q = db.from("ai_providers").select("*").eq("user_id", userId).eq("has_key", true).order("priority");
  q = onlyRowId ? q.eq("id", onlyRowId) : q.eq("enabled", true);
  const { data: rows, error } = await q;
  if (error) throw error;
  if (!rows || rows.length === 0) {
    throw new Error("ยังไม่มี AI ที่พร้อมใช้งาน — ไปที่หน้า AI Settings เพื่อใส่ API Key อย่างน้อย 1 ตัว");
  }
  // Keys resting after a 429 go to the back of the line (still tried as last resort).
  const now = Date.now();
  const resting = (r: { cooldown_until?: string | null }) => !!r.cooldown_until && new Date(r.cooldown_until).getTime() > now;
  const ordered = onlyRowId ? rows : [...rows.filter((r) => !resting(r)), ...rows.filter(resting)];
  const attempts: Attempt[] = [];
  for (const row of ordered) {
    const provider = row.provider as ProviderId;
    if (!PROVIDERS[provider]) continue;
    const label = row.label || PROVIDERS[provider].label;
    const key = await getRowKey(db, userId, row);
    if (!key) continue;
    try {
      const result = await fn(makeModel(provider, key, row.model), provider);
      attempts.push({ provider, label, ok: true });
      await db
        .from("ai_providers")
        .update({ last_status: "online", last_error: null, cooldown_until: null, last_used_at: new Date().toISOString() })
        .eq("id", row.id);
      return { result, provider, attempts };
    } catch (e) {
      const msg = describeAiError(e);
      attempts.push({ provider, label, ok: false, error: msg });
      const is429 = (e as { statusCode?: number })?.statusCode === 429;
      await db
        .from("ai_providers")
        .update({
          last_status: "error",
          last_error: msg,
          ...(is429 ? { cooldown_until: new Date(Date.now() + COOLDOWN_MS).toISOString() } : {}),
        })
        .eq("id", row.id);
    }
  }
  throw new Error("AI ทุกตัวใช้งานไม่ได้ตอนนี้: " + attempts.map((a) => `${a.label} → ${a.error}`).join(" | "));
}
