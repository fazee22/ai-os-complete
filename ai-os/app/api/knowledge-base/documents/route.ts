import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractText, detectSourceType } from "@/lib/kb/extract";
import { chunkText } from "@/lib/kb/chunk";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documents = await prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return NextResponse.json({ documents });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be smaller than 20MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let text: string | null;
  try {
    text = await extractText(buffer, file.type, file.name);
  } catch (error) {
    console.error("[KB_EXTRACT_ERROR]", error);
    return NextResponse.json(
      { error: "Could not read this file. It may be corrupted or password-protected." },
      { status: 400 }
    );
  }

  if (text === null) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload .txt, .md, .pdf, or .docx files." },
      { status: 400 }
    );
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return NextResponse.json(
      { error: "No readable text was found in this file" },
      { status: 400 }
    );
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "kb");
  await mkdir(uploadsDir, { recursive: true });
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "txt";
  const storedName = `${randomUUID()}.${ext}`;
  await writeFile(path.join(uploadsDir, storedName), buffer);

  const document = await prisma.document.create({
    data: {
      userId: session.user.id,
      title: file.name,
      sourceType: detectSourceType(file.type, file.name),
      path: `/uploads/kb/${storedName}`,
      chunks: {
        create: chunks.map((content, i) => ({ content, chunkIndex: i })),
      },
    },
    include: { _count: { select: { chunks: true } } },
  });

  return NextResponse.json({ document }, { status: 201 });
}
