"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Square, Loader2, Sparkles } from "lucide-react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { Button } from "@/components/ui/button";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Summarize my week and suggest priorities",
  "Draft a friendly follow-up email",
  "Explain a concept like I'm five",
  "Write a short plan to learn a new skill",
];

export function ChatView({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    setStreamingText(null);
    setLoadingHistory(true);

    fetch(`/api/chats/${chatId}/messages`)
      .then((res) => res.json())
      .then((json) => setMessages(json.messages ?? []))
      .finally(() => setLoadingHistory(false));
  }, [chatId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function runStream(
    url: string,
    body?: unknown,
    onDone?: () => void
  ) {
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSending(true);
    setStreamingText("");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;
        setStreamingText(acc);
      }

      if (acc.startsWith("[[ERROR]]")) {
        toast.error(acc.replace("[[ERROR]]", ""));
      } else if (acc.trim().length > 0) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: acc },
        ]);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error("Something went wrong while generating a response.");
      }
    } finally {
      setStreamingText(null);
      setIsSending(false);
      abortRef.current = null;
      window.dispatchEvent(new Event("chat:updated"));
      onDone?.();
    }
  }

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isSending) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content },
    ]);

    await runStream(`/api/chats/${chatId}/messages`, { content });
  }

  async function handleRegenerate() {
    if (isSending) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") return prev.slice(0, -1);
      return prev;
    });
    await runStream(`/api/chats/${chatId}/regenerate`);
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  const lastMessage = messages[messages.length - 1];

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-1">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 py-6">
          {loadingHistory && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loadingHistory && messages.length === 0 && !streamingText && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Start a conversation
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask anything, or try one of these:
                </p>
              </div>
              <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="rounded-xl border border-border p-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              showRegenerate={m.role === "assistant" && m.id === lastMessage?.id && i === messages.length - 1}
              onRegenerate={handleRegenerate}
            />
          ))}

          {streamingText !== null && (
            <MessageBubble role="assistant" content={streamingText} isStreaming />
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      <div className="border-t border-border bg-background/80 p-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message AI Personal OS…"
            rows={1}
            className="max-h-40 flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {isSending ? (
            <Button onClick={handleStop} variant="secondary" size="icon" className="shrink-0">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => handleSend()}
              size="icon"
              className="shrink-0"
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
          AI can make mistakes. Add your API key in Settings if you haven&apos;t already.
        </p>
      </div>
    </div>
  );
}
