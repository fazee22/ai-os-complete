import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedFolder(folderId: string, userId: string) {
  const folder = await prisma.fileFolder.findUnique({ where: { id: folderId } });
  if (!folder || folder.userId !== userId) return null;
  return folder;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { folderId } = await params;
  const folder = await getOwnedFolder(folderId, session.user.id);
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const schema = z.object({ name: z.string().min(1).max(100) });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const updated = await prisma.fileFolder.update({
    where: { id: folder.id },
    data: { name: parsed.data.name },
  });

  return NextResponse.json({ folder: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { folderId } = await params;
  const folder = await getOwnedFolder(folderId, session.user.id);
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const [fileCount, subfolderCount] = await Promise.all([
    prisma.fileAsset.count({ where: { folderId: folder.id } }),
    prisma.fileFolder.count({ where: { parentId: folder.id } }),
  ]);

  if (fileCount > 0 || subfolderCount > 0) {
    return NextResponse.json(
      { error: "Move or delete everything inside this folder first" },
      { status: 400 }
    );
  }

  await prisma.fileFolder.delete({ where: { id: folder.id } });
  return NextResponse.json({ ok: true });
}
