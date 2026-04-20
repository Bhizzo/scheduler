import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { bookingSchema } from "@/lib/validation";
import { validateBookingRequest } from "@/lib/slots";
import { MeetingStatus } from "@prisma/client";
import { notifyNewRequest } from "@/lib/notifications";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const where =
    user.role === "ASSISTANT"
      ? status
        ? { status: status as MeetingStatus }
        : {}
      : { userId: user.id };

  const meetings = await db.meeting.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      user: { select: { id: true, name: true, phone: true, email: true } },
    },
  });

  return NextResponse.json({ meetings });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "USER") {
    return NextResponse.json(
      { error: "Only guests can request meetings." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { subject, description, location, date, time, durationMinutes } = parsed.data;

  const check = await validateBookingRequest({
    dateStr: date,
    timeStr: time,
    durationMinutes,
  });
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 409 });
  }

  const meeting = await db.meeting.create({
    data: {
      userId: user.id,
      subject,
      description: description || null,
      location: location || null,
      requestedStart: check.startUtc,
      requestedEnd: check.endUtc,
      status: MeetingStatus.PENDING,
    },
    include: {
      user: { select: { name: true } },
    },
  });

  // Fire-and-forget notification to every assistant
  await notifyNewRequest({
    id: meeting.id,
    subject: meeting.subject,
    requestedStart: meeting.requestedStart,
    user: { name: meeting.user.name },
  });

  return NextResponse.json({ meeting });
}
