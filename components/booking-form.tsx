"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Loader2, Calendar } from "lucide-react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";

type Settings = {
  default_meeting_minutes: string;
  allowed_durations: string;
  slot_increment_minutes: string;
  min_lead_time_minutes: string;
  timezone: string;
};

function buildDateOptions(days = 14) {
  const today = startOfDay(new Date());
  return Array.from({ length: days }).map((_, i) => addDays(today, i));
}

export function BookingForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [_, startTransition] = useTransition();

  const allowedDurations = useMemo(
    () =>
      settings.allowed_durations
        .split(",")
        .map((s) => Number(s.trim()))
        .filter(Boolean),
    [settings.allowed_durations]
  );
  const defaultDuration =
    Number(settings.default_meeting_minutes) || allowedDurations[0] || 30;

  const dateOptions = useMemo(() => buildDateOptions(21), []);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number>(defaultDuration);
  const [time, setTime] = useState<string>("");

  const [slots, setSlots] = useState<string[]>([]);
  const [slotMessage, setSlotMessage] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [location, setLocation] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  // Re-fetch slots when date or duration changes
  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      setSlotMessage(null);
      return;
    }
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
      .catch(() => setSlotMessage("Couldn't load available times. Try again."))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, duration]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedDate) return setError("Pick a date.");
    if (!time) return setError("Pick a time.");
    if (!subject.trim()) return setError("Add a subject.");

    setSubmitting(true);
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: subject.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        date: format(selectedDate, "yyyy-MM-dd"),
        time,
        durationMinutes: duration,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't submit your request. Please try again.");
      return;
    }

    setSuccess(true);
    startTransition(() => {
      setTimeout(() => router.push("/dashboard"), 1100);
    });
  }

  if (success) {
    return (
      <div className="card-e p-10 text-center animate-fade-up">
        <div className="h-14 w-14 rounded-full bg-accent/10 text-accent grid place-items-center mx-auto">
          <CheckCircle2 className="h-7 w-7" strokeWidth={1.5} />
        </div>
        <h2 className="display text-3xl mt-5">Request submitted</h2>
        <p className="mt-2 text-muted-foreground">
          You'll see it on your dashboard while it's reviewed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      {/* Step 1 — date */}
      <fieldset>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="label-caps">Step 01</span>
            <h2 className="display text-2xl mt-1">Pick a day</h2>
          </div>
          <span className="text-xs text-muted-foreground tabular hidden sm:inline">
            Next 3 weeks
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {dateOptions.map((d) => {
            const active = selectedDate && isSameDay(d, selectedDate);
            const isToday = isSameDay(d, new Date());
            return (
              <button
                type="button"
                key={d.toISOString()}
                onClick={() => setSelectedDate(d)}
                className={cn(
                  "relative border rounded-md p-3 text-left transition-all",
                  "hover:border-accent/40 hover:bg-accent/[0.02]",
                  active
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-line bg-surface"
                )}
              >
                <div className="label-caps">{format(d, "EEE")}</div>
                <div className="display text-[22px] leading-none mt-1 tabular">
                  {format(d, "d")}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 tabular">
                  {format(d, "MMM")}
                </div>
                {isToday && (
                  <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Step 2 — duration */}
      <fieldset>
        <div className="mb-4">
          <span className="label-caps">Step 02</span>
          <h2 className="display text-2xl mt-1">How long?</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {allowedDurations.map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => setDuration(d)}
              className={cn(
                "px-4 h-10 rounded-md border text-sm transition-all tabular",
                duration === d
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-line bg-surface hover:border-accent/40"
              )}
            >
              {d} min
            </button>
          ))}
        </div>
      </fieldset>

      {/* Step 3 — time */}
      <fieldset>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="label-caps">Step 03</span>
            <h2 className="display text-2xl mt-1">Pick a time</h2>
          </div>
          {selectedDate && !slotsLoading && slots.length > 0 && (
            <span className="text-xs text-muted-foreground tabular">
              {slots.length} open · {settings.timezone}
            </span>
          )}
        </div>

        {!selectedDate && (
          <p className="text-sm text-muted-foreground italic">Pick a date first.</p>
        )}
        {selectedDate && slotsLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
          </div>
        )}
        {selectedDate && !slotsLoading && slots.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-6 text-center">
            <Calendar className="h-5 w-5 text-muted-foreground mx-auto" />
            <p className="mt-3 text-sm text-ink">
              {slotMessage ?? "No open times for this date and duration."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try another day, or a shorter meeting.
            </p>
          </div>
        )}
        {selectedDate && !slotsLoading && slots.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {slots.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setTime(s)}
                className={cn(
                  "h-10 rounded-md border text-sm transition-all tabular",
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
      </fieldset>

      {/* Step 4 — details */}
      <fieldset className="space-y-5">
        <div>
          <span className="label-caps">Step 04</span>
          <h2 className="display text-2xl mt-1">What's it about?</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder="e.g. Project kickoff"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">
            Location or meeting link{" "}
            <span className="text-muted-foreground font-normal">· optional</span>
          </Label>
          <Input
            id="location"
            placeholder="e.g. Office boardroom, or a Google Meet link"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank if the assistant should decide.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            Context <span className="text-muted-foreground font-normal">· optional</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Anything helpful for the assistant to know"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </div>
      </fieldset>

      {error && (
        <div className="flex gap-2 text-sm text-danger rounded-md bg-danger/5 border border-danger/15 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-line">
        <div className="text-sm text-muted-foreground">
          {selectedDate && time ? (
            <span>
              Requesting{" "}
              <span className="text-ink tabular">
                {format(selectedDate, "EEE, d MMM")} at {time}
              </span>{" "}
              · {duration} min
            </span>
          ) : (
            "Complete each step to continue."
          )}
        </div>
        <Button
          type="submit"
          variant="accent"
          size="lg"
          disabled={submitting || !selectedDate || !time || !subject.trim()}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
        </Button>
      </div>
    </form>
  );
}
