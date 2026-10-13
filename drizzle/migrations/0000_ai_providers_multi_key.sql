ALTER TABLE public.ai_providers DROP CONSTRAINT IF EXISTS ai_providers_user_id_provider_key;
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS label text NOT NULL DEFAULT '';
ALTER TABLE public.ai_providers ADD COLUMN IF NOT EXISTS cooldown_until timestamptz;
CREATE INDEX IF NOT EXISTS ai_providers_user_priority ON public.ai_providers (user_id, priority);