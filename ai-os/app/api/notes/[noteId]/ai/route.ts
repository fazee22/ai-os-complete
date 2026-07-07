import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runCompletion } from "@/lib/ai/complete";
import { MissingApiKeyError } from "@/lib/ai/providers";

const schema = z.object({
  action: z.enum(["summarize", "rewrite", "translate"]),
  targetLanguage: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await params;
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== session.user.id) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  if (!note.content.trim()) {
    return NextResponse.json(
      { error: "This note is empty - add some content first" },
      { status: 400 }
    );
  }

  const prompts: Record<string, { system: string; user: string }> = {
    summarize: {
      system:
        "You summarize notes concisely. Return only the summary, no preamble.",
      user: `Summarize the following note in a few sentences:\n\n${note.content}`,
    },
    rewrite: {
      system:
        "You rewrite notes to be clearer and better organized while preserving meaning. Return only the rewritten note.",
      user: `Rewrite the following note to be clearer and better structured:\n\n${note.content}`,
    },
    translate: {
      system: `You translate notes accurately into ${parsed.data.targetLanguage || "Spanish"}. Return only the translation.`,
      user: `Translate the following note into ${parsed.data.targetLanguage || "Spanish"}:\n\n${note.content}`,
    },
  };

  const { system, user } = prompts[parsed.data.action];

  try {
    const result = await runCompletion({
      userId: session.user.id,
      systemPrompt: system,
      userPrompt: user,
    });
    return NextResponse.json({ result });
  } catch (error) {
    const message =
      error instanceof MissingApiKeyError
        ? error.message
        : "The AI provider returned an error. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
