"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMinutes,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
  differenceInMinutes,
} from "date-fns";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { EditMeetingDialog } from "./edit-meeting-dialog";
import type { Meeting, User } from "@prisma/client";
import { PriorityDot } from "./priority-picker";

type MeetingWithUser = Meeting & { user: Pick<User, "id" | "name" | "phone" | "email"> };

type ViewMode = "day" | "week";

// Display the schedule from 07:00 to 19:00 by default
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 19;
const HOUR_HEIGHT = 56; // pixels per hour
const TOTAL_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT;

export function DayView({ meetings }: { meetings: MeetingWithUser[] }) {
  const [anchor, setAnchor] = useState<Date>(startOfDay(new Date()));
  const [mode, setMode] = useState<ViewMode>("day");
  const [editing, setEditing] = useState<MeetingWithUser | null>(null);

  // Which days are we showing?
  const days = useMemo(() => {
    if (mode === "day") return [anchor];
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [anchor, mode]);

  function go(direction: -1 | 1) {
    setAnchor((d) => addDays(d, mode === "day" ? direction : direction * 7));
  }

  function goToday() {
    setAnchor(startOfDay(new Date()));
  }

  // Meetings on each day
  const byDay = useMemo(() => {
    return days.map((day) => ({
      day,
      items: meetings
        .filter((m) => m.status === "APPROVED")
        .filter((m) => {
          const start = m.confirmedStart ?? m.requestedStart;
          return isSameDay(start, day);
        })
        .sort(
          (a, b) =>
            (a.confirmedStart ?? a.requestedStart).getTime() -
            (b.confirmedStart ?? b.requestedStart).getTime()
        ),
    }));
  }, [days, meetings]);

  const hourMarkers = useMemo(() => {
    return Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }).map(
      (_, i) => DAY_START_HOUR + i
    );
  }, []);

  const now = new Date();
  const todayVisible = days.some((d) => isSameDay(d, now));
  const nowMinutesFromStart =
    (now.getHours() - DAY_START_HOUR) * 60 + now.getMinutes();
  const nowTopPx = (nowMinutesFromStart / 60) * HOUR_HEIGHT;
  const nowInRange =
    nowMinutesFromStart >= 0 &&
    nowMinutesFromStart <= (DAY_END_HOUR - DAY_START_HOUR) * 60;

  return (
    <>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => go(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => go(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-3 display text-lg text-ink">
            {mode === "day"
              ? format(days[0], "EEEE, d MMMM")
              : `${format(days[0], "d MMM")} – ${format(days[6], "d MMM yyyy")}`}
          </div>
        </div>

        <div className="inline-flex rounded-md border border-line overflow-hidden bg-surface">
          {(["day", "week"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-3 h-8 text-xs capitalize transition-colors",
                mode === m
                  ? "bg-ink text-paper"
                  : "text-muted-foreground hover:text-ink"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="card-e overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, 1fr)` }}>
          {/* Header row */}
          <div className="border-b border-line h-12" />
          {byDay.map(({ day, items }) => {
            const isToday = isSameDay(day, now);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "border-b border-l border-line h-12 px-3 flex items-center justify-between",
                  isToday && "bg-accent/5"
                )}
              >
                <div>
                  <div className="label-caps">{format(day, "EEE")}</div>
                  <div
                    className={cn(
                      "tabular text-sm",
                      isToday ? "text-accent font-medium" : "text-ink"
                    )}
                  >
                    {format(day, "d MMM")}
                  </div>
                </div>
                <span
                  className={cn(
                    "text-[10px] tabular px-1.5 py-0.5 rounded",
                    items.length > 0
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground"
                  )}
                >
                  {items.length}
                </span>
              </div>
            );
          })}

          {/* Time axis + day columns */}
          <div
            className="relative border-r border-line"
            style={{ height: TOTAL_HEIGHT }}
          >
            {hourMarkers.map((h, i) => (
              <div
                key={h}
                className="absolute right-2 text-[10.5px] text-muted-foreground tabular"
                style={{ top: i * HOUR_HEIGHT - 6 }}
              >
                {h.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {byDay.map(({ day, items }) => {
            const isToday = isSameDay(day, now);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "relative border-l border-line",
                  isToday && "bg-accent/[0.02]"
                )}
                style={{ height: TOTAL_HEIGHT }}
              >
                {/* Hour lines */}
                {hourMarkers.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "absolute left-0 right-0 border-t",
                      i % 1 === 0 ? "border-line" : "border-line/60"
                    )}
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}

                {/* "Now" indicator */}
                {isToday && nowInRange && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: nowTopPx }}
                  >
                    <div className="relative">
                      <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-danger" />
                      <div className="h-[1.5px] bg-danger" />
                    </div>
                  </div>
                )}

                {/* Meeting blocks */}
                {items.map((m) => {
                  const start = m.confirmedStart ?? m.requestedStart;
                  const end = m.confirmedEnd ?? m.requestedEnd;
                  const startMinutesFromDayStart =
                    (new Date(start).getHours() - DAY_START_HOUR) * 60 +
                    new Date(start).getMinutes();
                  const duration = differenceInMinutes(end, start);
                  const top = (startMinutesFromDayStart / 60) * HOUR_HEIGHT;
                  const height = Math.max((duration / 60) * HOUR_HEIGHT, 24);

                  const inRange =
                    startMinutesFromDayStart + duration > 0 &&
                    startMinutesFromDayStart <
                      (DAY_END_HOUR - DAY_START_HOUR) * 60;
                  if (!inRange) return null;

                  const isCompact = height < 56;

                  return (
                    <button
                      key={m.id}
                      onClick={() => setEditing(m)}
                      className={cn(
                        "absolute left-1 right-1 rounded-md border bg-accent/[0.08] border-accent/30 text-left transition-all hover:bg-accent/[0.14] hover:border-accent/50 overflow-hidden p-2 z-10",
                        mode === "week" && "text-xs p-1.5"
                      )}
                      style={{
                        top,
                        height,
                      }}
                      title={`${m.subject} — ${m.user.name}`}
                    >
                      <div className="flex items-start gap-1.5 min-w-0">
                        <PriorityDot priority={m.priority ?? 1} className="mt-1 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              "text-ink font-medium truncate leading-tight",
                              mode === "week" ? "text-[11px]" : "text-[13px]"
                            )}
                          >
                            {m.subject}
                          </div>
                          <div className="text-[10.5px] text-muted-foreground tabular leading-tight mt-0.5">
                            {format(start, "HH:mm")}–{format(end, "HH:mm")}
                          </div>
                          {!isCompact && mode === "day" && (
                            <>
                              <div className="text-[11px] text-ink/80 mt-1 truncate">
                                {m.user.name}
                              </div>
                              {m.location && (
                                <div className="text-[10.5px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{m.location}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {items.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center opacity-30">
                      <Clock className="h-4 w-4 text-muted-foreground mx-auto" />
                      <p className="mt-1 text-[10.5px] text-muted-foreground">
                        {mode === "day" ? "No meetings" : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <EditMeetingDialog
        meeting={editing}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
      />
    </>
  );
}
