import { db } from "./db";
import { MeetingStatus } from "@prisma/client";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  addDays,
  addMinutes,
  endOfMonth,
  endOfWeek,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type AppSettings = {
  defaultMinutes: number;
  allowedDurations: number[];
  minLeadMinutes: number;
  maxAdvanceDays: number; // 0 = no max
  slotIncrementMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  maxMeetingsPerDay: number; // 0 = no cap
  maxMeetingsPerWeek: number;
  maxMeetingsPerMonth: number;
  timezone: string;
};

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const n = (key: string, fallback: number) => {
    const v = Number(map[key]);
    return Number.isFinite(v) ? v : fallback;
  };
  return {
    defaultMinutes: n("default_meeting_minutes", 30),
    allowedDurations: (map.allowed_durations ?? "15,30,45,60,90")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((x) => x > 0),
    minLeadMinutes: n("min_lead_time_minutes", 120),
    maxAdvanceDays: n("max_advance_days", 60),
    slotIncrementMinutes: n("slot_increment_minutes", 15),
    bufferBeforeMinutes: n("buffer_before_minutes", 0),
    bufferAfterMinutes: n("buffer_after_minutes", 0),
    maxMeetingsPerDay: n("max_meetings_per_day", 0),
    maxMeetingsPerWeek: n("max_meetings_per_week", 0),
    maxMeetingsPerMonth: n("max_meetings_per_month", 0),
    timezone: map.timezone ?? process.env.APP_TIMEZONE ?? "Africa/Blantyre",
  };
}

export function zonedDateTimeToUtc(dateStr: string, timeStr: string, timezone: string): Date {
  const local = `${dateStr}T${timeStr}:00`;
  return fromZonedTime(local, timezone);
}

