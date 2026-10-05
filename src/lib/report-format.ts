// Formats sales / bill summaries into an easy-to-read LINE text message.
export type ReportLine = { label: string; value: string };
export type ReportInput = {
  title: string;
  lines?: ReportLine[];
  total?: string;
  note?: string;
  storeName?: string;
};

export function formatReport(r: ReportInput): string {
  const date = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
  const out: string[] = [];
  out.push(`📊 ${r.title}`);
  if (r.storeName) out.push(`🏪 ${r.storeName}`);
  out.push(`🕒 ${date}`);
  out.push("━━━━━━━━━━━━");
  for (const l of r.lines ?? []) out.push(`• ${l.label}: ${l.value}`);
  if (r.total) {
    out.push("━━━━━━━━━━━━");
    out.push(`💰 รวม: ${r.total}`);
  }
  if (r.note) out.push("", `📝 ${r.note}`);
  return out.join("\n").slice(0, 4900);
}
