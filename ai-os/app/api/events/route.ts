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
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const events = await prisma.event.findMany({
    where: {
      userId: session.user.id,
      ...(from && to
        ? {
            startAt: { lte: new Date(to) },
            endAt: { gte: new Date(from) },
          }
        : {}),
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({ events });
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allDay: z.boolean().optional(),
  reminderMins: z.number().int().min(0).nullable().optional(),
  color: z.string().max(30).optional(),
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

  const event = await prisma.event.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      allDay: parsed.data.allDay ?? false,
      reminderMins: parsed.data.reminderMins ?? null,
      color: parsed.data.color ?? "primary",
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