export function formatTimeInZone(utc: Date, timezone: string): string {
  const z = toZonedTime(utc, timezone);
  const hh = z.getHours().toString().padStart(2, "0");
  const mm = z.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseHmm(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Count approved meetings in [startUtc, endUtc).
 */
async function countApprovedIn(startUtc: Date, endUtc: Date) {
  return db.meeting.count({
    where: {
      status: MeetingStatus.APPROVED,
      confirmedStart: { gte: startUtc, lt: endUtc },
    },
  });
}

/**
 * Check weekly & monthly caps for the date in the given timezone.
 * Returns a reason string if capped, or null if ok.
 */
async function checkPeriodCaps(
  dayInZone: Date,
  settings: AppSettings,
  tz: string
): Promise<string | null> {
  if (settings.maxMeetingsPerWeek > 0) {
    const ws = startOfWeek(dayInZone, { weekStartsOn: 1 });
    const we = addDays(endOfWeek(dayInZone, { weekStartsOn: 1 }), 0);
    const weekCount = await countApprovedIn(
      fromZonedTime(ws, tz),
      fromZonedTime(addMinutes(we, 1), tz)
    );
    if (weekCount >= settings.maxMeetingsPerWeek) {
      return `The host has reached the weekly limit of ${settings.maxMeetingsPerWeek} meetings.`;
    }
  }
  if (settings.maxMeetingsPerMonth > 0) {
    const ms = startOfMonth(dayInZone);
    const me = endOfMonth(dayInZone);
    const monthCount = await countApprovedIn(
      fromZonedTime(ms, tz),
      fromZonedTime(addMinutes(me, 1), tz)
    );
    if (monthCount >= settings.maxMeetingsPerMonth) {
      return `The host has reached the monthly limit of ${settings.maxMeetingsPerMonth} meetings.`;
    }
  }
  return null;
}

/**
 * Compute available start-time slots for a given date (yyyy-MM-dd) in the app timezone.
 */
export async function getAvailableSlots(
  dateStr: string,
  durationMinutes: number
): Promise<{ slots: string[]; reason?: string }> {
  const settings = await getSettings();
  const tz = settings.timezone;

  const dayStartUtc = fromZonedTime(`${dateStr}T00:00:00`, tz);
  const dayInZone = toZonedTime(dayStartUtc, tz);
  const weekday = dayInZone.getDay();

  // Max advance check — no slots past the horizon
  if (settings.maxAdvanceDays > 0) {
    const horizon = addDays(startOfDay(new Date()), settings.maxAdvanceDays);
    if (isBefore(horizon, dayStartUtc)) {
      return {
        slots: [],
        reason: `Bookings are only available up to ${settings.maxAdvanceDays} days ahead.`,
      };
    }
  }

  // Blocked date?
  const blocked = await db.blockedDate.findFirst({
    where: {
      date: {
        gte: startOfDay(dayInZone),
        lt: addMinutes(startOfDay(dayInZone), 60 * 24),
      },
    },
  });
  if (blocked) {
    return { slots: [], reason: blocked.reason || "This date is unavailable." };
  }

  // Availability rules
  const rules = await db.availabilityRule.findMany({
    where: { weekday, enabled: true },
    orderBy: { startTime: "asc" },
  });
  if (rules.length === 0) {
    return { slots: [], reason: "Host is not available on this day of the week." };
  }

  // Approved meetings this day
  const dayEndUtc = addMinutes(dayStartUtc, 60 * 24);
  const approvedSameDay = await db.meeting.findMany({
    where: {
      status: MeetingStatus.APPROVED,
      confirmedStart: { gte: dayStartUtc, lt: dayEndUtc },
    },
    select: { confirmedStart: true, confirmedEnd: true },
  });

  // Daily cap
  if (settings.maxMeetingsPerDay > 0 && approvedSameDay.length >= settings.maxMeetingsPerDay) {
    return {
      slots: [],
      reason: `The host is fully booked for this day (cap: ${settings.maxMeetingsPerDay} meetings).`,
    };
  }

  // Weekly / monthly caps
  const periodCapMessage = await checkPeriodCaps(dayInZone, settings, tz);
  if (periodCapMessage) return { slots: [], reason: periodCapMessage };

  // Busy ranges with buffer applied
  const busyRanges: Array<[number, number]> = approvedSameDay
    .filter((m) => m.confirmedStart && m.confirmedEnd)
    .map((m) => {
      const start = toZonedTime(m.confirmedStart!, tz);
      const end = toZonedTime(m.confirmedEnd!, tz);
      const startMin = start.getHours() * 60 + start.getMinutes() - settings.bufferBeforeMinutes;
      const endMin = end.getHours() * 60 + end.getMinutes() + settings.bufferAfterMinutes;
      return [startMin, endMin] as [number, number];
    });

  const now = new Date();
  const earliestAllowed = addMinutes(now, settings.minLeadMinutes);
  const slots: string[] = [];

  for (const rule of rules) {
    const ruleStart = parseHmm(rule.startTime);
    const ruleEnd = parseHmm(rule.endTime);
    for (
      let startMin = ruleStart;
      startMin + durationMinutes <= ruleEnd;
      startMin += settings.slotIncrementMinutes
    ) {
      const endMin = startMin + durationMinutes;

      const overlaps = busyRanges.some(
        ([bs, be]) => startMin < be && endMin > bs
      );
      if (overlaps) continue;

      const candidateLocal = new Date(dayInZone);
      candidateLocal.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
      const candidateUtc = fromZonedTime(candidateLocal, tz);
      if (isSameDay(dayInZone, toZonedTime(now, tz)) && isBefore(candidateUtc, earliestAllowed)) {
        continue;
      }

      const hh = Math.floor(startMin / 60).toString().padStart(2, "0");
      const mm = (startMin % 60).toString().padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }

  const unique = Array.from(new Set(slots)).sort();
  return { slots: unique };
}

/**
 * Validate a requested booking before creating it. Applies every rule the
 * slot engine does (minus the "show available slots" UI side).
 */
export async function validateBookingRequest(opts: {
  dateStr: string;
  timeStr: string;
  durationMinutes: number;
}): Promise<{ ok: true; startUtc: Date; endUtc: Date } | { ok: false; error: string }> {
  const { dateStr, timeStr, durationMinutes } = opts;
  const settings = await getSettings();
  const tz = settings.timezone;

  const startUtc = zonedDateTimeToUtc(dateStr, timeStr, tz);
  const endUtc = addMinutes(startUtc, durationMinutes);

  // Lead time
  const earliestAllowed = addMinutes(new Date(), settings.minLeadMinutes);
  if (isBefore(startUtc, earliestAllowed)) {
    return { ok: false, error: `Please book at least ${settings.minLeadMinutes} minutes ahead.` };
  }

  // Max advance
  if (settings.maxAdvanceDays > 0) {
    const horizon = addDays(startOfDay(new Date()), settings.maxAdvanceDays);
    if (isBefore(horizon, startUtc)) {
      return {
        ok: false,
        error: `Bookings are only available up to ${settings.maxAdvanceDays} days ahead.`,
      };
    }
  }

  // Blocked?
  const dayStartUtc = fromZonedTime(`${dateStr}T00:00:00`, tz);
  const dayEndUtc = addMinutes(dayStartUtc, 60 * 24);
  const blocked = await db.blockedDate.findFirst({
    where: { date: { gte: dayStartUtc, lt: dayEndUtc } },
  });
  if (blocked) {
    return { ok: false, error: blocked.reason || "This date is unavailable." };
  }

  // Availability rule fit
  const zoned = toZonedTime(startUtc, tz);
  const weekday = zoned.getDay();
  const startMin = zoned.getHours() * 60 + zoned.getMinutes();
  const endMin = startMin + durationMinutes;
  const rules = await db.availabilityRule.findMany({ where: { weekday, enabled: true } });
  const fits = rules.some((r) => {
    const rs = parseHmm(r.startTime);
    const re = parseHmm(r.endTime);
    return startMin >= rs && endMin <= re;
  });
  if (!fits) {
    return { ok: false, error: "This time falls outside available hours." };
  }

  // Daily cap
  if (settings.maxMeetingsPerDay > 0) {
    const count = await countApprovedIn(dayStartUtc, dayEndUtc);
    if (count >= settings.maxMeetingsPerDay) {
      return { ok: false, error: "This day is fully booked." };
    }
  }

  // Week/month caps
  const periodCapMessage = await checkPeriodCaps(zoned, settings, tz);
  if (periodCapMessage) return { ok: false, error: periodCapMessage };

  // Overlap (with buffer on existing meetings — expand each busy slot)
  const bufferBefore = settings.bufferBeforeMinutes;
  const bufferAfter = settings.bufferAfterMinutes;
  const overlap = await db.meeting.findFirst({
    where: {
      status: MeetingStatus.APPROVED,
      confirmedStart: { lt: addMinutes(endUtc, bufferBefore) },
      confirmedEnd: { gt: addMinutes(startUtc, -bufferAfter) },
    },
  });
  if (overlap) {
    return {
      ok: false,
      error: "This slot (or its surrounding buffer) is already booked. Please choose another time.",
    };
  }

  return { ok: true, startUtc, endUtc };
}

/**
 * When a meeting is approved, auto-reject any other PENDING meetings whose
 * requested window overlaps the newly approved confirmed window.
 */
export async function autoRejectConflicts(opts: {
  approvedMeetingId: string;
  confirmedStart: Date;
  confirmedEnd: Date;
}) {
  const { approvedMeetingId, confirmedStart, confirmedEnd } = opts;
  const conflicts = await db.meeting.findMany({
    where: {
      id: { not: approvedMeetingId },
      status: MeetingStatus.PENDING,
      requestedStart: { lt: confirmedEnd },
      requestedEnd: { gt: confirmedStart },
    },
  });
  if (conflicts.length === 0) return [] as { id: string; userId: string; subject: string }[];
  const ids = conflicts.map((c) => c.id);
  await db.meeting.updateMany({
    where: { id: { in: ids } },
    data: {
      status: MeetingStatus.REJECTED,
      rejectionReason: "This time slot was booked by another request.",
      reviewedAt: new Date(),
    },
  });
  return conflicts.map((c) => ({ id: c.id, userId: c.userId, subject: c.subject }));
}
