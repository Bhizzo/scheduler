import { differenceInMinutes } from "date-fns";

export type TimeStatus =
  | "upcoming" // more than 30 min away
  | "starting_soon" // within 30 min of start
  | "in_progress" // between start and end
  | "completed"; // after end

/**
 * Returns a time-based status for an approved meeting.
 * For non-approved meetings, returns 'upcoming' regardless (the regular
 * status badge handles rejected/pending/cancelled cases).
 */
export function getTimeStatus(
  start: Date | string,
  end: Date | string,
  now: Date = new Date()
): TimeStatus {
  const s = new Date(start);
  const e = new Date(end);
  if (now >= e) return "completed";
  if (now >= s) return "in_progress";
  if (differenceInMinutes(s, now) <= 30) return "starting_soon";
  return "upcoming";
}

export const TIME_STATUS_META: Record<
  TimeStatus,
  { label: string; classes: string } | null
> = {
  upcoming: null, // don't render a pill, default state
  starting_soon: {
    label: "Starting soon",
    classes: "bg-warn/10 text-warn ring-warn/20",
  },
  in_progress: {
    label: "In progress",
    classes: "bg-danger/10 text-danger ring-danger/25",
  },
  completed: {
    label: "Completed",
    classes: "bg-muted text-muted-foreground ring-line",
  },
};
