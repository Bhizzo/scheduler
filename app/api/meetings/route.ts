import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assistantCreateSchema, bookingSchema } from "@/lib/validation";
import { validateBookingRequest } from "@/lib/slots";
import { MeetingStatus, Prisma, Role } from "@prisma/client";
import { notifyApproved, notifyNewRequest } from "@/lib/notifications";
import { addMinutes } from "date-fns";

const MAX_LIMIT = 50;

function parseIntOrNull(v: string | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const priorityFilter = parseIntOrNull(url.searchParams.get("priority"));
  const search = url.searchParams.get("q")?.trim() || "";
  const sort = url.searchParams.get("sort") || "priority"; // priority | date | recent
  const includePast = url.searchParams.get("past") === "1";
  const limit = Math.min(
    Math.max(1, Number(url.searchParams.get("limit") ?? "50")),
    MAX_LIMIT
  );
  const cursor = url.searchParams.get("cursor") || undefined;

  const where: Prisma.MeetingWhereInput = {};

  // Guests see only their own meetings
  if (user.role !== "ASSISTANT") {
    where.userId = user.id;
  }

  if (status && ["PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
    where.status = status as MeetingStatus;
  }

  if (priorityFilter !== null && priorityFilter >= 0 && priorityFilter <= 3) {
    where.priority = priorityFilter;
  }

  // Hide past APPROVED meetings by default (everything else is unaffected).
  // A meeting is past if its confirmed end is before now.
  if (!includePast && (status === "APPROVED" || status === null || status === undefined)) {
    const now = new Date();
    if (status === "APPROVED") {
      where.confirmedEnd = { gt: now };
    } else {
      // Mixed query — use OR to keep non-approved meetings regardless of their time
      where.OR = [
        { status: { not: MeetingStatus.APPROVED } },
        { confirmedEnd: { gt: now } },
      ];
    }
  }

  if (search) {
    const like: Prisma.StringFilter = { contains: search, mode: "insensitive" };
    const searchClause: Prisma.MeetingWhereInput = {
      OR: [
        { subject: like },
        { description: like },
        { location: like },
        { guestName: like },
        { guestPhone: { contains: search } },
        { user: { name: like } },
        { user: { phone: { contains: search } } },
      ],
    };
    where.AND = [...((where.AND as Prisma.MeetingWhereInput[]) ?? []), searchClause];
  }

  // Sort: priority desc + date asc (for pending-style workflow), or by relevant date only.
  let orderBy: Prisma.MeetingOrderByWithRelationInput[];
  if (sort === "date") {
    orderBy = [{ requestedStart: "asc" }, { createdAt: "desc" }];
  } else if (sort === "recent") {
    orderBy = [{ createdAt: "desc" }];
  } else {
    // default: priority
    orderBy = [{ priority: "desc" }, { requestedStart: "asc" }, { createdAt: "desc" }];
  }

  const meetings = await db.meeting.findMany({
    where,
    orderBy,
    take: limit + 1, // fetch one extra to know if there's a next page
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: { select: { id: true, name: true, phone: true, email: true } },
    },
  });

  let nextCursor: string | null = null;
  if (meetings.length > limit) {
    const extra = meetings.pop();
    nextCursor = extra?.id ?? null;
  }

  return NextResponse.json({ meetings, nextCursor });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // --- Assistant creating a meeting directly ---
  if (user.role === "ASSISTANT" && (body as { assistantCreate?: boolean }).assistantCreate) {
    const parsed = assistantCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { subject, description, location, internalNotes, date, time, durationMinutes, priority, userId, guestName, guestPhone } = parsed.data;

    const check = await validateBookingRequest({
      dateStr: date,
      timeStr: time,
      durationMinutes,
    });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 409 });
    }

    // Resolve the user reference if one was provided
    let resolvedUserId: string | null = null;
    if (userId) {
      const u = await db.user.findUnique({ where: { id: userId } });
      if (u) resolvedUserId = u.id;
    }

    const meeting = await db.meeting.create({
      data: {
        userId: resolvedUserId,
        guestName: resolvedUserId ? null : guestName || null,
        guestPhone: resolvedUserId ? null : guestPhone || null,
        subject,
        description: description || null,
        location: location || null,
        internalNotes: internalNotes || null,
        requestedStart: check.startUtc,
        requestedEnd: check.endUtc,
        confirmedStart: check.startUtc,
        confirmedEnd: check.endUtc,
        status: MeetingStatus.APPROVED,
        priority: priority ?? 1,
        createdByRole: Role.ASSISTANT,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });

    // Notify the linked user if there is one
    if (resolvedUserId) {
      await notifyApproved({
        id: meeting.id,
        userId: resolvedUserId,
        subject: meeting.subject,
        confirmedStart: meeting.confirmedStart!,
        requestedStart: meeting.requestedStart,
      });
    }

    return NextResponse.json({ meeting });
  }

  // --- Guest requesting a meeting (existing flow) ---
  if (user.role !== "USER") {
    return NextResponse.json(
      { error: "Only guests can request meetings." },
      { status: 403 }
    );
  }

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

  await notifyNewRequest({
    id: meeting.id,
    subject: meeting.subject,
    requestedStart: meeting.requestedStart,
    user: { name: meeting.user!.name },
  });

  return NextResponse.json({ meeting });
}
