import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookingForm } from "@/components/booking-form";
import { ArrowLeft } from "lucide-react";

export default async function BookPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const rows = await db.setting.findMany();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;

  // Fill in sensible defaults in case seed hasn't run
  const hydrated = {
    default_meeting_minutes: settings.default_meeting_minutes ?? "30",
    allowed_durations: settings.allowed_durations ?? "15,30,45,60,90",
    slot_increment_minutes: settings.slot_increment_minutes ?? "15",
    min_lead_time_minutes: settings.min_lead_time_minutes ?? "120",
    timezone: settings.timezone ?? "Africa/Blantyre",
  };

  return (
    <div className="container py-10 md:py-14 max-w-[920px]">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dashboard
      </Link>

      <header className="mt-6 mb-10 pb-8 border-b border-line">
        <span className="label-caps">New request</span>
        <h1 className="display text-4xl md:text-5xl mt-2 tracking-tight">
          Request a <span className="italic text-accent">meeting</span>
        </h1>
        <p className="mt-3 text-muted-foreground max-w-[58ch]">
          Pick a time that works for you. The assistant will review it and
          either confirm it, reschedule it, or let you know why they can't.
        </p>
      </header>

      <BookingForm settings={hydrated} />
    </div>
  );
}
