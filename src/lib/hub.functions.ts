// Authenticated server functions for the AI Hub. Server-only modules are
// imported inside handlers so they never reach the browser bundle.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PROVIDERS, detectProvider } from "@/lib/providers";

const providerEnum = z.enum(["gemini", "groq", "openrouter"]);

/* ---------- AI providers (unlimited keys, any provider repeated) ---------- */

export const ensureProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ ok: true }));

export const addProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ apiKey: z.string().trim().min(8).max(500), label: z.string().trim().max(60).optional(), provider: providerEnum.optional() }),
  )
  .handler(async ({ data, context }) => {
    const provider = data.provider ?? detectProvider(data.apiKey);
    if (!provider) throw new Error("ระบุค่ายจาก Key ไม่ได้ — กรุณาเลือกค่าย");
    const { getAdmin, setSecret, hint } = await import("@/lib/server/secrets.server");
    const { data: last } = await context.supabase
      .from("ai_providers").select("priority").eq("user_id", context.userId).order("priority", { ascending: false }).limit(1);
    const { data: same } = await context.supabase.from("ai_providers").select("id").eq("user_id", context.userId).eq("provider", provider);
    const label = data.label || `${PROVIDERS[provider].label}${same && same.length ? ` #${same.length + 1}` : ""}`;
    const { data: ins, error } = await context.supabase
      .from("ai_providers")
      .insert({
        user_id: context.userId, provider, label, model: PROVIDERS[provider].defaultModel,
        priority: (last?.[0]?.priority ?? -1) + 1, has_key: true, key_hint: hint(data.apiKey), enabled: true,
      })
      .select("id").single();
    if (error) throw new Error(error.message);
    await setSecret(await getAdmin(), context.userId, "ai", ins.id, data.apiKey);
    return { id: ins.id, provider, label };
  });

export const saveProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      apiKey: z.string().max(500).optional(),
      enabled: z.boolean().optional(),
      label: z.string().trim().max(60).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { getAdmin, setSecret, deleteSecret, hint } = await import("@/lib/server/secrets.server");
    const { data: row } = await context.supabase.from("ai_providers").select("id, provider").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("ไม่พบรายการ");
    const patch: Record<string, unknown> = {};
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.label !== undefined) patch.label = data.label;
    if (data.apiKey?.trim()) {
      const k = data.apiKey.trim();
      const admin = await getAdmin();
      await setSecret(admin, context.userId, "ai", row.id, k);
      await deleteSecret(admin, context.userId, "ai", row.provider); // drop legacy slot
      Object.assign(patch, { has_key: true, key_hint: hint(k), last_status: "unknown", last_error: null, cooldown_until: null });
    }
    const { error } = await context.supabase.from("ai_providers").update(patch as never).eq("id", row.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { getAdmin, deleteSecret } = await import("@/lib/server/secrets.server");
    const { data: row } = await context.supabase.from("ai_providers").select("id, provider").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("ไม่พบรายการ");
    const admin = await getAdmin();
    await deleteSecret(admin, context.userId, "ai", row.id);
    const { data: others } = await context.supabase.from("ai_providers").select("id").eq("provider", row.provider).neq("id", row.id);
    if (!others?.length) await deleteSecret(admin, context.userId, "ai", row.provider);
    const { error } = await context.supabase.from("ai_providers").delete().eq("id", row.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ order: z.array(z.string().uuid()).max(100) }))
  .handler(async ({ data, context }) => {
    for (const [i, id] of data.order.entries()) {
      await context.supabase.from("ai_providers").update({ priority: i }).eq("user_id", context.userId).eq("id", id);
    }
    return { ok: true };
  });

export const testProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { getAdmin } = await import("@/lib/server/secrets.server");
    const { runWithFallback } = await import("@/lib/server/ai-engine.server");
    const { generateText } = await import("ai");
    try {
      const { result } = await runWithFallback(
        await getAdmin(),
        context.userId,
        async (model) => (await generateText({ model, prompt: "ตอบกลับคำเดียวว่า OK", maxRetries: 0 })).text,
        data.id,
      );
      return { ok: true, message: `เชื่อมต่อสำเร็จ: ${result.slice(0, 60)}` };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  });

/* ---------- Satellite apps ---------- */

