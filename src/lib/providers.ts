// Shared (browser-safe) metadata for the AI providers used by the rotation engine.
export type ProviderId = "gemini" | "groq" | "openrouter";

export const PROVIDERS: Record<
  ProviderId,
  { label: string; baseURL: string; defaultModel: string; keyUrl: string; keyPrefix: string }
> = {
  gemini: {
    label: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    keyUrl: "https://aistudio.google.com/apikey",
    keyPrefix: "AIza",
  },
  groq: {
    label: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    keyUrl: "https://console.groq.com/keys",
    keyPrefix: "gsk_",
  },
  openrouter: {
    label: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    keyUrl: "https://openrouter.ai/keys",
    keyPrefix: "sk-or-",
  },
};

export const PROVIDER_ORDER: ProviderId[] = ["gemini", "groq", "openrouter"];

/** Guess the provider from the API key prefix; null when unknown. */
export function detectProvider(key: string): ProviderId | null {
  const k = key.trim();
  for (const id of PROVIDER_ORDER) if (k.startsWith(PROVIDERS[id].keyPrefix)) return id;
  return null;
}

/** How long a key rests after a rate-limit (429) before it is tried again. */
export const COOLDOWN_MS = 60_000;
