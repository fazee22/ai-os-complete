"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pin,
  Trash2,
  Loader2,
  Sparkles,
  Wand2,
  Languages,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate } from "@/lib/utils";

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string;
  pinned: boolean;
  updatedAt: string;
};

export function NotesWorkspace() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadNotes(q?: string) {
    setLoading(true);
    const res = await fetch(`/api/notes${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const json = await res.json();
    setNotes(json.notes ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadNotes(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  async function handleCreate() {
    const res = await fetch("/api/notes", { method: "POST" });
    if (!res.ok) {
      toast.error("Could not create note");
      return;
    }
    const json = await res.json();
    setNotes((prev) => [json.note, ...prev]);
    setSelectedId(json.note.id);
  }

  function updateLocalNote(id: string, patch: Partial<Note>) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }

  function scheduleSave(id: string, patch: Partial<Note>) {
    updateLocalNote(id, patch);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistNote(id, patch), 700);
  }

  async function persistNote(id: string, patch: Partial<Note>) {
    setSavingId(id);
    const res = await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSavingId(null);
    if (!res.ok) toast.error("Could not save note");
  }

  async function handleTogglePin(note: Note) {
    updateLocalNote(note.id, { pinned: !note.pinned });
    await persistNote(note.id, { pinned: !note.pinned });
    loadNotes(search);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete note");
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  async function handleAiAction(action: "summarize" | "rewrite" | "translate") {
    if (!selectedNote) return;
    let targetLanguage: string | undefined;
    if (action === "translate") {
      targetLanguage = window.prompt("Translate to which language?", "Spanish") || undefined;
      if (!targetLanguage) return;
    }

    setAiLoading(true);
    const res = await fetch(`/api/notes/${selectedNote.id}/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, targetLanguage }),
    });
    const json = await res.json();
    setAiLoading(false);

    if (!res.ok) {
      toast.error(json.error ?? "AI action failed");
      return;
    }

    if (action === "summarize") {
      const withSummary = `${selectedNote.content}\n\n---\n**Summary:** ${json.result}`;
      scheduleSave(selectedNote.id, { content: withSummary });
    } else {
      scheduleSave(selectedNote.id, { content: json.result });
    }
    toast.success("Done");
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] gap-4">
      {/* List */}
      <div className="flex w-full max-w-xs shrink-0 flex-col border-r border-border pr-3">
        <div className="mb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button size="icon" onClick={handleCreate} title="New note">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto scrollbar-thin">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && notes.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No notes yet.
            </p>
          )}

          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => setSelectedId(note.id)}
              className={cn(
                "block w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                selectedId === note.id
                  ? "bg-primary/10"
                  : "hover:bg-accent"
              )}
            >
              <div className="flex items-center gap-1.5">
                {note.pinned && <Pin className="h-3 w-3 shrink-0 fill-current text-primary" />}
                <p className="truncate text-sm font-medium">{note.title || "Untitled note"}</p>
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {note.content.replace(/[#*_`]/g, "") || "No content"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatDate(note.updatedAt)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!selectedNote ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">No note selected</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a note from the list, or create a new one.
              </p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4" /> New note
            </Button>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center gap-2">
              <Input
                value={selectedNote.title}
                onChange={(e) => scheduleSave(selectedNote.id, { title: e.target.value })}
                placeholder="Note title"
                className="border-none px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
              />
              <div className="flex shrink-0 items-center gap-1">
                {savingId === selectedNote.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleTogglePin(selectedNote)}
                  title={selectedNote.pinned ? "Unpin" : "Pin"}
                >
                  <Pin className={cn("h-4 w-4", selectedNote.pinned && "fill-current text-primary")} />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={aiLoading}>
                      {aiLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      AI actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAiAction("summarize")}>
                      <FileText className="h-4 w-4" /> Summarize
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAiAction("rewrite")}>
                      <Wand2 className="h-4 w-4" /> Rewrite
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAiAction("translate")}>
                      <Languages className="h-4 w-4" /> Translate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(selectedNote.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Input
              value={selectedNote.tags}
              onChange={(e) => scheduleSave(selectedNote.id, { tags: e.target.value })}
              placeholder="Tags, comma separated (e.g. work, ideas)"
              className="mb-3 h-8 max-w-sm text-xs"
            />

            <textarea
              value={selectedNote.content}
              onChange={(e) => scheduleSave(selectedNote.id, { content: e.target.value })}
              placeholder="Start writing…"
              className="flex-1 resize-none rounded-xl border border-border bg-background p-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring scrollbar-thin"
            />
          </div>
        )}
      </div>
    </div>
  );
}
