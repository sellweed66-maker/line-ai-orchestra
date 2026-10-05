import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Bot, ChevronDown, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolvePending, sendChat } from "@/lib/hub.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: () => {
    const { threadId } = Route.useParams();
    return <ChatWindow key={threadId} threadId={threadId} />;
  },
});

type Meta = {
  provider?: string;
  tools?: { name: string; app?: string; action: string; ok: boolean; output: string }[];
  pendingIds?: string[];
  attempts?: { provider: string; ok: boolean; error?: string }[];
};

function ChatWindow({ threadId }: { threadId: string }) {
  const qc = useQueryClient();
  const send = useServerFn(sendChat);
  const [text, setText] = useState("");
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const { data: msgs } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_messages").select("*").eq("thread_id", threadId).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const { data: pendings } = useQuery({
    queryKey: ["pending", threadId],
    queryFn: async () => (await supabase.from("pending_actions").select("*").eq("thread_id", threadId)).data ?? [],
  });

  useEffect(() => ref.current?.focus(), []);
  useEffect(() => bottom.current?.scrollIntoView({ block: "end" }), [msgs, optimistic]);

  const submit = async () => {
    const t = text.trim();
    if (!t || optimistic) return;
    setText("");
    setOptimistic(t);
    try {
      await send({ data: { threadId, text: t } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      await qc.invalidateQueries({ queryKey: ["messages", threadId] });
      await qc.invalidateQueries({ queryKey: ["pending", threadId] });
      qc.invalidateQueries({ queryKey: ["threads"] });
      setOptimistic(null);
      ref.current?.focus();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to="/chat"><ArrowLeft className="size-4" /> ห้องแชต</Link>
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
          {(msgs ?? []).length === 0 && !optimistic && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Bot className="mx-auto mb-3 size-8 text-primary" />
              ลองพิมพ์ เช่น "ยอดขายวันนี้เท่าไหร่" หรือ "ส่งสรุปยอดเข้าไลน์กลุ่ม"
            </div>
          )}
          {(msgs ?? []).map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
                {m.content}
              </div>
            ) : (
              <AssistantMsg key={m.id} content={m.content} meta={m.meta as Meta} pendings={pendings ?? []} threadId={threadId} />
            ),
          )}
          {optimistic && (
            <>
              <div className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
                {optimistic}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> AI กำลังทำงาน...
              </div>
            </>
          )}
          <div ref={bottom} />
        </div>
      </div>
      <div className="border-t border-border p-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="พิมพ์คำสั่งเป็นภาษาไทย..."
            rows={1}
            className="max-h-40 min-h-11 resize-none"
          />
          <Button size="icon" className="size-11 shrink-0" onClick={submit} disabled={!text.trim() || !!optimistic} aria-label="ส่ง">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssistantMsg({
  content, meta, pendings, threadId,
}: { content: string; meta: Meta; pendings: { id: string; status: string; app_name: string | null; action: string; params: unknown }[]; threadId: string }) {
  const [open, setOpen] = useState(false);
  const mine = pendings.filter((p) => meta?.pendingIds?.includes(p.id));
  return (
    <div className="max-w-[92%] space-y-2">
      <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
      {mine.map((p) => <PendingCard key={p.id} p={p} threadId={threadId} />)}
      {(meta?.tools?.length || meta?.provider) && (
        <div className="text-xs text-muted-foreground">
          <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1">
            {meta.provider && <span>via {meta.provider}</span>}
            {!!meta.tools?.length && <span>· {meta.tools.length} เครื่องมือ</span>}
            {meta.attempts?.some((a) => !a.ok) && <span>· สลับ AI อัตโนมัติ</span>}
            <ChevronDown className="size-3" />
          </button>
          {open && (
            <div className="mt-2 space-y-1 rounded-lg border border-border p-2">
              {meta.attempts?.filter((a) => !a.ok).map((a, i) => <div key={i}>⚠ {a.provider}: {a.error}</div>)}
              {meta.tools?.map((t, i) => (
                <div key={i}>
                  {t.ok ? "✓" : "✗"} {t.app} / {t.action}: <span className="break-all">{t.output.slice(0, 300)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PendingCard({ p, threadId }: { p: { id: string; status: string; app_name: string | null; action: string; params: unknown }; threadId: string }) {
  const resolve = useServerFn(resolvePending);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const act = async (approve: boolean) => {
    setBusy(true);
    try {
      const r = await resolve({ data: { id: p.id, approve } });
      r.ok ? toast.success(approve ? "ดำเนินการแล้ว" : "ยกเลิกแล้ว") : toast.error(r.message);
    } catch (e) {
      toast.error((e as Error).message);
    }
    await qc.invalidateQueries({ queryKey: ["pending", threadId] });
    await qc.invalidateQueries({ queryKey: ["messages", threadId] });
    setBusy(false);
  };
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4 text-destructive" /> คำสั่งเสี่ยง: {p.action} ({p.app_name})
      </div>
      <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-xs">{JSON.stringify(p.params, null, 2)}</pre>
      {p.status === "pending" ? (
        <div className="mt-3 flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={busy}>ยืนยัน</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ยืนยันการทำคำสั่งนี้?</AlertDialogTitle>
                <AlertDialogDescription>
                  {p.action} บนแอพ {p.app_name} — การกระทำนี้อาจย้อนกลับไม่ได้
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ไม่ใช่ตอนนี้</AlertDialogCancel>
                <AlertDialogAction onClick={() => act(true)}>ยืนยันดำเนินการ</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act(false)}>ยกเลิก</Button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">สถานะ: {p.status}</p>
      )}
    </div>
  );
}
