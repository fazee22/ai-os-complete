"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatIndexPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleNewChat() {
    setCreating(true);
    const res = await fetch("/api/chats", { method: "POST" });
    setCreating(false);
    if (!res.ok) return;
    const json = await res.json();
    router.push(`/chat/${json.chat.id}`);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <MessageSquarePlus className="h-7 w-7" />
      </div>
      <div>
        <h1 className="font-display text-lg font-semibold">Select or start a chat</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Pick a conversation from the sidebar, or start a new one.
        </p>
      </div>
      <Button onClick={handleNewChat} disabled={creating}>
        {creating && <Loader2 className="h-4 w-4 animate-spin" />}
        New chat
      </Button>
    </div>
  );
}
