import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedNote(noteId: string, userId: string) {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== userId) return null;
  return note;
}

const updateSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().optional(),
  tags: z.string().max(300).optional(),
  pinned: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await params;
  const note = await getOwnedNote(noteId, session.user.id);
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const updated = await prisma.note.update({
    where: { id: note.id },
    data: parsed.data,
  });

  return NextResponse.json({ note: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await params;
  const note = await getOwnedNote(noteId, session.user.id);
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  await prisma.note.delete({ where: { id: note.id } });
  return NextResponse.json({ ok: true });
}