export const saveApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().trim().min(1).max(80),
      base_url: z.string().trim().url().max(500),
      apiKey: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { getAdmin, setSecret } = await import("@/lib/server/secrets.server");
    const row: Record<string, unknown> = { name: data.name, base_url: data.base_url.replace(/\/+$/, "") };
    if (data.apiKey?.trim()) row.has_key = true;
    let id = data.id;
    if (id) {
      const { error } = await context.supabase.from("satellite_apps").update(row as never).eq("id", id).eq("user_id", context.userId);
      if (error) throw new Error(error.message);
    } else {
      const { data: ins, error } = await context.supabase
        .from("satellite_apps")
        .insert({ ...row, user_id: context.userId } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = ins.id;
    }
    if (data.apiKey?.trim()) await setSecret(await getAdmin(), context.userId, "app", id!, data.apiKey.trim());
    return { id };
  });

export const deleteApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { getAdmin, deleteSecret } = await import("@/lib/server/secrets.server");
    const { error } = await context.supabase.from("satellite_apps").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    await deleteSecret(await getAdmin(), context.userId, "app", data.id);
    return { ok: true };
  });

export const syncTools = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { getAdmin } = await import("@/lib/server/secrets.server");
    const { fetchTools } = await import("@/lib/server/satellite.server");
    const { data: app } = await context.supabase.from("satellite_apps").select("id, base_url").eq("id", data.id).maybeSingle();
    if (!app) throw new Error("ไม่พบแอพ");
    const now = new Date().toISOString();
    try {
      const tools = await fetchTools(await getAdmin(), context.userId, app);
      await context.supabase
        .from("satellite_apps")
        .update({ tools: tools as never, status: "online", last_synced_at: now, last_checked_at: now })
        .eq("id", app.id);
      return { ok: true, count: tools.length, message: `ซิงก์สำเร็จ ${tools.length} เครื่องมือ` };
    } catch (e) {
      await context.supabase.from("satellite_apps").update({ status: "offline", last_checked_at: now }).eq("id", app.id);
      return { ok: false, count: 0, message: `ซิงก์ไม่สำเร็จ: ${(e as Error).message}` };
    }
  });

export const checkAllApps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAdmin } = await import("@/lib/server/secrets.server");
    const { fetchTools } = await import("@/lib/server/satellite.server");
    const admin = await getAdmin();
    const { data: apps } = await context.supabase.from("satellite_apps").select("id, base_url").eq("user_id", context.userId);
    await Promise.all(
      (apps ?? []).map(async (a) => {
        let status = "online";
        try {
          await fetchTools(admin, context.userId, a);
        } catch {
          status = "offline";
        }
        await context.supabase.from("satellite_apps").update({ status, last_checked_at: new Date().toISOString() }).eq("id", a.id);
      }),
    );
    return { ok: true };
  });

/* ---------- Chat ---------- */

export const sendChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ threadId: z.string().uuid(), text: z.string().trim().min(1).max(4000) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: thread } = await supabase.from("chat_threads").select("id, title").eq("id", data.threadId).maybeSingle();
    if (!thread) throw new Error("ไม่พบห้องแชต");
    const { data: prev } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: false })
      .limit(20);
    const { error: e1 } = await supabase
      .from("chat_messages")
      .insert({ thread_id: data.threadId, user_id: userId, role: "user", content: data.text });
    if (e1) throw new Error(e1.message);
    const isFirst = !prev || prev.length === 0;
    await supabase
      .from("chat_threads")
      .update(isFirst ? { title: data.text.slice(0, 40) } : { updated_at: new Date().toISOString() })
      .eq("id", data.threadId);

    const { getAdmin } = await import("@/lib/server/secrets.server");
    const { runAgent } = await import("@/lib/server/agent.server");
    let content: string;
    let meta: Record<string, unknown>;
    try {
      const r = await runAgent({
        db: await getAdmin(),
        userId,
        source: "web",
        threadId: data.threadId,
        command: data.text,
        history: (prev ?? [])
          .reverse()
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      });
      content = r.text;
      meta = { provider: r.provider, attempts: r.attempts, tools: r.tools, pendingIds: r.pendings.map((p) => p.id) };
    } catch (e) {
      content = `⚠️ ${(e as Error).message}`;
      meta = { error: true };
    }
    const { error: e2 } = await supabase
      .from("chat_messages")
      .insert({ thread_id: data.threadId, user_id: userId, role: "assistant", content, meta: meta as never });
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

