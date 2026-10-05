import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { useAppSettings } from "@/hooks/use-hub";
import { NAV_ITEMS } from "@/lib/nav";
import { applyTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: s } = useAppSettings();
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (s) applyTheme(s.primary_color, s.theme);
  }, [s]);

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex h-dvh bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <Logo type={s?.logo_type} icon={s?.logo_icon} url={s?.logo_url} />
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold">{s?.store_name ?? "AI Hub"}</p>
            <p className="text-xs text-muted-foreground">AI Hub</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "!bg-primary/10 !text-primary font-medium" }}
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={signOut}>
            <LogOut className="size-4" /> ออกจากระบบ
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:hidden">
          <Logo type={s?.logo_type} icon={s?.logo_icon} url={s?.logo_url} className="size-8" />
          <p className="flex-1 truncate font-display font-semibold">{s?.store_name ?? "AI Hub"}</p>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="ออกจากระบบ">
            <LogOut className="size-4" />
          </Button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        {/* Mobile bottom nav */}
        <nav className="grid grid-cols-6 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
          {NAV_ITEMS.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground"
              activeProps={{ className: "!text-primary font-medium" }}
            >
              <n.icon className="size-5" />
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">{children}</div>;
}

export function StatusDot({ status }: { status: string }) {
  const map: Record<string, { c: string; t: string }> = {
    online: { c: "bg-success", t: "ออนไลน์" },
    offline: { c: "bg-destructive", t: "ออฟไลน์" },
    error: { c: "bg-destructive", t: "ผิดพลาด" },
    unknown: { c: "bg-muted-foreground/40", t: "ยังไม่ตรวจ" },
  };
  const m = map[status] ?? map.unknown;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`size-2 rounded-full ${m.c}`} />
      {m.t}
    </span>
  );
}
