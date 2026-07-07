"use client";

import { useState } from "react";
import { Bot, Check, Copy, RotateCcw, User } from "lucide-react";
import { Markdown } from "@/components/chat/markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MessageBubble({
  role,
  content,
  isStreaming,
  showRegenerate,
  onRegenerate,
}: {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  showRegenerate?: boolean;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn("group flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("flex max-w-[85%] flex-col gap-1.5", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "bg-primary text-primary-foreground"
              : "glass-panel"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <>
              <Markdown content={content} />
              {isStreaming && (
                <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground/60 align-middle" />
              )}
            </>
          )}
        </div>

        {!isStreaming && content && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            {showRegenerate && onRegenerate && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRegenerate}>
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
