import mammoth from "mammoth";

/**
 * Extracts plain text from a supported file buffer.
 * Returns null if the type isn't supported yet (caller should surface
 * an honest error rather than silently ingesting nothing).
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string | null> {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (mimeType.startsWith("text/") || ext === "txt" || ext === "md") {
    return buffer.toString("utf-8");
  }

  if (mimeType === "application/pdf" || ext === "pdf") {
    // Lazy import: pdf-parse reads a test file at module load time in some
    // versions when required eagerly, so import it only when needed.
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return null;
}

export function detectSourceType(mimeType: string, filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if (ext === "docx") return "doc";
  return "text";
}
