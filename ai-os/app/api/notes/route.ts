import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const notes = await prisma.note.findMany({
    where: {
      userId: session.user.id,
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { content: { contains: q } },
              { tags: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ notes });
}

const createSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  const data = parsed.success ? parsed.data : {};

  const note = await prisma.note.create({
    data: {
      userId: session.user.id,
      title: data.title || "Untitled note",
      content: data.content || "",
    },
  });

  return NextResponse.json({ note }, { status: 201 });
}
