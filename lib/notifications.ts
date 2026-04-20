import { db } from "./db";
import { NotificationKind, Role } from "@prisma/client";
import { formatDateTime } from "./utils";

/**
 * Create a notification row for one specific user. Returns the created row.
 *
 * This is the single entry-point for notifications. When SMS/email is added
 * later, wrap this function to also push to those channels — calling code
 * won't have to change.
 */
export async function notifyUser(opts: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  meetingId?: string | null;
}) {
  return db.notification.create({
    data: {
      userId: opts.userId,
      kind: opts.kind,
      title: opts.title,
      body: opts.body,
      meetingId: opts.meetingId ?? null,
    },
  });
}

/**
 * Notify every assistant. Used for events the assistant(s) care about —
 * new requests, guest cancellations.
 */
export async function notifyAssistants(opts: {
  kind: NotificationKind;
  title: string;
  body: string;
  meetingId?: string | null;
}) {
  const assistants = await db.user.findMany({
    where: { role: Role.ASSISTANT },
    select: { id: true },
  });
  if (assistants.length === 0) return [];
  await db.notification.createMany({
    data: assistants.map((a) => ({
      userId: a.id,
      kind: opts.kind,
      title: opts.title,
      body: opts.body,
      meetingId: opts.meetingId ?? null,
    })),
  });
  return assistants.map((a) => a.id);
}

// ---------- Convenience wrappers for the specific events ----------

export function notifyNewRequest(meeting: {
  id: string;
  subject: string;
  requestedStart: Date;
  user: { name: string };
}) {
  return notifyAssistants({
    kind: NotificationKind.MEETING_REQUESTED,
    title: "New meeting request",
    body: `${meeting.user.name} requested "${meeting.subject}" for ${formatDateTime(meeting.requestedStart)}.`,
    meetingId: meeting.id,
  });
}

export function notifyApproved(meeting: {
  id: string;
  userId: string;
  subject: string;
  confirmedStart: Date;
  requestedStart: Date;
}) {
  const wasRescheduled = meeting.confirmedStart.getTime() !== meeting.requestedStart.getTime();
  return notifyUser({
    userId: meeting.userId,
    kind: wasRescheduled
      ? NotificationKind.MEETING_APPROVED_RESCHEDULED
      : NotificationKind.MEETING_APPROVED,
    title: wasRescheduled
      ? "Meeting approved at a new time"
      : "Meeting approved",
    body: wasRescheduled
      ? `"${meeting.subject}" was approved, but moved to ${formatDateTime(meeting.confirmedStart)}.`
      : `"${meeting.subject}" was approved for ${formatDateTime(meeting.confirmedStart)}.`,
    meetingId: meeting.id,
  });
}

export function notifyRejected(meeting: {
  id: string;
  userId: string;
  subject: string;
  rejectionReason: string;
}) {
  return notifyUser({
    userId: meeting.userId,
    kind: NotificationKind.MEETING_REJECTED,
    title: "Meeting request declined",
    body: `"${meeting.subject}" was declined. Reason: ${meeting.rejectionReason}`,
    meetingId: meeting.id,
  });
}

export function notifyUpdated(meeting: {
  id: string;
  userId: string;
  subject: string;
  confirmedStart: Date;
}) {
  return notifyUser({
    userId: meeting.userId,
    kind: NotificationKind.MEETING_UPDATED,
    title: "Approved meeting was updated",
    body: `Details for "${meeting.subject}" changed. It's now ${formatDateTime(meeting.confirmedStart)}.`,
    meetingId: meeting.id,
  });
}

export function notifyCancelledByHost(meeting: {
  id: string;
  userId: string;
  subject: string;
}) {
  return notifyUser({
    userId: meeting.userId,
    kind: NotificationKind.MEETING_CANCELLED_BY_HOST,
    title: "Meeting cancelled",
    body: `"${meeting.subject}" has been cancelled.`,
    meetingId: meeting.id,
  });
}

export function notifyCancelledByGuest(meeting: {
  id: string;
  subject: string;
  user: { name: string };
}) {
  return notifyAssistants({
    kind: NotificationKind.MEETING_CANCELLED_BY_GUEST,
    title: "Guest cancelled their request",
    body: `${meeting.user.name} cancelled "${meeting.subject}".`,
    meetingId: meeting.id,
  });
}

export function notifyRescheduleProposed(meeting: {
  id: string;
  subject: string;
  proposedStart: Date;
  user: { name: string };
}) {
  return notifyAssistants({
    kind: NotificationKind.MEETING_RESCHEDULE_PROPOSED,
    title: "Guest proposed a new time",
    body: `${meeting.user.name} asked to move "${meeting.subject}" to ${formatDateTime(meeting.proposedStart)}.`,
    meetingId: meeting.id,
  });
}
