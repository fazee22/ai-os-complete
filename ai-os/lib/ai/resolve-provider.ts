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

  const apiKey =
    provider === "anthropic"
      ? settings.anthropicApiKey
      : provider === "groq"
      ? settings.groqApiKey
      : settings.openaiApiKey;

  return { provider, apiKey };
}
