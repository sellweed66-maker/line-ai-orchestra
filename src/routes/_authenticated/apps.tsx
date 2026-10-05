import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkAllApps, deleteApp, saveApp, syncTools } from "@/lib/hub.functions";
import { Page, PageHeader, StatusDot } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/apps")({
  head: () => ({ meta: [{ title: "แอพดาวเทียม — AI Hub" }] }),
  component: AppsPage,
});

type App = { id: string; name: string; base_url: string; has_key: boolean; tools: { action: string; description: string }[]; status: string; last_synced_at: string | null };

function AppsPage() {
  const qc = useQueryClient();
  const sync = useServerFn(syncTools);
  const del = useServerFn(deleteApp);
  const check = useServerFn(checkAllApps);
  const [edit, setEdit] = useState<Partial<App> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["apps"],
    queryFn: async () => ((await supabase.from("satellite_apps").select("*").order("created_at")).data ?? []) as unknown as App[],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["apps"] });

  return (
    <Page>
      <PageHeader
        title="แอพดาวเทียม"
        desc="เชื่อมแอพของร้าน แล้วกด Sync Tools ให้ AI รู้จักเครื่องมือ"
        actions={
          <>
            <Button variant="outline" onClick={async () => { setBusy("all"); await check(); await refresh(); setBusy(null); }} disabled={busy === "all"}>
              <RefreshCw className="size-4" /> ตรวจสถานะ
            </Button>
            <Button onClick={() => setEdit({})}><Plus className="size-4" /> เพิ่มแอพ</Button>
          </>
        }
      />
      <div className="space-y-3">
        {(data ?? []).length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">ยังไม่มีแอพ</p>}
        {(data ?? []).map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{a.name}</p>
                <p className="truncate text-xs text-muted-foreground">{a.base_url}</p>
                <div className="mt-1 flex gap-3"><StatusDot status={a.status} /><span className="text-xs text-muted-foreground">{a.tools.length} เครื่องมือ</span></div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={busy === a.id} onClick={async () => {
                  setBusy(a.id);
                  const r = await sync({ data: { id: a.id } });
                  r.ok ? toast.success(r.message) : toast.error(r.message);
                  await refresh(); setBusy(null);
                }}>
                  <RefreshCw className={`size-3.5 ${busy === a.id ? "animate-spin" : ""}`} /> Sync Tools
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setEdit(a)} aria-label="แก้ไข"><Pencil className="size-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="ลบ" onClick={async () => {
                  if (!confirm(`ลบแอพ ${a.name}?`)) return;
                  await del({ data: { id: a.id } }); refresh();
                }}><Trash2 className="size-4" /></Button>
              </div>
            </div>
            {a.tools.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.tools.map((t) => <span key={t.action} title={t.description} className="rounded-md bg-muted px-2 py-0.5 text-xs">{t.action}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
      {edit && <AppDialog app={edit} onClose={() => { setEdit(null); refresh(); }} />}
    </Page>
  );
}

function AppDialog({ app, onClose }: { app: Partial<App>; onClose: () => void }) {
  const save = useServerFn(saveApp);
  const [name, setName] = useState(app.name ?? "");
  const [url, setUrl] = useState(app.base_url ?? "");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{app.id ? "แก้ไขแอพ" : "เพิ่มแอพดาวเทียม"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>ชื่อแอพ</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Base URL</Label><Input placeholder="https://myshop.example.com" value={url} onChange={(e) => setUrl(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Agent API Key</Label>
            <Input type="password" placeholder={app.has_key ? "บันทึกไว้แล้ว — เว้นว่างเพื่อใช้ค่าเดิม" : ""} value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={busy} onClick={async () => {
            setBusy(true);
            try { await save({ data: { id: app.id, name, base_url: url, apiKey: key || undefined } }); toast.success("บันทึกแล้ว"); onClose(); }
            catch (e) { toast.error((e as Error).message); }
            setBusy(false);
          }}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
