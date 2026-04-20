"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2 } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import type { Meeting, User } from "@prisma/client";

type Mode = "approve" | "reject";
type MeetingWithUser = Meeting & { user?: Pick<User, "name" | "phone" | "email"> | null };

export function ReviewDialog({
  meeting,
  mode,
  open,
  onOpenChange,
}: {
  meeting: MeetingWithUser | null;
  mode: Mode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [reschedule, setReschedule] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize inputs when the dialog opens
  function handleOpenChange(v: boolean) {
    if (v && meeting) {
      setError(null);
      setReason("");
      setReschedule(false);
      setDate(format(new Date(meeting.requestedStart), "yyyy-MM-dd"));
      setTime(format(new Date(meeting.requestedStart), "HH:mm"));
      setLocation(meeting.location ?? "");
      setInternalNotes(meeting.internalNotes ?? "");
    }
    onOpenChange(v);
  }

  async function submit() {
    if (!meeting) return;
    setSubmitting(true);
    setError(null);

    let body: Record<string, unknown>;
    if (mode === "approve") {
      body = { action: "approve" };
      if (reschedule) {
        const origDuration =
          (new Date(meeting.requestedEnd).getTime() -
            new Date(meeting.requestedStart).getTime()) /
          60000;
        const start = new Date(`${date}T${time}:00`);
        const end = new Date(start.getTime() + origDuration * 60000);
        body.confirmedStart = start.toISOString();
        body.confirmedEnd = end.toISOString();
      }
      if (location.trim() !== (meeting.location ?? "")) {
        body.location = location.trim();
      }
      if (internalNotes.trim() !== (meeting.internalNotes ?? "")) {
        body.internalNotes = internalNotes.trim();
      }
    } else {
      if (!reason.trim()) {
        setError("Please add a reason so the requester knows why.");
        setSubmitting(false);
        return;
      }
      body = { action: "reject", reason: reason.trim() };
    }

    const res = await fetch(`/api/meetings/${meeting.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "Something went wrong.");
      return;
    }

    onOpenChange(false);
    router.refresh();
  }

  if (!meeting) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "approve" ? "Approve request" : "Decline request"}
          </DialogTitle>
          <DialogDescription>
            {meeting.user?.name} · <span className="tabular">{meeting.user?.phone}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-line bg-muted/40 p-4">
          <p className="display text-lg text-ink">{meeting.subject}</p>
          <p className="mt-1 text-sm text-muted-foreground tabular">
            {formatDate(meeting.requestedStart)} ·{" "}
            {formatTime(meeting.requestedStart)}–{formatTime(meeting.requestedEnd)}
          </p>
          {meeting.description && (
            <p className="mt-3 text-sm text-ink leading-relaxed border-t border-line pt-3">
              {meeting.description}
            </p>
          )}
        </div>

        {mode === "approve" && (
          <div className="space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={reschedule}
                onChange={(e) => setReschedule(e.target.checked)}
                className="mt-1 accent-[hsl(var(--accent))]"
              />
              <div className="text-sm">
                <div className="text-ink font-medium">Reschedule on approval</div>
                <div className="text-muted-foreground text-xs">
                  Confirm the meeting at a different time than requested.
                </div>
              </div>
            </label>

            {reschedule && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="date">New date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time">New time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    step={60}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              <Label htmlFor="approve-location">
                Location or link{" "}
                <span className="text-muted-foreground font-normal">· optional</span>
              </Label>
              <Input
                id="approve-location"
                placeholder={
                  meeting.location
                    ? meeting.location
                    : "e.g. Boardroom, Google Meet link"
                }
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                The guest will see this when the meeting is approved.
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label htmlFor="approve-notes">
                Internal notes{" "}
                <span className="text-muted-foreground font-normal">
                  · only you see these
                </span>
              </Label>
              <Textarea
                id="approve-notes"
                placeholder="e.g. Third time booking. Host knows them from university."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                maxLength={2000}
                className="bg-warn/[0.04]"
              />
            </div>
          </div>
        )}

        {mode === "reject" && (
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for declining</Label>
            <Textarea
              id="reason"
              placeholder="e.g. The host is travelling that week. Please suggest a time after the 18th."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              The requester will see this on their dashboard.
            </p>
          </div>
        )}

        {error && (
          <div className="flex gap-2 text-sm text-danger rounded-md bg-danger/5 border border-danger/15 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={mode === "approve" ? "accent" : "danger"}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "approve" ? (
              "Approve meeting"
            ) : (
              "Decline request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
