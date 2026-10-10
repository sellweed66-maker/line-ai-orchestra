import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Inbound bill notifications from a store app (e.g. ObwangnoiOG).
// Caller must sign the raw body: header x-hub-signature = hex(HMAC-SHA256(ingestKey, body)).
const Bill = z.object({
  type: z.string().min(1).max(40),
  bill_no: z.string().max(80).optional(),
  branch: z.string().max(120).optional(),
  customer: z.string().max(120).optional(),
  items: z
    .array(z.object({ name: z.string().max(120), qty: z.union([z.number(), z.string().max(20)]).optional(), price: z.union([z.number(), z.string().max(30)]).optional() }))
    .max(200)
    .optional(),
  total: z.union([z.number(), z.string().max(30)]).optional(),
  note: z.string().max(500).optional(),
  time: z.string().max(60).optional(),
});

async function hmacHex(key: string, body: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const Route = createFileRoute("/api/public/bill/$userId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const userId = params.userId;
        if (!/^[0-9a-f-]{36}$/i.test(userId)) return new Response("not found", { status: 404 });
        const body = await request.text();
        if (body.length > 100_000) return new Response("too large", { status: 413 });
        const { getAdmin, getSecret } = await import("@/lib/server/secrets.server");
        const db = await getAdmin();
        const key = await getSecret(db, userId, "ingest", "bill");
        if (!key) return new Response("not configured", { status: 404 });
        const sig = (request.headers.get("x-hub-signature") ?? "").replace(/^sha256=/, "").toLowerCase();
        if (!sig || !safeEq(sig, await hmacHex(key, body))) return new Response("invalid signature", { status: 401 });

        let parsed;
        try {
          parsed = Bill.safeParse(JSON.parse(body));
        } catch {
          return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
        }
        if (!parsed.success) return Response.json({ ok: false, error: parsed.error.issues[0]?.message }, { status: 400 });
        const b = parsed.data;

        const { linePushFlex } = await import("@/lib/server/line.server");
        const { buildReceiptFlex, billTypeLabel, fmtMoney } = await import("@/lib/line-flex");
        const token = await getSecret(db, userId, "line", "token");
        const { data: ls } = await db.from("line_settings").select("target_id").eq("user_id", userId).maybeSingle();
        const { data: st } = await db.from("app_settings").select("store_name").eq("user_id", userId).maybeSingle();
        const label = billTypeLabel(b.type) ?? b.type;
        const cmd = `บิลใหม่: ${label}${b.bill_no ? ` ${b.bill_no}` : ""}`;
        if (!token || !ls?.target_id) {
          await db.from("command_logs").insert({ user_id: userId, source: "api", command: cmd, app_name: "LINE", action: "bill_notify", status: "error", result: "ยังไม่ได้ตั้งค่า LINE" } as never);
          return Response.json({ ok: false, error: "line not configured" }, { status: 409 });
        }
        const total = b.total !== undefined ? fmtMoney(b.total) : undefined;
        const flex = buildReceiptFlex({
          title: `🧾 ${label}`,
          storeName: st?.store_name ?? undefined,
          badge: label,
          subtitle: [b.branch, b.customer].filter(Boolean).join(" · ") || undefined,
          billNo: b.bill_no,
          items: b.items,
          total,
          note: b.note,
          time: b.time,
        });
        const fallback = [`🧾 ${cmd}`, b.branch, ...(b.items ?? []).map((i) => `• ${i.name}${i.qty ? ` × ${i.qty}` : ""}`), total ? `รวม ${total}` : ""].filter(Boolean).join("\n");
        try {
          await linePushFlex(token, ls.target_id, flex, fallback);
          await db.from("command_logs").insert({ user_id: userId, source: "api", command: cmd, app_name: "LINE", action: "bill_notify", status: "success", result: total ?? "ส่งแล้ว" } as never);
          return Response.json({ ok: true });
        } catch (e) {
          await db.from("command_logs").insert({ user_id: userId, source: "api", command: cmd, app_name: "LINE", action: "bill_notify", status: "error", result: (e as Error).message.slice(0, 500) } as never);
          return Response.json({ ok: false, error: "line push failed" }, { status: 502 });
        }
      },
    },
  },
});
