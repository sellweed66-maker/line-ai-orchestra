import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addProvider, deleteProvider, diagnoseKeyError, reorderProviders, saveProvider, testProvider } from "@/lib/hub.functions";
import { PROVIDERS, PROVIDER_ORDER, detectProvider, type ProviderId } from "@/lib/providers";
import { Page, PageHeader, StatusDot } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/ai-settings")({
  head: () => ({ meta: [{ title: "AI Settings — AI Hub" }] }),
  component: AiSettings,
});

type Row = {
  id: string; provider: ProviderId; label: string; enabled: boolean; model: string; has_key: boolean;
  key_hint: string | null; last_status: string; last_error: string | null; priority: number; cooldown_until: string | null;
};

function AiSettings() {
  const reorder = useServerFn(reorderProviders);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => ((await supabase.from("ai_providers").select("*").order("priority")).data ?? []) as Row[],
  });
  const move = async (i: number, d: number) => {
    const list = [...(data ?? [])];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await reorder({ data: { order: list.map((r) => r.id) } });
    qc.invalidateQueries({ queryKey: ["providers"] });
  };
  return (
    <Page>
      <PageHeader title="AI Settings" desc="วาง API Key ได้ไม่จำกัด ระบบรู้ค่ายและเลือกโมเดลให้เอง ใช้ตัวบนสุดก่อน ถ้าติดโควตา/Error จะข้ามไปตัวถัดไป และพักตัวที่โควตาเต็ม 1 นาที" />
      <AddCard />
      <div className="mt-4 space-y-3">
        {(data ?? []).map((r, i) => (
          <ProviderCard key={r.id} row={r} index={i} onMove={move} />
        ))}
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มี AI — วาง API Key ด้านบนเพื่อเริ่มใช้งาน</p>}
      </div>
    </Page>
  );
}

function AddCard() {
  const add = useServerFn(addProvider);
  const qc = useQueryClient();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [pick, setPick] = useState<ProviderId | "">("");
  const [busy, setBusy] = useState(false);
  const detected = key.trim() ? detectProvider(key) : null;
  const provider = detected ?? (pick || null);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await add({ data: { apiKey: key.trim(), label: label.trim() || undefined, provider: provider ?? undefined } });
      toast.success(`เพิ่ม ${r.label} แล้ว`);
      setKey(""); setLabel(""); setPick("");
      await qc.invalidateQueries({ queryKey: ["providers"] });
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 flex items-center gap-2 font-medium"><Plus className="size-4" />เพิ่ม AI Key</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>API Key</Label>
          <Input type="password" placeholder="วาง API Key" value={key} onChange={(e) => setKey(e.target.value)} />
          {key.trim() && (
            <p className="text-xs text-muted-foreground">
              {detected ? `ตรวจพบ: ${PROVIDERS[detected].label} · โมเดล ${PROVIDERS[detected].defaultModel}` : "ระบุค่ายไม่ได้ — เลือกค่ายด้านล่าง"}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>ชื่อเรียก (ไม่ใส่ก็ได้)</Label>
          <Input placeholder="เช่น Gemini ร้านหลัก" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
      </div>
      {key.trim() && !detected && (
        <div className="mt-3 flex flex-wrap gap-2">
          {PROVIDER_ORDER.map((p) => (
            <Button key={p} size="sm" variant={pick === p ? "default" : "outline"} onClick={() => setPick(p)}>{PROVIDERS[p].label}</Button>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={busy || key.trim().length < 8 || !provider} onClick={submit}>เพิ่ม</Button>
        <span className="text-xs text-muted-foreground">
          ขอ Key: {PROVIDER_ORDER.map((p, i) => (
            <a key={p} className="text-primary underline" href={PROVIDERS[p].keyUrl} target="_blank" rel="noreferrer">{PROVIDERS[p].label}{i < PROVIDER_ORDER.length - 1 ? ", " : ""}</a>
          ))}
        </span>
      </div>
    </div>
  );
}

function ProviderCard({ row, index, onMove }: { row: Row; index: number; onMove: (i: number, d: number) => void }) {
  const save = useServerFn(saveProvider);
  const del = useServerFn(deleteProvider);
  const test = useServerFn(testProvider);
  const diagnose = useServerFn(diagnoseKeyError);
  const [lastErr, setLastErr] = useState<string | null>(null);
  const [diag, setDiag] = useState<string | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);
  const qc = useQueryClient();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const cfg = PROVIDERS[row.provider];
  const resting = row.cooldown_until && new Date(row.cooldown_until).getTime() > Date.now();
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast.error((e as Error).message); }
    await qc.invalidateQueries({ queryKey: ["providers"] });
    setBusy(false);
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{row.label || cfg?.label}</p>
          <p className="truncate text-xs text-muted-foreground">{cfg?.label} · {row.model}</p>
          <div className="flex gap-3">
            <StatusDot status={row.has_key ? row.last_status : "unknown"} />
            <span className="text-xs text-muted-foreground">{row.has_key ? `Key ${row.key_hint}` : "ยังไม่มี Key"}{resting ? " · พักโควตา" : ""}</span>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => onMove(index, -1)} aria-label="ขึ้น"><ArrowUp className="size-4" /></Button>
        <Button size="icon" variant="ghost" onClick={() => onMove(index, 1)} aria-label="ลง"><ArrowDown className="size-4" /></Button>
        <Switch checked={row.enabled} onCheckedChange={(v) => run(() => save({ data: { id: row.id, enabled: v } }))} />
      </div>
      {(lastErr || (row.last_error && row.last_status === "error")) && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-destructive">{lastErr || row.last_error}</p>
          <Button size="sm" variant="outline" disabled={diagBusy} onClick={async () => {
            setDiagBusy(true); setDiag(null);
            try {
              const r = await diagnose({ data: { provider: cfg?.label ?? row.provider, model: row.model, error: (lastErr || row.last_error || "").slice(0, 4000) } });
              setDiag(r.text);
            } catch (e) { toast.error((e as Error).message); }
            setDiagBusy(false);
          }}>{diagBusy ? "กำลังวิเคราะห์..." : "วิเคราะห์ข้อผิดพลาดด้วย AI"}</Button>
          {diag && (
            <div className="rounded-lg border border-border bg-muted p-3 text-sm">
              <p className="whitespace-pre-wrap">{diag}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(diag); toast.success("คัดลอกแล้ว"); }}>คัดลอก</Button>
                <Button size="sm" variant="ghost" onClick={() => setDiag(null)}>ปิด</Button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Input className="h-8 min-w-0 flex-1" type="password" placeholder="เปลี่ยน Key (วางใหม่)" value={key} onChange={(e) => setKey(e.target.value)} />
        {key.trim() && <Button size="sm" disabled={busy} onClick={() => run(async () => { await save({ data: { id: row.id, apiKey: key } }); setKey(""); toast.success("บันทึกแล้ว"); })}>บันทึก</Button>}
        <Button size="sm" variant="outline" disabled={busy || !row.has_key} onClick={() => run(async () => {
          const r = await test({ data: { id: row.id } });
          if (r.ok) { setLastErr(null); toast.success(r.message); } else { setLastErr(r.message); toast.error(r.message); }
        })}>ทดสอบ</Button>
        <Button size="sm" variant="ghost" disabled={busy} aria-label="ลบ" onClick={() => {
          if (confirm(`ลบ ${row.label || cfg?.label}?`)) run(() => del({ data: { id: row.id } }));
        }}><Trash2 className="size-4" /></Button>
      </div>
    </div>
  );
}
