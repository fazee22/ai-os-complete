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
  const parentId = searchParams.get("parentId");

  const folders = await prisma.fileFolder.findMany({
    where: { userId: session.user.id, parentId: parentId || null },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ folders });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const folder = await prisma.fileFolder.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      parentId: parsed.data.parentId || null,
    },
  });

  return NextResponse.json({ folder }, { status: 201 });
}
