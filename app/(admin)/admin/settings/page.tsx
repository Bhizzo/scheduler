import { db } from "@/lib/db";
import { SettingsEditor } from "@/components/settings-editor";

export default async function SettingsPage() {
  const rows = await db.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;

  return (
    <div className="container py-10 md:py-14 max-w-[820px]">
      <header className="pb-8 border-b border-line mb-10">
        <span className="label-caps">Settings</span>
        <h1 className="display text-4xl md:text-5xl mt-2 tracking-tight">
          Booking <span className="italic text-accent">rules</span>
        </h1>
        <p className="mt-3 text-muted-foreground max-w-[58ch]">
          Control how guests book: lengths, lead time, slot granularity.
        </p>
      </header>

      <SettingsEditor
        initial={{
          default_meeting_minutes: map.default_meeting_minutes ?? "30",
          allowed_durations: map.allowed_durations ?? "15,30,45,60,90",
          min_lead_time_minutes: map.min_lead_time_minutes ?? "120",
          max_advance_days: map.max_advance_days ?? "60",
          slot_increment_minutes: map.slot_increment_minutes ?? "15",
          buffer_before_minutes: map.buffer_before_minutes ?? "0",
          buffer_after_minutes: map.buffer_after_minutes ?? "0",
          max_meetings_per_day: map.max_meetings_per_day ?? "0",
          max_meetings_per_week: map.max_meetings_per_week ?? "0",
          max_meetings_per_month: map.max_meetings_per_month ?? "0",
          notification_retention_days: map.notification_retention_days ?? "60",
          max_notifications_per_user: map.max_notifications_per_user ?? "200",
        }}
      />
    </div>
  );
}
