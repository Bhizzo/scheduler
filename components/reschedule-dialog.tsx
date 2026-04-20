"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, isSameDay, startOfDay, differenceInMinutes } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { AlertCircle, Loader2, Calendar, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Meeting } from "@prisma/client";

export function RescheduleDialog({
  meeting,
  open,
  onOpenChange,
}: {
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string>("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotMessage, setSlotMessage] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateOptions = Array.from({ length: 21 }).map((_, i) =>
    addDays(startOfDay(new Date()), i)
  );

  const duration = meeting
    ? differenceInMinutes(
        meeting.confirmedEnd ?? meeting.requestedEnd,
        meeting.confirmedStart ?? meeting.requestedStart
      )
    : 30;

  useEffect(() => {
    if (open) {
      setSelectedDate(null);
      setTime("");
      setSlots([]);
      setSlotMessage(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!selectedDate) return;
    setTime("");
    setSlotsLoading(true);
    setSlotMessage(null);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    fetch(`/api/slots?date=${dateStr}&duration=${duration}`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots ?? []);
        setSlotMessage(data.reason ?? null);
      })
      .catch(() => setSlotMessage("Couldn't load available times."))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, duration]);

  async function submit() {
    if (!meeting || !selectedDate || !time) return;
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/meetings/${meeting.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "proposeReschedule",
        date: format(selectedDate, "yyyy-MM-dd"),
        time,
        durationMinutes: duration,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't submit. Try another time.");
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
          <DialogTitle>Propose a new time</DialogTitle>
          <DialogDescription>
            "{meeting.subject}" — {duration} minutes
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-accent/5 border border-accent/20 p-3 flex gap-2 text-xs text-ink">
          <Info className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
          <span>
            The assistant will review your proposed time and confirm, decline, or
            suggest something else.
          </span>
        </div>

        {/* Date picker */}
        <div>
          <p className="label-caps mb-3">Pick a day</p>
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
            {dateOptions.map((d) => {
              const active = selectedDate && isSameDay(d, selectedDate);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={cn(
                    "rounded-md border p-2 text-left transition-all",
                    active
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-line bg-surface hover:border-accent/40"
                  )}
                >
                  <div className="label-caps">{format(d, "EEE")}</div>
                  <div className="display text-base leading-none mt-1 tabular">
                    {format(d, "d")}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time grid */}
        {selectedDate && (
          <div>
            <p className="label-caps mb-3">Pick a time</p>
            {slotsLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
              </div>
            )}
            {!slotsLoading && slots.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground mx-auto" />
                <p className="mt-2 text-ink">
                  {slotMessage ?? "No open times on this day."}
                </p>
              </div>
            )}
            {!slotsLoading && slots.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-1.5 max-h-[180px] overflow-y-auto">
                {slots.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setTime(s)}
                    className={cn(
                      "h-9 rounded-md border text-sm transition-all tabular",
                      time === s
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-line bg-surface hover:border-accent/40"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
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
            variant="accent"
            onClick={submit}
            disabled={submitting || !selectedDate || !time}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Propose this time"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
