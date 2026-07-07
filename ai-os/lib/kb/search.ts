import { prisma } from "@/lib/prisma";

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "to", "of",
  "and", "or", "in", "on", "for", "with", "this", "that", "it", "as", "at",
  "by", "from", "how", "what", "when", "where", "who", "why", "do", "does",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export interface RetrievedChunk {
  documentId: string;
  documentTitle: string;
  content: string;
  score: number;
}

/**
 * Scores every chunk belonging to the user by token overlap with the
 * query and returns the top `limit` matches. This is a lexical stand-in
 * for embedding-based similarity search - swap this function's body for
 * a real vector query later without touching the API routes or UI.
 */
export async function retrieveRelevantChunks(
  userId: string,
  query: string,
  limit = 5
): Promise<RetrievedChunk[]> {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const documents = await prisma.document.findMany({
    where: { userId },
    include: { chunks: true },
  });

  const scored: RetrievedChunk[] = [];

  for (const doc of documents) {
    for (const chunk of doc.chunks) {
      const chunkTokens = tokenize(chunk.content);
      const chunkTokenSet = new Set(chunkTokens);
      let score = 0;
      for (const qt of queryTokens) {
        if (chunkTokenSet.has(qt)) score += 1;
      }
      if (score > 0) {
        scored.push({
          documentId: doc.id,
          documentTitle: doc.title,
          content: chunk.content,
          score: score / queryTokens.length,
        });
      }
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
