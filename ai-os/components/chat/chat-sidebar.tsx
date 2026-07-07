"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export function ChatSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const activeChatId = pathname.startsWith("/chat/")
    ? pathname.split("/chat/")[1]?.split("/")[0]
    : undefined;
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const loadChats = useCallback(async () => {
    const res = await fetch("/api/chats");
    if (res.ok) {
      const json = await res.json();
      setChats(json.chats);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats, pathname]);

  useEffect(() => {
    window.addEventListener("chat:updated", loadChats);
    return () => window.removeEventListener("chat:updated", loadChats);
  }, [loadChats]);

  async function handleNewChat() {
    setCreating(true);
    const res = await fetch("/api/chats", { method: "POST" });
    setCreating(false);
    if (!res.ok) {
      toast.error("Could not create a new chat");
      return;
    }
    const json = await res.json();
    setChats((prev) => [json.chat, ...prev]);
    router.push(`/chat/${json.chat.id}`);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/chats/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete chat");
      return;
    }
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) router.push("/chat");
  }

  function startRename(chat: ChatSummary) {
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  }

  async function submitRename(id: string) {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;

    const res = await fetch(`/api/chats/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      toast.error("Could not rename chat");
      return;
    }
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  return (
    <aside className="flex w-full max-w-[16rem] shrink-0 flex-col border-r border-border pr-3">
      <Button onClick={handleNewChat} disabled={creating} className="mb-3 w-full">
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        New chat
      </Button>

      <div className="flex-1 space-y-1 overflow-y-auto scrollbar-thin">
        {loading && (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">Loading…</p>
        )}

        {!loading && chats.length === 0 && (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            No conversations yet.
          </p>
        )}

        {chats.map((chat) => (
          <div
            key={chat.id}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
              activeChatId === chat.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />

            {renamingId === chat.id ? (
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => submitRename(chat.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitRename(chat.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                className="h-7 px-1.5 text-sm"
              />
            ) : (
              <button
                onClick={() => router.push(`/chat/${chat.id}`)}
                className="min-w-0 flex-1 truncate text-left"
                title={chat.title}
              >
                {chat.title}
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger className="opacity-0 outline-none group-hover:opacity-100 data-[state=open]:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => startRename(chat)}>
                  <Pencil className="h-4 w-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(chat.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </aside>
  );
}
