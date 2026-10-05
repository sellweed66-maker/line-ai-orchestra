import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, MessageCircle, RefreshCw, Satellite, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Hub — ศูนย์กลางควบคุมแอพดาวเทียมด้วย AI และ LINE" },
      { name: "description", content: "สั่งงานทุกแอพของร้านด้วยภาษาไทยผ่าน AI แชต และ LINE พร้อมสลับโมเดลอัตโนมัติ" },
      { property: "og:title", content: "AI Hub — ศูนย์กลางควบคุมแอพด้วย AI" },
      { property: "og:description", content: "สั่งงานแอพของร้านด้วยภาษาไทย ผ่านแชต AI และ LINE" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: RefreshCw, t: "สลับ AI อัตโนมัติ", d: "Gemini → Groq → OpenRouter ไม่สะดุดเมื่อโควตาเต็ม" },
  { icon: Satellite, t: "คุมแอพดาวเทียม", d: "ซิงก์เครื่องมือจากแอพของร้าน แล้วสั่งด้วยภาษาพูด" },
  { icon: MessageCircle, t: "สั่งผ่าน LINE", d: "พิมพ์สั่งงานในไลน์ และรับสรุปยอดขายเข้ากลุ่ม" },
  { icon: ShieldCheck, t: "ปลอดภัย ย้อนดูได้", d: "ยืนยันก่อนลบ/แก้ไขทุกครั้ง พร้อม Log และ Export CSV" },
];

function Index() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex max-w-5xl flex-col px-5 py-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Bot className="size-5" />
            </span>
            AI Hub
          </div>
          <Button asChild variant="ghost">
            <Link to="/auth">เข้าสู่ระบบ</Link>
          </Button>
        </header>

        <section className="py-16 md:py-24">
          <p className="mb-4 inline-block rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            ศูนย์กลางควบคุมแอพของร้าน
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            สั่งงานทุกแอพของร้าน
            <br />
            <span className="text-primary">ด้วยประโยคเดียว</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            พิมพ์ภาษาไทยธรรมดา ทั้งในแชตและใน LINE แล้วให้ AI ไปดึงยอดขาย ค้นบิล หรือจัดการข้อมูลให้ทันที
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link to="/chat">
                เริ่มใช้งาน <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.t} className="bg-card p-6">
              <f.icon className="mb-4 size-5 text-primary" />
              <h3 className="font-display font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
