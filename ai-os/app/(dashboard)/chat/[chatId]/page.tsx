import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChatView } from "@/components/chat/chat-view";

export default async function ChatConversationPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  const session = await getServerSession(authOptions);
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });

  if (!chat || chat.userId !== session?.user.id) {
    notFound();
  }

  return <ChatView chatId={chatId} />;
}
