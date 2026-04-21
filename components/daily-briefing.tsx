import { db } from "@/lib/db";
import { formatTime, initials } from "@/lib/utils";
import { MeetingStatus } from "@prisma/client";
import { startOfDay, endOfDay, format, differenceInMinutes } from "date-fns";
import { Calendar, MapPin, StickyNote } from "lucide-react";
import { PriorityDot } from "./priority-picker";
import Link from "next/link";

export async function DailyBriefing() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const meetings = await db.meeting.findMany({
    where: {
      status: MeetingStatus.APPROVED,
      confirmedStart: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { confirmedStart: "asc" },
    include: {
      user: { select: { id: true, name: true, phone: true } },
    },
  });

  // Flags worth surfacing for the assistant
  const flags = await Promise.all(
    meetings.map(async (m) => {
      if (!m.userId) return { id: m.id, firstTimer: false, cancellations: 0 };
      const [total, cancelled] = await Promise.all([
        db.meeting.count({ where: { userId: m.userId } }),
        db.meeting.count({
          where: { userId: m.userId, status: MeetingStatus.CANCELLED },
        }),
      ]);
      return {
        id: m.id,
        firstTimer: total === 1,
        cancellations: cancelled,
      };
    })
  );
  const flagsById = Object.fromEntries(flags.map((f) => [f.id, f]));

  const next = meetings.find(
    (m) => (m.confirmedStart ?? m.requestedStart) > now
  );

  return (
    <div className="card-e overflow-hidden">
      <div className="border-b border-line p-5 md:p-6 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <span className="label-caps">Today · {format(now, "EEE, d MMM")}</span>
          <h2 className="display text-2xl mt-1 text-ink">
            {meetings.length === 0
              ? "A clear day"
              : `${meetings.length} ${meetings.length === 1 ? "meeting" : "meetings"} on the calendar`}
          </h2>
        </div>
        {next && (
          <div className="text-right text-sm">
            <div className="label-caps">Next up</div>
            <div className="tabular text-ink mt-0.5">
              {formatTime(next.confirmedStart ?? next.requestedStart)} ·{" "}
              {next.subject}
            </div>
          </div>
        )}
      </div>

      {meetings.length === 0 ? (
        <div className="p-10 text-center">
          <Calendar className="h-5 w-5 text-muted-foreground mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing approved for today. Enjoy the breathing room.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-line">
          {meetings.map((m) => {
            const start = m.confirmedStart ?? m.requestedStart;
            const end = m.confirmedEnd ?? m.requestedEnd;
            const durationMin = differenceInMinutes(end, start);
            const isNow = start <= now && end >= now;
            const isPast = end < now;
            const f = flagsById[m.id];
            return (
              <li
                key={m.id}
                className={`grid grid-cols-[88px_1fr] gap-4 p-4 md:p-5 transition-colors ${
                  isPast ? "opacity-55" : ""
                } ${isNow ? "bg-accent/[0.04]" : ""}`}
              >
                {/* Time column */}
                <div className="tabular">
                  <div className="text-lg text-ink leading-tight">
                    {formatTime(start)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {durationMin} min
                  </div>
                  {isNow && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-danger font-medium uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
                      Now
                    </div>
                  )}
                </div>

                {/* Details column */}
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <PriorityDot priority={m.priority ?? 1} />
                        <h3 className="display text-lg text-ink truncate">
                          {m.subject}
                        </h3>
                      </div>
                      {(() => {
                        const name = m.user?.name ?? m.guestName;
                        const phone = m.user?.phone ?? m.guestPhone;
                        if (!name && !phone) {
                          return (
                            <div className="mt-1 text-sm italic text-muted-foreground">
                              Personal appointment
                            </div>
                          );
                        }
                        return (
                          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="grid h-5 w-5 place-items-center rounded-full bg-accent/10 text-accent text-[9px] font-medium">
                                {initials(name ?? "")}
                              </span>
                              <span className="text-ink">{name ?? "Unnamed guest"}</span>
                            </span>
                            {phone && <span className="tabular text-xs">· {phone}</span>}
                            {!m.user && (m.guestName || m.guestPhone) && (
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                                · no account
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {m.location && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="text-ink">{m.location}</span>
                    </div>
                  )}

                  {m.internalNotes && (
                    <div className="mt-3 rounded-md bg-warn/5 border border-warn/20 p-2.5 flex items-start gap-2">
                      <StickyNote className="h-3.5 w-3.5 text-warn mt-0.5 shrink-0" />
                      <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
                        {m.internalNotes}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {f?.firstTimer && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                        First meeting
                      </span>
                    )}
                    {f && f.cancellations >= 2 && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-danger/10 text-danger">
                        {f.cancellations} past cancellations
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="border-t border-line p-3 flex justify-end">
        <Link
          href="/admin/schedule"
          className="text-xs text-muted-foreground hover:text-ink"
        >
          Open schedule view →
        </Link>
      </div>
    </div>
  );
}
