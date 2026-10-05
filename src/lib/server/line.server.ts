// LINE Messaging API helpers (Web Crypto so it runs on the edge runtime).
export async function verifyLineSignature(secret: string, body: string, signature: string | null) {
  if (!signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  let bin = "";
  for (const b of mac) bin += String.fromCharCode(b);
  const expected = btoa(bin);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

const chunk = (t: string) => [{ type: "text", text: t.slice(0, 4900) || "-" }];

export async function lineReply(token: string, replyToken: string, text: string) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages: chunk(text) }),
  });
  return res.ok;
}

export async function linePush(token: string, to: string, text: string) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, messages: chunk(text) }),
  });
  if (!res.ok) throw new Error(`LINE ตอบกลับ ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
