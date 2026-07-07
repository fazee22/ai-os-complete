import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  streamAssistantReply,
  MissingApiKeyError,
  type ChatMessageInput,
} from "@/lib/ai/providers";
import { resolveProvider } from "@/lib/ai/resolve-provider";

const SYSTEM_PROMPT =
  "You are a helpful, concise AI assistant inside a personal productivity app called AI Personal OS. Format code with markdown code fences.";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.userId !== session.user.id) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "asc" },
  });

  const lastMessage = messages[messages.length - 1];
  let history = messages;

  if (lastMessage?.role === "assistant") {
    await prisma.message.delete({ where: { id: lastMessage.id } });
    history = messages.slice(0, -1);
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });

  const { provider, apiKey } = resolveProvider(settings);

  const conversation: ChatMessageInput[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role as ChatMessageInput["role"],
      content: m.content,
    })),
  ];

  const encoder = new TextEncoder();
  let fullText = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamAssistantReply({
          provider,
          apiKey,
          messages: conversation,
          signal: req.signal,
        })) {
          fullText += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        const message =
          error instanceof MissingApiKeyError
            ? error.message
            : "The AI provider returned an error. Please try again.";
        if (!fullText) {
          controller.enqueue(encoder.encode(`[[ERROR]]${message}`));
        }
        console.error("[CHAT_REGENERATE_ERROR]", error);
      } finally {
        if (fullText.trim().length > 0) {
          await prisma.message.create({
            data: { chatId: chat.id, role: "assistant", content: fullText },
          });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
