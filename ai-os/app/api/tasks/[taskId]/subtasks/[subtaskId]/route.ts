import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedSubtask(taskId: string, subtaskId: string, userId: string) {
  const subtask = await prisma.taskSubtask.findUnique({
    where: { id: subtaskId },
    include: { task: true },
  });
  if (!subtask || subtask.taskId !== taskId || subtask.task.userId !== userId) {
    return null;
  }
  return subtask;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ taskId: string; subtaskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId, subtaskId } = await params;
  const subtask = await getOwnedSubtask(taskId, subtaskId, session.user.id);
  if (!subtask) {
    return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
  }

  const schema = z.object({ done: z.boolean().optional(), title: z.string().min(1).max(200).optional() });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const updated = await prisma.taskSubtask.update({
    where: { id: subtaskId },
    data: parsed.data,
  });

  return NextResponse.json({ subtask: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ taskId: string; subtaskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId, subtaskId } = await params;
  const subtask = await getOwnedSubtask(taskId, subtaskId, session.user.id);
  if (!subtask) {
    return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
  }

  await prisma.taskSubtask.delete({ where: { id: subtaskId } });
  return NextResponse.json({ ok: true });
}
