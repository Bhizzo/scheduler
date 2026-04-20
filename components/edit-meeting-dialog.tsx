"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addMinutes, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { AlertCircle, Loader2, CalendarOff } from "lucide-react";
import type { Meeting, User } from "@prisma/client";

type MeetingWithUser = Meeting & { user?: Pick<User, "name" | "phone" | "email"> | null };

export function EditMeetingDialog({
  meeting,
  open,
  onOpenChange,
}: {
  meeting: MeetingWithUser | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);

  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && meeting) {
      const start = meeting.confirmedStart ?? meeting.requestedStart;
      const end = meeting.confirmedEnd ?? meeting.requestedEnd;
      const d =
        (new Date(end).getTime() - new Date(start).getTime()) / 60000;
      setSubject(meeting.subject);
      setDescription(meeting.description ?? "");
      setLocation(meeting.location ?? "");
      setInternalNotes(meeting.internalNotes ?? "");
      setDate(format(new Date(start), "yyyy-MM-dd"));
      setTime(format(new Date(start), "HH:mm"));
      setDurationMinutes(Math.max(5, Math.round(d)));
      setError(null);
    }
  }, [open, meeting]);

  async function save() {
    if (!meeting) return;
    setError(null);
    if (!subject.trim()) return setError("Subject can't be empty.");
    if (!date || !time) return setError("Pick a date and time.");

    const start = new Date(`${date}T${time}:00`);
    const end = addMinutes(start, durationMinutes);

    setSubmitting(true);
    const res = await fetch(`/api/meetings/${meeting.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "editConfirmed",
        confirmedStart: start.toISOString(),
        confirmedEnd: end.toISOString(),
        subject: subject.trim(),
        description: description.trim(),
        location: location.trim(),
        internalNotes: internalNotes.trim(),
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save changes.");
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  async function cancelMeeting() {
    if (!meeting) return;
    if (!confirm("Cancel this meeting? The guest will be notified.")) return;

    setCancelling(true);
    const res = await fetch(`/api/meetings/${meeting.id}`, { method: "DELETE" });
    setCancelling(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't cancel.");
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  if (!meeting) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit meeting</DialogTitle>
          <DialogDescription>
            {meeting.user?.name} · <span className="tabular">{meeting.user?.phone}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-subject">Subject</Label>
            <Input
              id="edit-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-[1fr_140px_120px] gap-2">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="tabular"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time">Start time</Label>
              <Input
                id="edit-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                step={60}
                className="tabular"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-duration">Minutes</Label>
              <Input
                id="edit-duration"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                min={5}
                max={480}
                step={5}
                className="tabular"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-location">
              Location or link{" "}
              <span className="text-muted-foreground font-normal">· optional</span>
            </Label>
            <Input
              id="edit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Boardroom, Google Meet link"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">
              Context <span className="text-muted-foreground font-normal">· optional</span>
            </Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">
              Internal notes{" "}
              <span className="text-muted-foreground font-normal">
                · only you see these
              </span>
            </Label>
            <Textarea
              id="edit-notes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              maxLength={2000}
              placeholder="e.g. They know the host from university. Handle warmly."
              className="bg-warn/[0.04]"
            />
          </div>
        </div>

        {error && (
          <div className="flex gap-2 text-sm text-danger rounded-md bg-danger/5 border border-danger/15 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={cancelMeeting}
            disabled={cancelling || submitting}
            className="mr-auto text-danger hover:bg-danger/5"
          >
            {cancelling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CalendarOff className="h-4 w-4" /> Cancel meeting
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Close
          </Button>
          <Button variant="accent" onClick={save} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
