import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  reviewSchema,
  proposeRescheduleSchema,
  updateNotesSchema,
} from "@/lib/validation";
import {
  autoRejectConflicts,
  validateBookingRequest,
} from "@/lib/slots";
import { MeetingStatus, NotificationKind } from "@prisma/client";
import {
  notifyApproved,
  notifyCancelledByGuest,
  notifyCancelledByHost,
  notifyRejected,
  notifyRescheduleProposed,
  notifyUpdated,
  notifyUser,
} from "@/lib/notifications";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const meeting = await db.meeting.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, phone: true, email: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "ASSISTANT" && meeting.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Hide internal notes from guests
  if (user.role !== "ASSISTANT") {
    return NextResponse.json({
      meeting: { ...meeting, internalNotes: null },
    });
  }

  return NextResponse.json({ meeting });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const meeting = await db.meeting.findUnique({ where: { id } });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const action = (body as { action?: string }).action;

  // ---------- Guest-only actions ----------
  if (action === "proposeReschedule") {
    if (meeting.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (meeting.status === "REJECTED" || meeting.status === "CANCELLED") {
      return NextResponse.json(
        { error: "You can only reschedule active meetings." },
        { status: 409 }
      );
    }

    const parsed = proposeRescheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const check = await validateBookingRequest({
      dateStr: parsed.data.date,
      timeStr: parsed.data.time,
      durationMinutes: parsed.data.durationMinutes,
    });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 409 });
    }

    // Drop back to PENDING for the assistant to review again
    const updated = await db.meeting.update({
      where: { id },
      data: {
        status: MeetingStatus.PENDING,
        proposedStart: check.startUtc,
        proposedEnd: check.endUtc,
        requestedStart: check.startUtc,
        requestedEnd: check.endUtc,
        confirmedStart: null,
        confirmedEnd: null,
        reviewedAt: null,
        reviewedById: null,
      },
      include: { user: { select: { name: true } } },
    });

    await notifyRescheduleProposed({
      id: updated.id,
      subject: updated.subject,
      proposedStart: check.startUtc,
      user: { name: updated.user.name },
    });

    return NextResponse.json({ meeting: updated });
  }

  // ---------- Assistant-only actions past this point ----------
  if (user.role !== "ASSISTANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  // Priority — any status
  if (parsed.data.action === "setPriority") {
    const updated = await db.meeting.update({
      where: { id },
      data: { priority: parsed.data.priority },
    });
    return NextResponse.json({ meeting: updated });
  }

  // Internal notes — any status
  if (parsed.data.action === "updateNotes") {
    const updated = await db.meeting.update({
      where: { id },
      data: { internalNotes: parsed.data.internalNotes || null },
    });
    return NextResponse.json({ meeting: updated });
  }

  // Edit approved meeting
  if (parsed.data.action === "editConfirmed") {
    if (meeting.status !== MeetingStatus.APPROVED) {
      return NextResponse.json(
        { error: "Only approved meetings can be edited." },
        { status: 409 }
      );
    }
    const confirmedStart = new Date(parsed.data.confirmedStart);
    const confirmedEnd = new Date(parsed.data.confirmedEnd);

    if (confirmedEnd <= confirmedStart) {
      return NextResponse.json({ error: "End must be after start." }, { status: 400 });
    }

    const conflict = await db.meeting.findFirst({
      where: {
        id: { not: meeting.id },
        status: MeetingStatus.APPROVED,
        confirmedStart: { lt: confirmedEnd },
        confirmedEnd: { gt: confirmedStart },
      },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Another approved meeting already occupies this time." },
        { status: 409 }
      );
    }

    const updated = await db.meeting.update({
      where: { id },
      data: {
        confirmedStart,
        confirmedEnd,
        subject: parsed.data.subject ?? meeting.subject,
        description:
          parsed.data.description !== undefined
            ? parsed.data.description || null
            : meeting.description,
        location:
          parsed.data.location !== undefined
            ? parsed.data.location || null
            : meeting.location,
        internalNotes:
          parsed.data.internalNotes !== undefined
            ? parsed.data.internalNotes || null
            : meeting.internalNotes,
      },
    });

    await notifyUpdated({
      id: updated.id,
      userId: updated.userId,
      subject: updated.subject,
      confirmedStart: updated.confirmedStart!,
    });

    return NextResponse.json({ meeting: updated });
  }

  // Approve / reject require PENDING
  if (meeting.status !== MeetingStatus.PENDING) {
    return NextResponse.json(
      { error: `This meeting is already ${meeting.status.toLowerCase()}.` },
      { status: 409 }
    );
  }

  if (parsed.data.action === "approve") {
    const confirmedStart = parsed.data.confirmedStart
      ? new Date(parsed.data.confirmedStart)
      : meeting.requestedStart;
    const confirmedEnd = parsed.data.confirmedEnd
      ? new Date(parsed.data.confirmedEnd)
      : meeting.requestedEnd;

    const conflict = await db.meeting.findFirst({
      where: {
        id: { not: meeting.id },
        status: MeetingStatus.APPROVED,
        confirmedStart: { lt: confirmedEnd },
        confirmedEnd: { gt: confirmedStart },
      },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Another approved meeting already occupies this slot." },
        { status: 409 }
      );
    }

    const updated = await db.meeting.update({
      where: { id },
      data: {
        status: MeetingStatus.APPROVED,
        confirmedStart,
        confirmedEnd,
        location:
          parsed.data.location !== undefined
            ? parsed.data.location || null
            : meeting.location,
        internalNotes:
          parsed.data.internalNotes !== undefined
            ? parsed.data.internalNotes || null
            : meeting.internalNotes,
        proposedStart: null,
        proposedEnd: null,
        reviewedById: user.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });

    await notifyApproved({
      id: updated.id,
      userId: updated.userId,
      subject: updated.subject,
      confirmedStart: updated.confirmedStart!,
      requestedStart: meeting.requestedStart,
    });

    const rejected = await autoRejectConflicts({
      approvedMeetingId: updated.id,
      confirmedStart,
      confirmedEnd,
    });
    for (const r of rejected) {
      await notifyUser({
        userId: r.userId,
        kind: NotificationKind.MEETING_REJECTED,
        title: "Meeting request declined",
        body: `"${r.subject}" was declined. Reason: This time slot was booked by another request.`,
        meetingId: r.id,
      });
    }

    return NextResponse.json({ meeting: updated, autoRejected: rejected.length });
  }

  // reject
  const updated = await db.meeting.update({
    where: { id },
    data: {
      status: MeetingStatus.REJECTED,
      rejectionReason: parsed.data.reason,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  await notifyRejected({
    id: updated.id,
    userId: updated.userId,
    subject: updated.subject,
    rejectionReason: updated.rejectionReason!,
  });

  return NextResponse.json({ meeting: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const meeting = await db.meeting.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (meeting.userId !== user.id && user.role !== "ASSISTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (meeting.status === MeetingStatus.CANCELLED) {
    return NextResponse.json({ meeting });
  }

  const updated = await db.meeting.update({
    where: { id },
    data: { status: MeetingStatus.CANCELLED },
  });

  if (user.role === "ASSISTANT" && meeting.userId !== user.id) {
    await notifyCancelledByHost({
      id: updated.id,
      userId: updated.userId,
      subject: updated.subject,
    });
  } else if (user.role === "USER") {
    await notifyCancelledByGuest({
      id: updated.id,
      subject: updated.subject,
      user: { name: meeting.user.name },
    });
  }

  return NextResponse.json({ meeting: updated });
}
