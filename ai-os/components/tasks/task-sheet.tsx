"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type Subtask = { id: string; title: string; done: boolean };
export type Task = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high";
  category: string;
  status: "todo" | "in_progress" | "done";
  subtasks: Subtask[];
};

export function TaskSheet({
  task,
  open,
  onOpenChange,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (task: Task) => void;
  onUpdated: (task: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const isEditing = !!task;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [category, setCategory] = useState("general");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [saving, setSaving] = useState(false);
  const [breakingDown, setBreakingDown] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
      setPriority(task.priority);
      setCategory(task.category);
      setSubtasks(task.subtasks);
    } else {
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("medium");
      setCategory("general");
      setSubtasks([]);
    }
  }, [task, open]);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Give the task a title");
      return;
    }
    setSaving(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      category: category.trim() || "general",
    };

    const res = await fetch(isEditing ? `/api/tasks/${task!.id}` : "/api/tasks", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast.error(json.error ?? "Could not save task");
      return;
    }

    if (isEditing) {
      onUpdated(json.task);
    } else {
      onCreated(json.task);
    }
    onOpenChange(false);
  }

  async function handleAddSubtask() {
    const value = newSubtask.trim();
    if (!value || !task) return;
    setNewSubtask("");

    const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: value }),
    });
    if (!res.ok) {
      toast.error("Could not add subtask");
      return;
    }
    const json = await res.json();
    const updated = [...subtasks, json.subtask];
    setSubtasks(updated);
    onUpdated({ ...task, subtasks: updated });
  }

  async function handleToggleSubtask(subtask: Subtask) {
    if (!task) return;
    const updated = subtasks.map((s) =>
      s.id === subtask.id ? { ...s, done: !s.done } : s
    );
    setSubtasks(updated);
    onUpdated({ ...task, subtasks: updated });

    await fetch(`/api/tasks/${task.id}/subtasks/${subtask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !subtask.done }),
    });
  }

  async function handleDeleteSubtask(subtask: Subtask) {
    if (!task) return;
    const updated = subtasks.filter((s) => s.id !== subtask.id);
    setSubtasks(updated);
    onUpdated({ ...task, subtasks: updated });

    await fetch(`/api/tasks/${task.id}/subtasks/${subtask.id}`, { method: "DELETE" });
  }

  async function handleBreakdown() {
    if (!task) return;
    setBreakingDown(true);
    const res = await fetch(`/api/tasks/${task.id}/breakdown`, { method: "POST" });
    const json = await res.json();
    setBreakingDown(false);

    if (!res.ok) {
      toast.error(json.error ?? "Could not generate breakdown");
      return;
    }

    const updated = [...subtasks, ...json.subtasks];
    setSubtasks(updated);
    onUpdated({ ...task, subtasks: updated });
    toast.success("Subtasks generated");
  }

  async function handleDelete() {
    if (!task) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete task");
      return;
    }
    onDeleted(task.id);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto scrollbar-thin">
        <h2 className="mb-4 font-display text-lg font-semibold">
          {isEditing ? "Edit task" : "New task"}
        </h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-desc">Description</Label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-background p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-category">Category</Label>
            <Input id="task-category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save changes" : "Create task"}
          </Button>

          {isEditing && (
            <>
              <div className="border-t border-border pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <Label>Subtasks</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBreakdown}
                    disabled={breakingDown}
                  >
                    {breakingDown ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    AI breakdown
                  </Button>
                </div>

                <div className="space-y-1.5">
                  {subtasks.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5"
                    >
                      <input
                        type="checkbox"
                        checked={s.done}
                        onChange={() => handleToggleSubtask(s)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className={cn("flex-1 text-sm", s.done && "text-muted-foreground line-through")}>
                        {s.title}
                      </span>
                      <button
                        onClick={() => handleDeleteSubtask(s)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex gap-2">
                  <Input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                    placeholder="Add a subtask…"
                    className="h-8 text-sm"
                  />
                  <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={handleAddSubtask}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                onClick={handleDelete}
                className="w-full text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Delete task
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
