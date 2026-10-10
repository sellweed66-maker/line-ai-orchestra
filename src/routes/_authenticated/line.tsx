import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getIngestKey, saveLine, sendLineTest } from "@/lib/hub.functions";
import { useAuthUser } from "@/hooks/use-hub";
import { Page, PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/line")({
  head: () => ({ meta: [{ title: "LINE — AI Hub" }] }),
  component: LinePage,
});

function LinePage() {
  const user = useAuthUser();
  const save = useServerFn(saveLine);
  const test = useServerFn(sendLineTest);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["line"],
    queryFn: async () => (await supabase.from("line_settings").select("*").maybeSingle()).data,
  });
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [target, setTarget] = useState("");
  const [owners, setOwners] = useState("");
  useEffect(() => {
    if (data) { setTarget(data.target_id ?? ""); setOwners((data.owner_line_ids ?? []).join("\n")); }
  }, [data]);
  const webhook = typeof window !== "undefined" ? `${window.location.origin}/api/public/line/${user.id}` : "";

  return (
    <Page>
      <PageHeader title="LINE Integration" desc="สั่ง AI ผ่าน LINE และส่งสรุปยอดขายเข้ากลุ่ม" />
      <div className="space-y-5 rounded-xl border border-border bg-card p-5">
        <div className="space-y-1.5">
          <Label>Webhook URL (นำไปใส่ใน LINE Developers → Messaging API)</Label>
          <div className="flex gap-2">
            <Input readOnly value={webhook} />
            <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(webhook); toast.success("คัดลอกแล้ว"); }} aria-label="คัดลอก"><Copy className="size-4" /></Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Channel Access Token</Label><Input type="password" placeholder={data?.has_token ? "บันทึกไว้แล้ว" : ""} value={token} onChange={(e) => setToken(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Channel Secret</Label><Input type="password" placeholder={data?.has_secret ? "บันทึกไว้แล้ว" : ""} value={secret} onChange={(e) => setSecret(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Group ID / User ID สำหรับส่งรายงาน</Label><Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="C... หรือ U..." /></div>
        <div className="space-y-1.5">
          <Label>User ID เจ้าของร้านที่อนุญาตให้สั่งงาน (บรรทัดละ 1)</Label>
          <Textarea rows={3} value={owners} onChange={(e) => setOwners(e.target.value)} />
          <p className="text-xs text-muted-foreground">ไม่รู้ ID? พิมพ์ "myid" หาบอทในไลน์ (ในกลุ่มจะได้ Group ID ด้วย) — คำสั่งเสี่ยงต้องพิมพ์ "ยืนยัน รหัส" ก่อนทำ</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {

            try {
              await save({ data: { token: token || undefined, secret: secret || undefined, target_id: target, owner_line_ids: owners.split(/\s+/).filter(Boolean) } });
              setToken(""); setSecret(""); toast.success("บันทึกแล้ว"); qc.invalidateQueries({ queryKey: ["line"] });
            } catch (e) { toast.error((e as Error).message); }
          }}>บันทึก</Button>
          <Button variant="outline" onClick={async () => { const r = await test({ data: { kind: "text" } }); r.ok ? toast.success(r.message) : toast.error(r.message); }}>ทดสอบส่งข้อความ</Button>
          <Button variant="outline" onClick={async () => { const r = await test({ data: { kind: "report" } }); r.ok ? toast.success(r.message) : toast.error(r.message); }}>ส่งรายงานตัวอย่าง</Button>
        </div>
      </div>
      <IngestCard userId={user.id} />
    </Page>
  );
}

function IngestCard({ userId }: { userId: string }) {
  const getKey = useServerFn(getIngestKey);
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/api/public/bill/${userId}` : "";
  const load = async (rotate = false) => {
    setBusy(true);
    try {
      const r = await getKey({ data: { rotate } });
      setKey(r.key);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };
  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("คัดลอกแล้ว"); };
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="font-medium">รับบิลอัตโนมัติจากแอพหน้าร้าน</h2>
        <p className="text-sm text-muted-foreground">ตั้งให้แอพหน้าร้าน (เช่น ObwangnoiOG) ส่งบิลมาที่ลิงก์นี้ ระบบจะส่งการ์ดใบเสร็จเข้ากลุ่ม LINE ทันที</p>
      </div>
      <div className="space-y-1.5">
        <Label>Webhook URL สำหรับรับบิล</Label>
        <div className="flex gap-2">
          <Input readOnly value={url} />
          <Button variant="outline" size="icon" onClick={() => copy(url)} aria-label="คัดลอก"><Copy className="size-4" /></Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>รหัสลับ (Ingest Key)</Label>
        <div className="flex flex-wrap gap-2">
          <Input readOnly value={key ?? "••••••••••••••••"} className="max-w-sm" type={key ? "text" : "password"} />
          {key && <Button variant="outline" size="icon" onClick={() => copy(key)} aria-label="คัดลอก"><Copy className="size-4" /></Button>}
          <Button variant="outline" disabled={busy} onClick={() => load(false)}>{key ? "แสดงอีกครั้ง" : "สร้าง / แสดงรหัส"}</Button>
          <Button variant="outline" disabled={busy} onClick={() => load(true)}>เปลี่ยนรหัสใหม่</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          แอพหน้าร้านต้องแนบ header <code>x-hub-signature</code> = hex(HMAC-SHA256(รหัสลับ, เนื้อ JSON)) ทุกครั้งที่ส่งบิล
        </p>
      </div>
    </div>
  );
}
