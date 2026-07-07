"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Folder,
  FolderPlus,
  Upload,
  Search,
  Trash2,
  Pencil,
  Sparkles,
  Loader2,
  File as FileIcon,
  ChevronRight,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type FolderItem = { id: string; name: string };
type FileItem = {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  aiSummary: string | null;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesWorkspace() {
  const [breadcrumb, setBreadcrumb] = useState<FolderItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFolderId = breadcrumb[breadcrumb.length - 1]?.id ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    const foldersRes = await fetch(
      `/api/folders?parentId=${currentFolderId ?? ""}`
    );
    const filesRes = await fetch(
      search
        ? `/api/files?q=${encodeURIComponent(search)}`
        : `/api/files?folderId=${currentFolderId ?? ""}`
    );
    const foldersJson = await foldersRes.json();
    const filesJson = await filesRes.json();
    setFolders(search ? [] : foldersJson.folders ?? []);
    setFiles(filesJson.files ?? []);
    setLoading(false);
  }, [currentFolderId, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  function enterFolder(folder: FolderItem) {
    setSearch("");
    setBreadcrumb((prev) => [...prev, folder]);
  }
  function goToBreadcrumb(index: number) {
    setSearch("");
    setBreadcrumb((prev) => prev.slice(0, index + 1));
  }
  function goHome() {
    setSearch("");
    setBreadcrumb([]);
  }

  async function handleNewFolder() {
    const name = window.prompt("Folder name")?.trim();
    if (!name) return;
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId: currentFolderId }),
    });
    if (!res.ok) {
      toast.error("Could not create folder");
      return;
    }
    load();
  }

  async function handleRenameFolder(folder: FolderItem) {
    const name = window.prompt("Rename folder", folder.name)?.trim();
    if (!name || name === folder.name) return;
    const res = await fetch(`/api/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      toast.error("Could not rename folder");
      return;
    }
    load();
  }

  async function handleDeleteFolder(folder: FolderItem) {
    if (!window.confirm(`Delete folder "${folder.name}"?`)) return;
    const res = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Could not delete folder");
      return;
    }
    load();
  }

  async function uploadFiles(fileList: FileList) {
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      if (currentFolderId) formData.append("folderId", currentFolderId);

      const res = await fetch("/api/files", { method: "POST", body: formData });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? `Could not upload ${file.name}`);
      }
    }
    setUploading(false);
    load();
  }

  async function handleRenameFile(file: FileItem) {
    const name = window.prompt("Rename file", file.name)?.trim();
    if (!name || name === file.name) return;
    const res = await fetch(`/api/files/${file.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      toast.error("Could not rename file");
      return;
    }
    load();
  }

  async function handleDeleteFile(file: FileItem) {
    if (!window.confirm(`Delete "${file.name}"?`)) return;
    const res = await fetch(`/api/files/${file.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete file");
      return;
    }
    load();
  }

  async function handleSummarize(file: FileItem) {
    setSummarizingId(file.id);
    const res = await fetch(`/api/files/${file.id}/summary`, { method: "POST" });
    const json = await res.json();
    setSummarizingId(null);

    if (!res.ok) {
      toast.error(json.error ?? "Could not summarize file");
      return;
    }
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, aiSummary: json.summary } : f))
    );
    toast.success("Summary ready");
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Files</h1>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <button onClick={goHome} className="flex items-center gap-1 hover:text-foreground">
              <Home className="h-3.5 w-3.5" /> Home
            </button>
            {breadcrumb.map((b, i) => (
              <span key={b.id} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5" />
                <button onClick={() => goToBreadcrumb(i)} className="hover:text-foreground">
                  {b.name}
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search all files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 pl-9"
            />
          </div>
          <Button variant="outline" onClick={handleNewFolder}>
            <FolderPlus className="h-4 w-4" /> Folder
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
        </div>
      </div>

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
          dragOver ? "border-primary bg-primary/5" : "border-transparent"
        )}
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drop files here or click Upload</p>
            <p className="text-xs text-muted-foreground">Max 20MB per file</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {folders.map((folder) => (
              <Card key={folder.id} className="group relative">
                <button
                  onClick={() => enterFolder(folder)}
                  className="flex w-full flex-col items-center gap-2 p-5"
                >
                  <Folder className="h-8 w-8 text-primary" />
                  <span className="max-w-full truncate text-sm font-medium">{folder.name}</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger className="absolute right-1.5 top-1.5 rounded-md p-1 opacity-0 outline-none hover:bg-accent group-hover:opacity-100">
                    <Pencil className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleRenameFolder(folder)}>
                      <Pencil className="h-4 w-4" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteFolder(folder)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            ))}

            {files.map((file) => {
              const isImage = file.mimeType.startsWith("image/");
              return (
                <Card key={file.id} className="group relative overflow-hidden">
                  <a href={file.path} target="_blank" rel="noreferrer" className="block">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.path} alt={file.name} className="h-28 w-full object-cover" />
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center bg-muted">
                        <FileIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </a>
                  <CardContent className="p-3">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                    {file.aiSummary && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                        {file.aiSummary}
                      </p>
                    )}
                  </CardContent>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="absolute right-1.5 top-1.5 rounded-md bg-background/80 p-1 opacity-0 outline-none hover:bg-accent group-hover:opacity-100">
                      <Pencil className="h-3.5 w-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleSummarize(file)}
                        disabled={summarizingId === file.id}
                      >
                        {summarizingId === file.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        AI summary
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRenameFile(file)}>
                        <Pencil className="h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteFile(file)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
