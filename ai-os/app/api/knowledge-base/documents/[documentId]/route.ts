import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { unlink } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document || document.userId !== session.user.id) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await prisma.document.delete({ where: { id: document.id } });

  if (document.path) {
    try {
      await unlink(path.join(process.cwd(), "public", document.path));
    } catch {
      // Already gone from disk - not fatal.
    }
  }

  return NextResponse.json({ ok: true });
}
