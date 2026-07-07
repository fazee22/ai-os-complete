import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { retrieveRelevantChunks } from "@/lib/kb/search";
import { runCompletion } from "@/lib/ai/complete";
import { MissingApiKeyError } from "@/lib/ai/providers";

const schema = z.object({ query: z.string().min(1).max(500) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const chunks = await retrieveRelevantChunks(session.user.id, parsed.data.query, 5);

  if (chunks.length === 0) {
    return NextResponse.json({
      answer:
        "I couldn't find anything relevant in your knowledge base for that question. Try uploading a document that covers this topic, or rephrase your question.",
      sources: [],
    });
  }

  const context = chunks
    .map((c, i) => `[${i + 1}] Source: ${c.documentTitle}\n${c.content}`)
    .join("\n\n---\n\n");

  try {
    const answer = await runCompletion({
      userId: session.user.id,
      systemPrompt:
        "You answer questions using ONLY the provided context from the user's documents. Cite sources inline like [1], [2] matching the numbered context blocks. If the context doesn't contain the answer, say so honestly.",
      userPrompt: `Context:\n\n${context}\n\nQuestion: ${parsed.data.query}`,
    });

    return NextResponse.json({
      answer,
      sources: chunks.map((c, i) => ({
        index: i + 1,
        documentId: c.documentId,
        title: c.documentTitle,
        snippet: c.content.slice(0, 200),
      })),
    });
  } catch (error) {
    const message =
      error instanceof MissingApiKeyError
        ? error.message
        : "The AI provider returned an error. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
