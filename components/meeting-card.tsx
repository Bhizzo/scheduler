"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "./status-badge";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { getTimeStatus, TIME_STATUS_META } from "@/lib/meeting-time";
import type { Meeting, MeetingStatus, User } from "@prisma/client";
import {
  Calendar,
  Clock,
  CornerDownRight,
  User as UserIcon,
  MapPin,
  Loader2,
  X,
  CalendarClock,
} from "lucide-react";
import { RescheduleDialog } from "./reschedule-dialog";

type MeetingWithUser = Meeting & { user?: Pick<User, "name" | "phone" | "email"> | null };

export function MeetingCard({
  meeting,
  showRequester = false,
  allowCancel = false,
  allowReschedule = false,
}: {
  meeting: MeetingWithUser;
  showRequester?: boolean;
  allowCancel?: boolean;
  allowReschedule?: boolean;
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const start = meeting.confirmedStart ?? meeting.requestedStart;
  const end = meeting.confirmedEnd ?? meeting.requestedEnd;
  const wasRescheduled =
    meeting.status === ("APPROVED" as MeetingStatus) &&
    meeting.confirmedStart &&
    meeting.requestedStart &&
    meeting.confirmedStart.getTime() !== meeting.requestedStart.getTime();

  const timeStatus =
    meeting.status === "APPROVED" ? getTimeStatus(start, end) : "upcoming";
  const timeMeta = TIME_STATUS_META[timeStatus];
  const isPast = timeStatus === "completed";

  async function cancel() {
    if (!confirm("Cancel this meeting request?")) return;
    setCancelling(true);
    const res = await fetch(`/api/meetings/${meeting.id}`, { method: "DELETE" });
    setCancelling(false);
    if (res.ok) router.refresh();
  }

  const canCancel =
    allowCancel && (meeting.status === "PENDING" || meeting.status === "APPROVED") && !isPast;
  const canReschedule =
    allowReschedule && (meeting.status === "PENDING" || meeting.status === "APPROVED") && !isPast;
  const showActions = canCancel || canReschedule;

  return (
    <>
      <article
        className={cn(
          "card-e p-5 md:p-6 transition-all hover:border-border",
          isPast && "opacity-60"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="display text-xl md:text-[22px] text-ink leading-tight truncate">
              {meeting.subject}
            </h3>
            {showRequester && meeting.user && (
              <p className="mt-1.5 text-sm text-muted-foreground flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5" />
                <span className="text-ink">{meeting.user.name}</span>
                <span className="tabular">· {meeting.user.phone}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge status={meeting.status} />
            {timeMeta && (
              <span className={cn("chip ring-1 ring-inset", timeMeta.classes)}>
                {timeMeta.label}
              </span>
            )}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="label-caps">Date</dt>
            <dd className="mt-1 text-ink flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {formatDate(start)}
            </dd>
          </div>
          <div>
            <dt className="label-caps">Time</dt>
            <dd className="mt-1 text-ink flex items-center gap-1.5 tabular">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {formatTime(start)} – {formatTime(end)}
            </dd>
          </div>
        </dl>

        {meeting.location && (
          <div className="mt-3 flex items-start gap-1.5 text-sm">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-ink break-words">{meeting.location}</span>
          </div>
        )}

        {wasRescheduled && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <CornerDownRight className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Rescheduled from{" "}
                <span className="tabular text-ink">
                  {formatDate(meeting.requestedStart)} at {formatTime(meeting.requestedStart)}
                </span>
              </span>
            </p>
          </div>
        )}

        {meeting.status === "REJECTED" && meeting.rejectionReason && (
          <div className="mt-4 rounded-md bg-danger/5 border border-danger/15 p-3">
            <p className="label-caps text-danger">Reason</p>
            <p className="mt-1 text-sm text-ink leading-relaxed">{meeting.rejectionReason}</p>
          </div>
        )}

        {meeting.description && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed border-t border-line pt-4 line-clamp-3">
            {meeting.description}
          </p>
        )}

        {showActions && (
          <div className="mt-4 border-t border-line pt-3 flex items-center justify-end gap-4">
            {canReschedule && (
              <button
                onClick={() => setRescheduleOpen(true)}
                className="text-xs text-muted-foreground hover:text-ink transition-colors inline-flex items-center gap-1"
              >
                <CalendarClock className="h-3 w-3" />
                Propose new time
              </button>
            )}
            {canCancel && (
              <button
                onClick={cancel}
                disabled={cancelling}
                className="text-xs text-muted-foreground hover:text-danger transition-colors inline-flex items-center gap-1"
              >
                {cancelling ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                {meeting.status === "APPROVED" ? "Cancel meeting" : "Cancel request"}
              </button>
            )}
          </div>
        )}
      </article>

      <RescheduleDialog
        meeting={meeting as Meeting}
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
      />
    </>
  );
}
