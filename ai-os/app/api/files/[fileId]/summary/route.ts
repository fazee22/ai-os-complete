import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { readFile } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runCompletion } from "@/lib/ai/complete";
import { MissingApiKeyError } from "@/lib/ai/providers";

const TEXT_MIME_PREFIXES = ["text/"];
const TEXT_MIME_EXACT = [
  "application/json",
  "application/javascript",
  "application/xml",
];

function isTextFile(mimeType: string) {
  return (
    TEXT_MIME_PREFIXES.some((p) => mimeType.startsWith(p)) ||
    TEXT_MIME_EXACT.includes(mimeType)
  );
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const file = await prisma.fileAsset.findUnique({ where: { id: fileId } });
  if (!file || file.userId !== session.user.id) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (!isTextFile(file.mimeType)) {
    return NextResponse.json(
      {
        error:
          "AI summary currently supports plain text, markdown, JSON, and similar text files only. PDF and document parsing lands in a future update.",
      },
      { status: 400 }
    );
  }

  try {
    const buffer = await readFile(path.join(process.cwd(), "public", file.path));
    const content = buffer.toString("utf-8").slice(0, 12000);

    if (!content.trim()) {
      return NextResponse.json({ error: "This file appears to be empty" }, { status: 400 });
    }

    const summary = await runCompletion({
      userId: session.user.id,
      systemPrompt: "You summarize files concisely in a few sentences. Return only the summary.",
      userPrompt: `Summarize this file named "${file.name}":\n\n${content}`,
    });

    await prisma.fileAsset.update({ where: { id: file.id }, data: { aiSummary: summary } });

    return NextResponse.json({ summary });
  } catch (error) {
    const message =
      error instanceof MissingApiKeyError
        ? error.message
        : "Could not summarize this file. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
