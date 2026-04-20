import { db } from "@/lib/db";
import { AvailabilityEditor } from "@/components/availability-editor";
import { format } from "date-fns";

export default async function AvailabilityPage() {
  const [rules, blocked] = await Promise.all([
    db.availabilityRule.findMany({ orderBy: [{ weekday: "asc" }, { startTime: "asc" }] }),
    db.blockedDate.findMany({ orderBy: { date: "asc" } }),
  ]);

  return (
    <div className="container py-10 md:py-14 max-w-[820px]">
      <header className="pb-8 border-b border-line mb-10">
        <span className="label-caps">Availability</span>
        <h1 className="display text-4xl md:text-5xl mt-2 tracking-tight">
          <span className="italic text-accent">Hours</span> & days off
        </h1>
        <p className="mt-3 text-muted-foreground max-w-[58ch]">
          Define when meetings can be requested. Guests only see slots that fit
          inside these windows — and nothing on blocked dates.
        </p>
      </header>

      <AvailabilityEditor
        initialRules={rules.map((r) => ({
          weekday: r.weekday,
          startTime: r.startTime,
          endTime: r.endTime,
          enabled: r.enabled,
        }))}
        initialBlocked={blocked.map((b) => ({
          date: format(b.date, "yyyy-MM-dd"),
          reason: b.reason || undefined,
        }))}
      />
    </div>
  );
}
