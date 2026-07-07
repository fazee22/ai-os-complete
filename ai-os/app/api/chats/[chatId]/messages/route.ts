import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
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

async function getOwnedChat(chatId: string, userId: string) {
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.userId !== userId) return null;
  return chat;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;
  const chat = await getOwnedChat(chatId, session.user.id);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}

const sendSchema = z.object({ content: z.string().min(1).max(8000) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;
  const chat = await getOwnedChat(chatId, session.user.id);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const parsed = sendSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });

  const { provider, apiKey } = resolveProvider(settings);

  await prisma.message.create({
    data: { chatId: chat.id, role: "user", content: parsed.data.content },
  });

  const priorMessages = await prisma.message.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "asc" },
  });

  const isFirstMessage = priorMessages.length === 1;
  if (isFirstMessage) {
    const title = parsed.data.content.slice(0, 60);
    await prisma.chat.update({ where: { id: chat.id }, data: { title } });
  } else {
    await prisma.chat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });
  }

  const conversation: ChatMessageInput[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...priorMessages.map((m) => ({
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
        console.error("[CHAT_STREAM_ERROR]", error);
      } finally {
        if (fullText.trim().length > 0) {
          await prisma.message.create({
            data: { chatId: chat.id, role: "assistant", content: fullText },
          });
        }
        controller.close();
      }
    },
    cancel() {
      // Client aborted (Stop generation) - the abort signal already
      // propagates to the provider call via `signal` above.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
