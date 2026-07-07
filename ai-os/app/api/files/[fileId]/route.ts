import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { unlink } from "fs/promises";
import path from "path";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedFile(fileId: string, userId: string) {
  const file = await prisma.fileAsset.findUnique({ where: { id: fileId } });
  if (!file || file.userId !== userId) return null;
  return file;
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  folderId: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const file = await getOwnedFile(fileId, session.user.id);
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const updated = await prisma.fileAsset.update({
    where: { id: file.id },
    data: parsed.data,
  });

  return NextResponse.json({ file: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const file = await getOwnedFile(fileId, session.user.id);
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  await prisma.fileAsset.delete({ where: { id: file.id } });

  try {
    await unlink(path.join(process.cwd(), "public", file.path));
  } catch {
    // File already missing from disk - not fatal, DB record is gone either way.
  }

  return NextResponse.json({ ok: true });
}
