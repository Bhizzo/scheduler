import { db } from "@/lib/db";
import { AdminMeetingsTable } from "@/components/admin-meetings-table";
import { DailyBriefing } from "@/components/daily-briefing";
import { MeetingStatus } from "@prisma/client";

export default async function AdminPage() {
  const [meetings, stats] = await Promise.all([
    db.meeting.findMany({
      orderBy: [{ status: "asc" }, { requestedStart: "asc" }, { createdAt: "desc" }],
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
    }),
    (async () => {
      const [pending, approvedUpcoming, declinedLast30] = await Promise.all([
        db.meeting.count({ where: { status: MeetingStatus.PENDING } }),
        db.meeting.count({
          where: {
            status: MeetingStatus.APPROVED,
            confirmedStart: { gte: new Date() },
          },
        }),
        db.meeting.count({
          where: {
            status: MeetingStatus.REJECTED,
            reviewedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);
      return { pending, approvedUpcoming, declinedLast30 };
    })(),
  ]);

  return (
    <div className="container py-10 md:py-14">
      <header className="pb-8 border-b border-line">
        <span className="label-caps">Assistant dashboard</span>
        <h1 className="display text-4xl md:text-5xl mt-2 tracking-tight">
          <span className="italic text-accent">Today's</span> inbox
        </h1>
        <p className="mt-3 text-muted-foreground">
          A brief on today, the request queue beneath.
        </p>
      </header>

      {/* Daily briefing */}
      <div className="my-8">
        <DailyBriefing />
      </div>

      {/* Stat band */}
      <div className="grid grid-cols-3 gap-4 md:gap-6 my-8">
        <Stat label="Awaiting review" value={stats.pending} tone="warn" />
        <Stat label="Upcoming approved" value={stats.approvedUpcoming} tone="accent" />
        <Stat label="Declined (30d)" value={stats.declinedLast30} tone="muted" />
      </div>

      <AdminMeetingsTable meetings={meetings} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "warn" | "accent" | "muted";
}) {
  const colorClass =
    tone === "warn"
      ? "text-warn"
      : tone === "accent"
      ? "text-accent"
      : "text-ink";
  return (
    <div className="card-e p-5 md:p-6">
      <p className="label-caps">{label}</p>
      <p className={`display mt-2 text-4xl md:text-5xl tabular ${colorClass}`}>{value}</p>
    </div>
  );
}
