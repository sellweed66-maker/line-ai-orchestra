// Builds LINE Flex "receipt card" messages and quick-reply chips.
export type ReceiptItem = { name: string; qty?: number | string; price?: number | string };
export type ReceiptInput = {
  title: string;
  storeName?: string;
  badge?: string; // e.g. bill type
  subtitle?: string; // branch / customer
  billNo?: string;
  items?: ReceiptItem[];
  lines?: { label: string; value: string }[];
  total?: string;
  note?: string;
  time?: string;
  color?: string; // hex accent
};

export const QUICK_COMMANDS = [
  { label: "📊 ยอดขายวันนี้", text: "สรุปยอดขายวันนี้" },
  { label: "🧾 5 บิลล่าสุด", text: "ดู 5 บิลล่าสุด" },
  { label: "📦 เช็คสต็อก", text: "เช็คสต็อกสินค้าคลังหลัก" },
  { label: "📲 ส่งรายงานเข้ากลุ่ม", text: "สรุปยอดขายวันนี้แล้วส่งรายงานเข้ากลุ่ม LINE" },
] as const;

const BILL_TYPES: Record<string, string> = {
  branch_sale: "ขายสาขา",
  transfer: "โอนสินค้า",
  special: "บิลพิเศษ",
  stock_in: "รับเข้าสต็อก",
};
export const billTypeLabel = (t?: string) => (t ? (BILL_TYPES[t] ?? t) : undefined);

export const fmtMoney = (v: number | string | undefined) => {
  if (v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && String(v).match(/^[\s฿0-9.,-]+$/) ? `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}` : String(v);
};

const t = (text: string, extra: Record<string, unknown> = {}) => ({ type: "text", text: text || "-", wrap: true, ...extra });
const row = (l: string, r: string, extra: Record<string, unknown> = {}) => ({
  type: "box",
  layout: "horizontal",
  contents: [t(l, { size: "sm", color: "#6B7280", flex: 3 }), t(r, { size: "sm", color: "#111827", align: "end", flex: 2, ...extra })],
});

export function buildReceiptFlex(r: ReceiptInput) {
  const accent = /^#[0-9a-f]{6}$/i.test(r.color ?? "") ? r.color! : "#0F766E";
  const time = r.time ?? new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
  const body: Record<string, unknown>[] = [];
  if (r.subtitle) body.push(t(r.subtitle, { size: "sm", color: "#374151", weight: "bold" }));
  if (r.billNo) body.push(row("เลขที่บิล", r.billNo));
  const items = (r.items ?? []).slice(0, 25);
  if (items.length) {
    body.push({ type: "separator", margin: "md" });
    for (const it of items) {
      const qty = it.qty !== undefined && it.qty !== "" ? ` × ${it.qty}` : "";
      body.push(row(`${it.name}${qty}`, it.price !== undefined ? fmtMoney(it.price) : ""));
    }
    if ((r.items ?? []).length > 25) body.push(t(`…และอีก ${(r.items ?? []).length - 25} รายการ`, { size: "xs", color: "#9CA3AF" }));
  }
  const lines = (r.lines ?? []).slice(0, 20);
  if (lines.length) {
    body.push({ type: "separator", margin: "md" });
    for (const l of lines) body.push(row(l.label, l.value));
  }
  if (r.total) {
    body.push({ type: "separator", margin: "md" });
    body.push({
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [t("ยอดรวมสุทธิ", { weight: "bold", size: "md", flex: 3 }), t(fmtMoney(r.total), { weight: "bold", size: "lg", color: accent, align: "end", flex: 3 })],
    });
  }
  if (r.note) body.push(t(`📝 ${r.note}`, { size: "xs", color: "#6B7280", margin: "md" }));
  if (!body.length) body.push(t("ไม่มีรายละเอียด", { size: "sm", color: "#9CA3AF" }));

  const header = {
    type: "box",
    layout: "vertical",
    backgroundColor: accent,
    paddingAll: "16px",
    spacing: "xs",
    contents: [
      ...(r.badge || r.storeName
        ? [t([r.storeName, r.badge].filter(Boolean).join(" · "), { size: "xs", color: "#FFFFFFCC" })]
        : []),
      t(r.title, { size: "lg", weight: "bold", color: "#FFFFFF" }),
    ],
  };
  const altParts = [r.title, r.subtitle, r.total ? `รวม ${fmtMoney(r.total)}` : ""].filter(Boolean);
  return {
    type: "flex",
    altText: altParts.join(" · ").slice(0, 390) || "รายงาน",
    contents: {
      type: "bubble",
      size: "mega",
      header,
      body: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", contents: body },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [t(`🕒 ${time}`, { size: "xxs", color: "#9CA3AF", align: "center" })],
      },
    },
  };
}

export function quickReply(items: { label: string; text: string }[]) {
  return {
    items: items.slice(0, 13).map((i) => ({ type: "action", action: { type: "message", label: i.label.slice(0, 20), text: i.text.slice(0, 300) } })),
  };
}
