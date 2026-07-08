import type { UserSettings } from "@prisma/client";

export function resolveProvider(settings: UserSettings): {
  provider: "openai" | "anthropic" | "groq";
  apiKey: string | null;
} {
  const provider =
    settings.preferredProvider === "anthropic"
      ? "anthropic"
      : settings.preferredProvider === "groq"
      ? "groq"
      : "openai";

  // Prefer the user's own key if they've set one in Settings. Otherwise,
  // fall back to a shared server-side key (set as an env var on the
  // hosting platform) so new signups can chat with zero manual setup.
  const userKey =
    provider === "anthropic"
      ? settings.anthropicApiKey
      : provider === "groq"
      ? settings.groqApiKey
      : settings.openaiApiKey;

  const fallbackKey =
    provider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : provider === "groq"
      ? process.env.GROQ_API_KEY
      : process.env.OPENAI_API_KEY;

  const apiKey = userKey || fallbackKey || null;

  return { provider, apiKey };
}

