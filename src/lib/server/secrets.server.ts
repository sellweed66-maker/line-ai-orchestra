// Server-only access to the secret_store table (no browser grants exist on it).
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

export async function getAdmin(): Promise<Db> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

export async function getSecret(db: Db, userId: string, kind: string, ref = ""): Promise<string | null> {
  const { data, error } = await db
    .from("secret_store")
    .select("value")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("ref", ref)
    .maybeSingle();
  if (error) throw error;
  return (data?.value as string | undefined) ?? null;
}

export async function setSecret(db: Db, userId: string, kind: string, ref: string, value: string) {
  const { error } = await db
    .from("secret_store")
    .upsert({ user_id: userId, kind, ref, value, updated_at: new Date().toISOString() }, { onConflict: "user_id,kind,ref" });
  if (error) throw error;
}

export async function deleteSecret(db: Db, userId: string, kind: string, ref: string) {
  const { error } = await db.from("secret_store").delete().eq("user_id", userId).eq("kind", kind).eq("ref", ref);
  if (error) throw error;
}

export function hint(value: string) {
  return value.length <= 4 ? "••••" : `••••${value.slice(-4)}`;
}

export type { Db };
