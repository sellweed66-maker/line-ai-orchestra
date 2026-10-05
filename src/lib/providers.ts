// Shared (browser-safe) metadata for the AI providers used by the rotation engine.
export type ProviderId = "gemini" | "groq" | "openrouter";

export const PROVIDERS: Record<
  ProviderId,
  { label: string; role: string; baseURL: string; defaultModel: string; keyUrl: string }
> = {
  gemini: {
    label: "Google Gemini",
    role: "หลัก",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    keyUrl: "https://aistudio.google.com/apikey",
  },
  groq: {
    label: "Groq",
    role: "สำรอง 1",
    baseURL: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    keyUrl: "https://console.groq.com/keys",
  },
  openrouter: {
    label: "OpenRouter",
    role: "สำรอง 2",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    keyUrl: "https://openrouter.ai/keys",
  },
};

export const PROVIDER_ORDER: ProviderId[] = ["gemini", "groq", "openrouter"];
