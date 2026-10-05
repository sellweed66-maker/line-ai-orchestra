import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings, useAuthUser, type AppSettings } from "@/hooks/use-hub";
import { COLOR_PRESETS, applyTheme } from "@/lib/theme";
import { ICONS } from "@/lib/icon-registry";
import { Logo } from "@/components/brand/Logo";
import { Page, PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/appearance")({
  head: () => ({ meta: [{ title: "หน้าตา — AI Hub" }] }),
  component: AppearancePage,
});

async function resizeToDataUrl(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const s = Math.min(img.width, img.height);
  c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 128, 128);
  return c.toDataURL("image/png");
}

function AppearancePage() {
  const user = useAuthUser();
  const { data } = useAppSettings();
  const qc = useQueryClient();
  const [s, setS] = useState<AppSettings | null>(null);
  useEffect(() => { if (data) setS(data); }, [data]);
  if (!s) return null;
  const set = (p: Partial<AppSettings>) => { const n = { ...s, ...p }; setS(n); applyTheme(n.primary_color, n.theme); };
  const save = async () => {
    const { error } = await supabase.from("app_settings").update({
      store_name: s.store_name, primary_color: s.primary_color, theme: s.theme, logo_type: s.logo_type, logo_icon: s.logo_icon, logo_url: s.logo_url,
    }).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("บันทึกแล้ว");
    qc.invalidateQueries({ queryKey: ["app_settings"] });
  };
  return (
    <Page>
      <PageHeader title="Appearance" desc="ปรับชื่อร้าน สี โหมด และโลโก้" actions={<Button onClick={save}>บันทึก</Button>} />
      <div className="space-y-6 rounded-xl border border-border bg-card p-5">
        <div className="space-y-1.5"><Label>ชื่อร้าน</Label><Input value={s.store_name} onChange={(e) => set({ store_name: e.target.value })} /></div>
        <div className="space-y-2">
          <Label>โหมด</Label>
          <div className="flex gap-2">
            <Button variant={s.theme === "light" ? "default" : "outline"} onClick={() => set({ theme: "light" })}><Sun className="size-4" /> Light</Button>
            <Button variant={s.theme === "dark" ? "default" : "outline"} onClick={() => set({ theme: "dark" })}><Moon className="size-4" /> Dark</Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>โทนสีหลัก</Label>
          <div className="flex flex-wrap gap-3">
            {Object.entries(COLOR_PRESETS).map(([k, p]) => (
              <button key={k} onClick={() => set({ primary_color: k })} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", s.primary_color === k ? "border-primary" : "border-border")}>
                <span className="size-4 rounded-full" style={{ background: p.light }} />{p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>โลโก้</Label>
          <div className="flex items-center gap-3">
            <Logo type={s.logo_type} icon={s.logo_icon} url={s.logo_url} className="size-14" />
            <label className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
              อัปโหลดรูป
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) set({ logo_type: "image", logo_url: await resizeToDataUrl(f) });
              }} />
            </label>
          </div>
          <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
            {Object.entries(ICONS).map(([name, Icon]) => (
              <button key={name} onClick={() => set({ logo_type: "icon", logo_icon: name })} aria-label={name}
                className={cn("grid aspect-square place-items-center rounded-lg border", s.logo_type === "icon" && s.logo_icon === name ? "border-primary bg-primary/10 text-primary" : "border-border")}>
                <Icon className="size-5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}
