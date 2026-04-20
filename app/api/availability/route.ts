import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const rulesPayload = z.object({
  rules: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      enabled: z.boolean(),
    })
  ),
  blockedDates: z
    .array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reason: z.string().optional() }))
    .optional(),
});

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [rules, blockedDates] = await Promise.all([
    db.availabilityRule.findMany({ orderBy: [{ weekday: "asc" }, { startTime: "asc" }] }),
    db.blockedDate.findMany({ orderBy: { date: "asc" } }),
  ]);
  return NextResponse.json({ rules, blockedDates });
}

// Replace rules wholesale (simpler UX). Assistant only.
export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user || user.role !== "ASSISTANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = rulesPayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  await db.$transaction(async (tx) => {
    await tx.availabilityRule.deleteMany({});
    if (parsed.data.rules.length) {
      await tx.availabilityRule.createMany({ data: parsed.data.rules });
    }
    if (parsed.data.blockedDates) {
      await tx.blockedDate.deleteMany({});
      if (parsed.data.blockedDates.length) {
        await tx.blockedDate.createMany({
          data: parsed.data.blockedDates.map((d) => ({
            date: new Date(`${d.date}T00:00:00.000Z`),
            reason: d.reason,
          })),
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
