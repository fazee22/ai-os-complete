"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, CalendarClock, ListChecks } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskSheet, type Task } from "@/components/tasks/task-sheet";
import { cn, formatDate } from "@/lib/utils";

const COLUMNS: { key: Task["status"]; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

const PRIORITY_STYLES: Record<Task["priority"], "secondary" | "warning" | "destructive"> = {
  low: "secondary",
  medium: "warning",
  high: "destructive",
};

const CHART_COLORS = ["hsl(255 65% 58%)", "hsl(38 92% 50%)", "hsl(160 60% 38%)"];

export function TasksWorkspace() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  async function loadTasks() {
    setLoading(true);
    const res = await fetch("/api/tasks");
    const json = await res.json();
    setTasks(json.tasks ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
  }, []);

  function openNewTask() {
    setActiveTask(null);
    setSheetOpen(true);
  }

  function openTask(task: Task) {
    setActiveTask(task);
    setSheetOpen(true);
  }

  function handleCreated(task: Task) {
    setTasks((prev) => [task, ...prev]);
  }

  function handleUpdated(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    setActiveTask(task);
  }

  function handleDeleted(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleStatusChange(task: Task, status: Task["status"]) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) toast.error("Could not update status");
  }

  const chartData = useMemo(() => {
    const counts = { todo: 0, in_progress: 0, done: 0 };
    tasks.forEach((t) => counts[t.status]++);
    return [
      { name: "To do", value: counts.todo },
      { name: "In progress", value: counts.in_progress },
      { name: "Done", value: counts.done },
    ].filter((d) => d.value > 0);
  }, [tasks]);

  const overdueCount = useMemo(
    () =>
      tasks.filter(
        (t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < new Date()
      ).length,
    [tasks]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tasks.length} total · {overdueCount} overdue
          </p>
        </div>
        <Button onClick={openNewTask}>
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task analytics</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-medium text-muted-foreground">{col.label}</h3>
                <Badge variant="secondary">
                  {tasks.filter((t) => t.status === col.key).length}
                </Badge>
              </div>

              <div className="space-y-2">
                {tasks
                  .filter((t) => t.status === col.key)
                  .map((task) => {
                    const doneCount = task.subtasks.filter((s) => s.done).length;
                    const isOverdue =
                      task.status !== "done" &&
                      task.dueDate &&
                      new Date(task.dueDate) < new Date();

                    return (
                      <Card
                        key={task.id}
                        className="cursor-pointer transition-shadow hover:shadow-md"
                        onClick={() => openTask(task)}
                      >
                        <CardContent className="space-y-2 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{task.title}</p>
                            <Badge variant={PRIORITY_STYLES[task.priority]} className="shrink-0">
                              {task.priority}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{task.category}</Badge>
                            {task.dueDate && (
                              <span className={cn("flex items-center gap-1", isOverdue && "text-destructive")}>
                                <CalendarClock className="h-3 w-3" />
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                            {task.subtasks.length > 0 && (
                              <span className="flex items-center gap-1">
                                <ListChecks className="h-3 w-3" />
                                {doneCount}/{task.subtasks.length}
                              </span>
                            )}
                          </div>

                          <Select
                            value={task.status}
                            onValueChange={(v) => handleStatusChange(task, v as Task["status"])}
                          >
                            <SelectTrigger
                              className="h-7 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent onClick={(e) => e.stopPropagation()}>
                              <SelectItem value="todo">To do</SelectItem>
                              <SelectItem value="in_progress">In progress</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>
                    );
                  })}

                {tasks.filter((t) => t.status === col.key).length === 0 && (
                  <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    Nothing here
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskSheet
        task={activeTask}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
