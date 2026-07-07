import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessageInput {
  role: ChatRole;
  content: string;
}

const OPENAI_MODEL = "gpt-4o-mini";
const ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export class MissingApiKeyError extends Error {
  constructor(provider: string) {
    super(
      `No ${provider} API key configured. Add one in Settings > API keys.`
    );
    this.name = "MissingApiKeyError";
  }
}

/**
 * Streams assistant text chunks from the selected provider.
 * Yields plain string fragments as they arrive.
 */
export async function* streamAssistantReply({
  provider,
  apiKey,
  messages,
  signal,
}: {
  provider: "openai" | "anthropic" | "groq";
  apiKey: string | null | undefined;
  messages: ChatMessageInput[];
  signal?: AbortSignal;
}): AsyncGenerator<string> {
  if (!apiKey) {
    const label =
      provider === "openai" ? "OpenAI" : provider === "anthropic" ? "Anthropic" : "Groq";
    throw new MissingApiKeyError(label);
  }

  if (provider === "openai" || provider === "groq") {
    const client = new OpenAI(
      provider === "groq"
        ? { apiKey, baseURL: "https://api.groq.com/openai/v1" }
        : { apiKey }
    );
    const stream = await client.chat.completions.create(
      {
        model: provider === "groq" ? GROQ_MODEL : OPENAI_MODEL,
        stream: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      },
      { signal }
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
    return;
  }

  // Anthropic
  const client = new Anthropic({ apiKey });
  const systemMessage = messages.find((m) => m.role === "system")?.content;
  const conversation = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const stream = client.messages.stream(
    {
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: systemMessage,
      messages: conversation,
    },
    { signal }
  );

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
