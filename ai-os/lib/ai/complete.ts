import { prisma } from "@/lib/prisma";
import { streamAssistantReply, type ChatMessageInput } from "@/lib/ai/providers";
import { resolveProvider } from "@/lib/ai/resolve-provider";

/**
 * Runs a single prompt against the user's configured AI provider and
 * returns the full text (collects the stream internally). Used for
 * quick one-shot actions like Note summarize/rewrite/translate and
 * Task AI breakdown, where a streaming UI isn't needed.
 */
export async function runCompletion({
  userId,
  systemPrompt,
  userPrompt,
}: {
  userId: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const { provider, apiKey } = resolveProvider(settings);

  const messages: ChatMessageInput[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  let result = "";
  for await (const chunk of streamAssistantReply({ provider, apiKey, messages })) {
    result += chunk;
  }
  return result.trim();
}