export const resolvePending = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), approve: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { getAdmin } = await import("@/lib/server/secrets.server");
    const { resolvePendingAction } = await import("@/lib/server/agent.server");
    const admin = await getAdmin();
    const { data: p } = await context.supabase.from("pending_actions").select("thread_id").eq("id", data.id).maybeSingle();
    if (!p) throw new Error("ไม่พบคำขอ");
    const r = await resolvePendingAction(admin, context.userId, { id: data.id }, data.approve);
    if (p.thread_id) {
      await context.supabase
        .from("chat_messages")
        .insert({ thread_id: p.thread_id, user_id: context.userId, role: "assistant", content: r.message, meta: { system: true } });
    }
    return r;
  });

/* ---------- LINE ---------- */

export const saveLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      token: z.string().max(1000).optional(),
      secret: z.string().max(200).optional(),
      target_id: z.string().max(100).optional(),
      owner_line_ids: z.array(z.string().max(100)).max(20),
    }),
  )
  .handler(async ({ data, context }) => {
    const { getAdmin, setSecret } = await import("@/lib/server/secrets.server");
    const admin = await getAdmin();
    const row: Record<string, unknown> = {
      user_id: context.userId,
      target_id: data.target_id?.trim() || null,
      owner_line_ids: data.owner_line_ids.map((s) => s.trim()).filter(Boolean),
    };
    if (data.token?.trim()) {
      await setSecret(admin, context.userId, "line", "token", data.token.trim());
      row.has_token = true;
    }
    if (data.secret?.trim()) {
      await setSecret(admin, context.userId, "line", "secret", data.secret.trim());
      row.has_secret = true;
    }
    const { error } = await context.supabase.from("line_settings").upsert(row as never, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendLineTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ kind: z.enum(["text", "report"]) }))
  .handler(async ({ data, context }) => {
    const { getAdmin, getSecret } = await import("@/lib/server/secrets.server");
    const { linePush } = await import("@/lib/server/line.server");
    const { formatReport } = await import("@/lib/report-format");
    const admin = await getAdmin();
    const token = await getSecret(admin, context.userId, "line", "token");
    const { data: ls } = await context.supabase.from("line_settings").select("target_id").maybeSingle();
    const { data: st } = await context.supabase.from("app_settings").select("store_name").maybeSingle();
    if (!token || !ls?.target_id) return { ok: false, message: "กรุณาบันทึก Channel Access Token และ Group/User ID ก่อน" };
    const text =
      data.kind === "text"
        ? "✅ ทดสอบการเชื่อมต่อจาก AI Hub สำเร็จ"
        : formatReport({
            title: "สรุปยอดขายวันนี้ (ตัวอย่าง)",
            storeName: st?.store_name,
            lines: [
              { label: "จำนวนบิล", value: "42 บิล" },
              { label: "เงินสด", value: "฿8,450" },
              { label: "โอน/QR", value: "฿12,300" },
              { label: "สินค้าขายดี", value: "ชาไทยเย็น (31 แก้ว)" },
            ],
            total: "฿20,750",
            note: "นี่คือข้อความตัวอย่างรูปแบบรายงาน",
          });
    try {
      await linePush(token, ls.target_id, text);
      await context.supabase.from("command_logs").insert({
        user_id: context.userId,
        source: "web",
        command: data.kind === "text" ? "ทดสอบส่ง LINE" : "ส่งรายงานตัวอย่าง LINE",
        app_name: "LINE",
        action: "push",
        status: "success",
        result: "ส่งแล้ว",
      });
      return { ok: true, message: "ส่งข้อความเข้า LINE แล้ว" };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  });

/* ---------- Bill ingest key ---------- */

export const getIngestKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ rotate: z.boolean().optional() }))
  .handler(async ({ data, context }) => {
    const { getAdmin, getSecret, setSecret } = await import("@/lib/server/secrets.server");
    const admin = await getAdmin();
    let key = await getSecret(admin, context.userId, "ingest", "bill");
    if (!key || data.rotate) {
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      key = "hub_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
      await setSecret(admin, context.userId, "ingest", "bill", key);
    }
    return { key };
  });
