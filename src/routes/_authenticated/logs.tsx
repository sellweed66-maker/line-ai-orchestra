import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv } from "@/lib/csv";
import { Page, PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/logs")({
  head: () => ({ meta: [{ title: "ประวัติคำสั่ง — AI Hub" }] }),
  component: LogsPage,
});

const stamp = () => new Date().toISOString().slice(0, 10);

function LogsPage() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => (await supabase.from("command_logs").select("*").order("created_at", { ascending: false }).limit(1000)).data ?? [],
  });
  const rows = (data ?? []).filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  const exp = async (table: "command_logs" | "satellite_apps" | "chat_messages" | "pending_actions") => {
    const cols = table === "satellite_apps" ? "id,name,base_url,status,tools,last_synced_at,created_at" : "*";
    const { data } = await supabase.from(table).select(cols).limit(10000);
    downloadCsv(`${table}-${stamp()}.csv`, (data ?? []) as unknown as Record<string, unknown>[]);
  };
  return (
    <Page>
      <PageHeader title="ประวัติคำสั่ง" desc="ทุกคำสั่งที่ AI ทำ ย้อนดูและ Export ได้" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => exp("command_logs")}><Download className="size-3.5" /> Log CSV</Button>
        <Button size="sm" variant="outline" onClick={() => exp("satellite_apps")}><Download className="size-3.5" /> แอพ CSV</Button>
        <Button size="sm" variant="outline" onClick={() => exp("chat_messages")}><Download className="size-3.5" /> แชต CSV</Button>
        <Button size="sm" variant="outline" onClick={() => exp("pending_actions")}><Download className="size-3.5" /> คำสั่งยืนยัน CSV</Button>
      </div>
      <Input placeholder="ค้นหา..." value={q} onChange={(e) => setQ(e.target.value)} className="mb-4" />
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">ยังไม่มีประวัติ</p>}
        {rows.map((r) => (
          <div key={r.id} className="p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{new Date(r.created_at).toLocaleString("th-TH")}</span>
              <span className="rounded bg-muted px-1.5">{r.source}</span>
              {r.app_name && <span>{r.app_name} / {r.action}</span>}
              <span className={r.status === "success" ? "text-success" : "text-destructive"}>{r.status}</span>
            </div>
            <p className="mt-1 font-medium">{r.command}</p>
            {r.result && <p className="mt-1 line-clamp-3 break-all text-xs text-muted-foreground">{r.result}</p>}
          </div>
        ))}
      </div>
    </Page>
  );
}
