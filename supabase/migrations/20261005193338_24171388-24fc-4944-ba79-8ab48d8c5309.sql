CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.app_settings (
  user_id uuid PRIMARY KEY,
  store_name text NOT NULL DEFAULT 'AI Hub',
  primary_color text NOT NULL DEFAULT 'emerald',
  theme text NOT NULL DEFAULT 'light',
  logo_type text NOT NULL DEFAULT 'icon',
  logo_icon text NOT NULL DEFAULT 'Satellite',
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.app_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  priority int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  model text NOT NULL,
  has_key boolean NOT NULL DEFAULT false,
  key_hint text,
  last_status text NOT NULL DEFAULT 'unknown',
  last_error text,
  last_used_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_providers TO authenticated;
GRANT ALL ON public.ai_providers TO service_role;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own providers" ON public.ai_providers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.satellite_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  base_url text NOT NULL,
  has_key boolean NOT NULL DEFAULT false,
  tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'unknown',
  last_checked_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.satellite_apps TO authenticated;
GRANT ALL ON public.satellite_apps TO service_role;
ALTER TABLE public.satellite_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own apps" ON public.satellite_apps FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.line_settings (
  user_id uuid PRIMARY KEY,
  has_token boolean NOT NULL DEFAULT false,
  has_secret boolean NOT NULL DEFAULT false,
  target_id text,
  owner_line_ids text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_settings TO authenticated;
GRANT ALL ON public.line_settings TO service_role;
ALTER TABLE public.line_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own line" ON public.line_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'แชตใหม่',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own threads" ON public.chat_threads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.chat_messages (thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.chat_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  thread_id uuid,
  code text NOT NULL,
  source text NOT NULL DEFAULT 'web',
  app_id uuid,
  app_name text,
  action text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text,
  status text NOT NULL DEFAULT 'pending',
  result text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_actions TO authenticated;
GRANT ALL ON public.pending_actions TO service_role;
ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pending" ON public.pending_actions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.command_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'web',
  command text NOT NULL,
  app_name text,
  action text,
  provider text,
  status text NOT NULL DEFAULT 'success',
  result text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.command_logs (user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.command_logs TO authenticated;
GRANT ALL ON public.command_logs TO service_role;
ALTER TABLE public.command_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs read" ON public.command_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own logs insert" ON public.command_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.secret_store (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  ref text NOT NULL DEFAULT '',
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref)
);
GRANT ALL ON public.secret_store TO service_role;
ALTER TABLE public.secret_store ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER t1 BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t2 BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t3 BEFORE UPDATE ON public.satellite_apps FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t4 BEFORE UPDATE ON public.line_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t5 BEFORE UPDATE ON public.chat_threads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "logo read" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "logo write own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "logo update own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);