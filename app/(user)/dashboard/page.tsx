import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MeetingCard } from "@/components/meeting-card";
import { Button } from "@/components/ui/button";
import { Plus, CalendarRange } from "lucide-react";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const meetings = await db.meeting.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }],
  });

  const pending = meetings.filter((m) => m.status === "PENDING");
  const approved = meetings.filter((m) => m.status === "APPROVED");
  const history = meetings.filter((m) => m.status === "REJECTED" || m.status === "CANCELLED");

  return (
    <div className="container py-10 md:py-14">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
        <div>
          <span className="label-caps">Your dashboard</span>
          <h1 className="display text-4xl md:text-5xl mt-2 tracking-tight">
            Hello, <span className="italic text-accent">{user.name.split(" ")[0]}</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            {meetings.length === 0
              ? "No requests yet. Ready to put something on the calendar?"
              : `${meetings.length} request${meetings.length === 1 ? "" : "s"} so far.`}
          </p>
        </div>
        <Button asChild variant="accent" size="lg">
          <Link href="/book">
            <Plus className="h-4 w-4" />
            Request a meeting
          </Link>
        </Button>
      </div>

      {meetings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-10 space-y-12">
          {pending.length > 0 && (
            <Section title="Awaiting review" count={pending.length}>
              <Grid>
                {pending.map((m) => (
                  <MeetingCard key={m.id} meeting={m} allowCancel allowReschedule />
                ))}
              </Grid>
            </Section>
          )}
          {approved.length > 0 && (
            <Section title="Approved" count={approved.length}>
              <Grid>
                {approved.map((m) => (
                  <MeetingCard key={m.id} meeting={m} allowCancel allowReschedule />
                ))}
              </Grid>
            </Section>
          )}
          {history.length > 0 && (
            <Section title="Past & declined" count={history.length}>
              <Grid>
                {history.map((m) => (
                  <MeetingCard key={m.id} meeting={m} />
                ))}
              </Grid>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="display text-xl text-ink">{title}</h2>
        <span className="tabular text-xs text-muted-foreground">
          {count} {count === 1 ? "entry" : "entries"}
        </span>
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function EmptyState() {
  return (
    <div className="mt-16 border border-dashed border-border rounded-lg py-20 flex flex-col items-center justify-center text-center">
      <div className="h-14 w-14 rounded-full bg-accent/10 text-accent grid place-items-center">
        <CalendarRange className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h3 className="display text-2xl mt-5">A fresh calendar</h3>
      <p className="mt-2 max-w-[40ch] text-muted-foreground">
        When you request a meeting, it'll show up here with its current state.
      </p>
      <Button asChild variant="accent" className="mt-6">
        <Link href="/book">Request your first meeting</Link>
      </Button>
    </div>
  );
}
