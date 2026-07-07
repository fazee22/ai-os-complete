import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");
  const q = searchParams.get("q")?.trim();

  const files = await prisma.fileAsset.findMany({
    where: {
      userId: session.user.id,
      ...(q ? { name: { contains: q } } : { folderId: folderId || null }),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ files });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folderId = (formData.get("folderId") as string | null) || null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be smaller than 20MB" }, { status: 400 });
  }

  if (folderId) {
    const folder = await prisma.fileFolder.findUnique({ where: { id: folderId } });
    if (!folder || folder.userId !== session.user.id) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "files");
  await mkdir(uploadsDir, { recursive: true });

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const storedName = `${randomUUID()}${ext ? `.${ext}` : ""}`;
  const filePath = path.join(uploadsDir, storedName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const asset = await prisma.fileAsset.create({
    data: {
      userId: session.user.id,
      folderId,
      name: file.name,
      path: `/uploads/files/${storedName}`,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    },
  });

  return NextResponse.json({ file: asset }, { status: 201 });
}
