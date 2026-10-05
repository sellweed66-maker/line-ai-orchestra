import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function useAuthUser() {
  return useRouteContext({ from: "/_authenticated" }).user;
}

export type AppSettings = {
  user_id: string;
  store_name: string;
  primary_color: string;
  theme: string;
  logo_type: string;
  logo_icon: string;
  logo_url: string | null;
};

export function useAppSettings() {
  const user = useAuthUser();
  return useQuery({
    queryKey: ["app_settings", user.id],
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase.from("app_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      if (data) return data as AppSettings;
      const { data: ins, error: e2 } = await supabase.from("app_settings").upsert({ user_id: user.id }).select().single();
      if (e2) throw e2;
      return ins as AppSettings;
    },
  });
}
