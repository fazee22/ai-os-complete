import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const schema = z.object({ title: z.string().min(1).max(200) });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const count = await prisma.taskSubtask.count({ where: { taskId } });

  const subtask = await prisma.taskSubtask.create({
    data: { taskId, title: parsed.data.title, order: count },
  });

  return NextResponse.json({ subtask }, { status: 201 });
}
