import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureProviders, reorderProviders, saveProvider, testProvider } from "@/lib/hub.functions";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import { Page, PageHeader, StatusDot } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/ai-settings")({
  head: () => ({ meta: [{ title: "AI Settings — AI Hub" }] }),
  component: AiSettings,
});

type Row = { provider: ProviderId; enabled: boolean; model: string; has_key: boolean; key_hint: string | null; last_status: string; last_error: string | null; priority: number };

function AiSettings() {
  const ensure = useServerFn(ensureProviders);
  const reorder = useServerFn(reorderProviders);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      await ensure();
      return ((await supabase.from("ai_providers").select("*").order("priority")).data ?? []) as Row[];
    },
  });
  const move = async (i: number, d: number) => {
    const list = [...(data ?? [])];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await reorder({ data: { order: list.map((r) => r.provider) } });
    qc.invalidateQueries({ queryKey: ["providers"] });
  };
  return (
    <Page>
      <PageHeader title="AI Settings" desc="ระบบยิงหาตัวบนสุดก่อน ถ้าติด Rate limit / โควตาเต็ม / Error จะสลับไปตัวถัดไปอัตโนมัติ ใช้เฉพาะตัวที่มี Key และเปิดอยู่" />
      <div className="space-y-3">
        {(data ?? []).map((r, i) => (
          <ProviderCard key={r.provider} row={r} index={i} onMove={move} />
        ))}
      </div>
    </Page>
  );
}

function ProviderCard({ row, index, onMove }: { row: Row; index: number; onMove: (i: number, d: number) => void }) {
  const save = useServerFn(saveProvider);
  const test = useServerFn(testProvider);
  const qc = useQueryClient();
  const [key, setKey] = useState("");
  const [model, setModel] = useState(row.model);
  const [busy, setBusy] = useState(false);
  useEffect(() => setModel(row.model), [row.model]);
  const cfg = PROVIDERS[row.provider];
  const doSave = async (patch: Partial<{ enabled: boolean; clearKey: boolean }> = {}) => {
    setBusy(true);
    try {
      await save({ data: { provider: row.provider, enabled: patch.enabled ?? row.enabled, model, apiKey: key || undefined, clearKey: patch.clearKey } });
      setKey("");
      toast.success("บันทึกแล้ว");
    } catch (e) { toast.error((e as Error).message); }
    await qc.invalidateQueries({ queryKey: ["providers"] });
    setBusy(false);
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
        <div className="flex-1">
          <p className="font-medium">{cfg.label}</p>
          <div className="flex gap-3"><StatusDot status={row.has_key ? row.last_status : "unknown"} /><span className="text-xs text-muted-foreground">{row.has_key ? `Key ${row.key_hint}` : "ยังไม่มี Key"}</span></div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => onMove(index, -1)} aria-label="ขึ้น"><ArrowUp className="size-4" /></Button>
        <Button size="icon" variant="ghost" onClick={() => onMove(index, 1)} aria-label="ลง"><ArrowDown className="size-4" /></Button>
        <Switch checked={row.enabled} onCheckedChange={(v) => doSave({ enabled: v })} />
      </div>
      {row.last_error && row.last_status === "error" && <p className="mt-2 text-xs text-destructive">{row.last_error}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>API Key <a className="text-primary underline" href={cfg.keyUrl} target="_blank" rel="noreferrer">ขอ Key</a></Label>
          <Input type="password" placeholder={row.has_key ? "บันทึกไว้แล้ว — ใส่ใหม่เพื่อเปลี่ยน" : "วาง API Key"} value={key} onChange={(e) => setKey(e.target.value)} />
        </div>
        <div className="space-y-1.5"><Label>โมเดล</Label><Input value={model} onChange={(e) => setModel(e.target.value)} /></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => doSave()}>บันทึก</Button>
        <Button size="sm" variant="outline" disabled={busy || !row.has_key} onClick={async () => {
          setBusy(true);
          const r = await test({ data: { provider: row.provider } });
          r.ok ? toast.success(r.message) : toast.error(r.message);
          await qc.invalidateQueries({ queryKey: ["providers"] });
          setBusy(false);
        }}>ทดสอบการเชื่อมต่อ</Button>
        {row.has_key && <Button size="sm" variant="ghost" disabled={busy} onClick={() => doSave({ clearKey: true })}>ลบ Key</Button>}
      </div>
    </div>
  );
}
