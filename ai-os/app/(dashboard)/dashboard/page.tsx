import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  StickyNote,
  ListChecks,
  CalendarDays,
  Plus,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [chatCount, noteCount, openTaskCount, upcomingEventCount, recentNotes, recentTasks] =
    await Promise.all([
      prisma.chat.count({ where: { userId } }),
      prisma.note.count({ where: { userId } }),
      prisma.task.count({ where: { userId, status: { not: "done" } } }),
      prisma.event.count({
        where: { userId, startAt: { gte: new Date() } },
      }),
      prisma.note.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 4,
      }),
      prisma.task.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    ]);

  const stats = [
    { label: "Conversations", value: chatCount, icon: MessageSquare, href: "/chat" },
    { label: "Notes", value: noteCount, icon: StickyNote, href: "/notes" },
    { label: "Open tasks", value: openTaskCount, icon: ListChecks, href: "/tasks" },
    { label: "Upcoming events", value: upcomingEventCount, icon: CalendarDays, href: "/calendar" },
  ];

  const quickActions = [
    { label: "New chat", href: "/chat", icon: MessageSquare },
    { label: "New note", href: "/notes", icon: StickyNote },
    { label: "New task", href: "/tasks", icon: ListChecks },
    { label: "New event", href: "/calendar", icon: CalendarDays },
  ];

  const hasActivity = recentNotes.length > 0 || recentTasks.length > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Welcome back{session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening across your workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="glass-panel transition-transform hover:-translate-y-0.5">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Button key={action.label} asChild variant="outline">
              <Link href={action.href}>
                <Plus className="h-4 w-4" />
                {action.label}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasActivity ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
              <p className="text-sm font-medium">Nothing here yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                As you take notes and create tasks, your recent activity will show up here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recent notes
                </p>
                <div className="space-y-1">
                  {recentNotes.length === 0 && (
                    <p className="text-sm text-muted-foreground">No notes yet</p>
                  )}
                  {recentNotes.map((note) => (
                    <Link
                      key={note.id}
                      href="/notes"
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <span className="truncate">{note.title || "Untitled note"}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(note.updatedAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recent tasks
                </p>
                <div className="space-y-1">
                  {recentTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground">No tasks yet</p>
                  )}
                  {recentTasks.map((task) => (
                    <Link
                      key={task.id}
                      href="/tasks"
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <span className="truncate">{task.title}</span>
                      <Badge variant={task.status === "done" ? "success" : "secondary"}>
                        {task.status.replace("_", " ")}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
