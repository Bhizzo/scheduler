import { db } from "@/lib/db";
import { MeetingStatus } from "@prisma/client";
import { DayView } from "@/components/day-view";
import { addDays, startOfDay } from "date-fns";

export default async function SchedulePage() {
  // Pull a generous window so navigating between weeks doesn't re-fetch
  const windowStart = addDays(startOfDay(new Date()), -14);
  const windowEnd = addDays(startOfDay(new Date()), 90);

  const meetings = await db.meeting.findMany({
    where: {
      status: MeetingStatus.APPROVED,
      confirmedStart: { gte: windowStart, lt: windowEnd },
    },
    orderBy: { confirmedStart: "asc" },
    include: {
      user: { select: { id: true, name: true, phone: true, email: true } },
    },
  });

  return (
    <div className="container py-10 md:py-14">
      <header className="pb-8 border-b border-line mb-8">
        <span className="label-caps">Schedule</span>
        <h1 className="display text-4xl md:text-5xl mt-2 tracking-tight">
          What's <span className="italic text-accent">on the line</span>
        </h1>
        <p className="mt-3 text-muted-foreground max-w-[58ch]">
          Every approved meeting, laid out against the clock. Click a block to
          edit, reschedule, or cancel.
        </p>
      </header>

      <DayView meetings={meetings} />
    </div>
  );
}
