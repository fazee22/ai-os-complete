import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runCompletion } from "@/lib/ai/complete";
import { MissingApiKeyError } from "@/lib/ai/providers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.userId !== session.user.id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  try {
    const raw = await runCompletion({
      userId: session.user.id,
      systemPrompt:
        "You break tasks into 3-6 concrete, actionable subtasks. Respond with ONLY a JSON array of short subtask title strings, nothing else. No markdown, no numbering, no explanation.",
      userPrompt: `Task: ${task.title}${task.description ? `\nDetails: ${task.description}` : ""}`,
    });

    let titles: string[] = [];
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        titles = parsed.filter((t) => typeof t === "string").slice(0, 8);
      }
    } catch {
      // Fallback: split by newlines if the model didn't return clean JSON
      titles = raw
        .split("\n")
        .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 8);
    }

    if (titles.length === 0) {
      return NextResponse.json(
        { error: "Could not generate a breakdown for this task" },
        { status: 502 }
      );
    }

    const existingCount = await prisma.taskSubtask.count({ where: { taskId } });

    const subtasks = await prisma.$transaction(
      titles.map((title, i) =>
        prisma.taskSubtask.create({
          data: { taskId, title, order: existingCount + i },
        })
      )
    );

    return NextResponse.json({ subtasks });
  } catch (error) {
    const message =
      error instanceof MissingApiKeyError
        ? error.message
        : "The AI provider returned an error. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
