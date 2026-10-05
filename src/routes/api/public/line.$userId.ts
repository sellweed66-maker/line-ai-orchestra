import { createFileRoute } from "@tanstack/react-router";

// LINE webhook: every request must carry a valid x-line-signature, and only
// whitelisted owner LINE user IDs may run commands.
export const Route = createFileRoute("/api/public/line/$userId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const userId = params.userId;
        if (!/^[0-9a-f-]{36}$/i.test(userId)) return new Response("not found", { status: 404 });
        const body = await request.text();
        const { getAdmin, getSecret } = await import("@/lib/server/secrets.server");
        const { verifyLineSignature, lineReply, linePush } = await import("@/lib/server/line.server");
        const db = await getAdmin();
        const secret = await getSecret(db, userId, "line", "secret");
        if (!secret) return new Response("not configured", { status: 404 });
        const ok = await verifyLineSignature(secret, body, request.headers.get("x-line-signature"));
        if (!ok) return new Response("invalid signature", { status: 401 });

        const token = await getSecret(db, userId, "line", "token");
        const { data: ls } = await db.from("line_settings").select("*").eq("user_id", userId).maybeSingle();
        const owners: string[] = (ls?.owner_line_ids as string[]) ?? [];
        const payload = JSON.parse(body) as {
          events?: {
            type: string;
            replyToken?: string;
            source?: { userId?: string; groupId?: string; roomId?: string };
            message?: { type: string; text?: string };
          }[];
        };

        for (const ev of payload.events ?? []) {
          if (ev.type !== "message" || ev.message?.type !== "text" || !token) continue;
          const text = (ev.message.text ?? "").trim();
          const sender = ev.source?.userId ?? "";
          const chatId = ev.source?.groupId ?? ev.source?.roomId ?? sender;
          const respond = async (msg: string) => {
            const sent = ev.replyToken ? await lineReply(token, ev.replyToken, msg) : false;
            if (!sent && chatId) await linePush(token, chatId, msg).catch(() => undefined);
          };

          if (/^(myid|ไอดี)$/i.test(text)) {
            await respond(`User ID: ${sender}${ev.source?.groupId ? `\nGroup ID: ${ev.source.groupId}` : ""}`);
            continue;
          }
          if (!owners.includes(sender)) {
            await db.from("command_logs").insert({
              user_id: userId,
              source: "line",
              command: text.slice(0, 500),
              status: "denied",
              result: `ปฏิเสธ: ${sender} ไม่อยู่ในรายชื่อที่อนุญาต`,
            });
            if (!ev.source?.groupId) await respond("⛔ คุณไม่มีสิทธิ์สั่งงานระบบนี้");
            continue;
          }

          const { runAgent, resolvePendingAction } = await import("@/lib/server/agent.server");
          const m = text.match(/^(ยืนยัน|confirm|ยกเลิก|cancel)\s+([A-Za-z0-9]{6})$/i);
          if (m) {
            const approve = /^(ยืนยัน|confirm)$/i.test(m[1]);
            const r = await resolvePendingAction(db, userId, { code: m[2] }, approve);
            await respond(r.message);
            continue;
          }
          try {
            const r = await runAgent({ db, userId, source: "line", command: text, history: [] });
            let msg = r.text;
            for (const p of r.pendings) {
              msg += `\n\n⚠️ คำสั่งเสี่ยง: ${p.action} (${p.app_name})\nพิมพ์ "ยืนยัน ${p.code}" เพื่อดำเนินการ\nหรือ "ยกเลิก ${p.code}"`;
            }
            await respond(msg);
          } catch (e) {
            await respond(`⚠️ ${(e as Error).message}`);
          }
        }
        return new Response("ok");
      },
    },
  },
});
