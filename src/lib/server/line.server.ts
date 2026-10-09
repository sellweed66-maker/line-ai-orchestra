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

export type LineMessage = Record<string, unknown>;
export const textMsg = (t: string, quickReply?: unknown): LineMessage => ({
  type: "text",
  text: t.slice(0, 4900) || "-",
  ...(quickReply ? { quickReply } : {}),
});

async function call(path: "reply" | "push", token: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://api.line.me/v2/bot/message/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`LINE ตอบกลับ ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function lineReplyMessages(token: string, replyToken: string, messages: LineMessage[]) {
  try {
    await call("reply", token, { replyToken, messages: messages.slice(0, 5) });
    return true;
  } catch {
    return false;
  }
}

export const linePushMessages = (token: string, to: string, messages: LineMessage[]) =>
  call("push", token, { to, messages: messages.slice(0, 5) });

export const lineReply = (token: string, replyToken: string, text: string) => lineReplyMessages(token, replyToken, [textMsg(text)]);
export const linePush = (token: string, to: string, text: string) => linePushMessages(token, to, [textMsg(text)]);

/** Pushes a flex card; if LINE rejects the flex payload, falls back to plain text. */
export async function linePushFlex(token: string, to: string, flex: LineMessage, fallbackText: string) {
  try {
    await linePushMessages(token, to, [flex]);
  } catch (e) {
    if (/\b(400)\b/.test((e as Error).message)) await linePush(token, to, fallbackText);
    else throw e;
  }
}
