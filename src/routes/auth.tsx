import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — AI Hub" },
      { name: "description", content: "เข้าสู่ระบบ AI Hub เพื่อจัดการแอพของร้าน" },
      { property: "og:title", content: "เข้าสู่ระบบ — AI Hub" },
      { property: "og:description", content: "เข้าสู่ระบบ AI Hub" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/chat" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/chat" },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/chat" });
        else setSent(true);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Bot className="size-6" />
          </span>
          <h1 className="font-display text-2xl font-semibold">AI Hub</h1>
        </div>
        {sent ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm">
            ส่งลิงก์ยืนยันไปที่ <b>{email}</b> แล้ว กรุณาเปิดอีเมลเพื่อยืนยันก่อนเข้าสู่ระบบ
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "in" | "up")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="in">เข้าสู่ระบบ</TabsTrigger>
                <TabsTrigger value="up">สมัครใช้งาน</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">รหัสผ่าน</Label>
              <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "in" ? "เข้าสู่ระบบ" : "สมัครใช้งาน"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
