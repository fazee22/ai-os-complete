"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  Sparkles,
  Search,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/chat/markdown";

type KbDocument = {
  id: string;
  title: string;
  sourceType: string;
  createdAt: string;
  _count: { chunks: number };
};

type Source = { index: number; documentId: string; title: string; snippet: string };

export function KnowledgeBaseWorkspace() {
  const [documents, setDocuments] = useState<KbDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadDocuments() {
    setLoading(true);
    const res = await fetch("/api/knowledge-base/documents");
    const json = await res.json();
    setDocuments(json.documents ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function uploadFiles(fileList: FileList) {
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/knowledge-base/documents", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? `Could not upload ${file.name}`);
      }
    }
    setUploading(false);
    loadDocuments();
  }

  async function handleDelete(doc: KbDocument) {
    if (!window.confirm(`Delete "${doc.title}" from your knowledge base?`)) return;
    const res = await fetch(`/api/knowledge-base/documents/${doc.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete document");
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  }

  async function handleAsk() {
    if (!query.trim() || asking) return;
    setAsking(true);
    setAnswer(null);
    setSources([]);

    const res = await fetch("/api/knowledge-base/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    setAsking(false);

    if (!res.ok) {
      toast.error(json.error ?? "Search failed");
      return;
    }
    setAnswer(json.answer);
    setSources(json.sources ?? []);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload documents, then ask questions answered from their content.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
                placeholder="Ask something about your documents…"
                rows={1}
                className="max-h-32 w-full resize-none rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button onClick={handleAsk} disabled={asking || !query.trim()}>
              {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Ask
            </Button>
          </div>

          {answer && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <Markdown content={answer} />
              {sources.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Sources</p>
                  {sources.map((s) => (
                    <div key={s.index} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">[{s.index}] {s.title}</span>
                      {" — "}
                      {s.snippet}…
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed p-4 transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border"
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium">Documents ({documents.length})</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No documents yet</p>
            <p className="text-xs text-muted-foreground">
              Drop .txt, .md, .pdf, or .docx files here, or click Upload
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline">{doc.sourceType}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {doc._count.chunks} chunks
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
