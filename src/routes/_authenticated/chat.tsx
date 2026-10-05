import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-hub";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "แชตสั่งงาน — AI Hub" }] }),
  component: ChatLayout,
});

export function useThreads() {
  return useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_threads").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function ThreadList({ className }: { className?: string }) {
  const user = useAuthUser();
  const { data } = useThreads();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };
  const create = async () => {
    const { data: t, error } = await supabase.from("chat_threads").insert({ user_id: user.id }).select("id").single();
    if (error) return;
    await qc.invalidateQueries({ queryKey: ["threads"] });
    navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
  };
  const del = async (id: string) => {
    if (!confirm("ลบห้องแชตนี้?")) return;
    await supabase.from("chat_threads").delete().eq("id", id);
    await qc.invalidateQueries({ queryKey: ["threads"] });
    if (params.threadId === id) navigate({ to: "/chat" });
  };
  return (
    <div className={cn("flex flex-col gap-2 p-3", className)}>
      <Button onClick={create} className="w-full">
        <Plus className="size-4" /> แชตใหม่
      </Button>
      {(data ?? []).map((t) => (
        <div
          key={t.id}
          className={cn(
            "group flex items-center rounded-lg text-sm hover:bg-accent",
            params.threadId === t.id && "bg-primary/10 text-primary",
          )}
        >
          <Link to="/chat/$threadId" params={{ threadId: t.id }} className="flex-1 truncate px-3 py-2.5">
            {t.title}
          </Link>
          <button onClick={() => del(t.id)} className="p-2 text-muted-foreground opacity-60 hover:opacity-100" aria-label="ลบ">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ChatLayout() {
  return (
    <div className="flex h-full">
      <ThreadList className="hidden w-64 shrink-0 overflow-y-auto border-r border-border md:flex" />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
