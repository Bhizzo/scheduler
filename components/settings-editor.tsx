"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2, Check } from "lucide-react";

export type SettingsValues = {
  default_meeting_minutes: string;
  allowed_durations: string;
  min_lead_time_minutes: string;
  max_advance_days: string;
  slot_increment_minutes: string;
  buffer_before_minutes: string;
  buffer_after_minutes: string;
  max_meetings_per_day: string;
  max_meetings_per_week: string;
  max_meetings_per_month: string;
};

export function SettingsEditor({ initial }: { initial: SettingsValues }) {
  const router = useRouter();
  const [values, setValues] = useState<SettingsValues>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof SettingsValues>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function save() {
    setError(null);
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="space-y-10">
      {/* Meeting lengths */}
      <Section
        title="Meeting lengths"
        subtitle="What durations guests can choose when booking."
      >
        <Row label="Default length" hint="Pre-selected when the booking form opens.">
          <Input
            type="number"
            value={values.default_meeting_minutes}
            onChange={(e) => update("default_meeting_minutes", e.target.value)}
            className="max-w-[120px] tabular"
            min={5}
            max={480}
          />
          <Suffix>minutes</Suffix>
        </Row>
        <Row label="Allowed durations" hint="Comma-separated list of minute values.">
          <Input
            value={values.allowed_durations}
            onChange={(e) => update("allowed_durations", e.target.value)}
            placeholder="15,30,45,60,90"
            className="tabular"
          />
        </Row>
        <Row label="Slot granularity" hint="How finely the time grid is divided.">
          <Input
            type="number"
            value={values.slot_increment_minutes}
            onChange={(e) => update("slot_increment_minutes", e.target.value)}
            className="max-w-[120px] tabular"
            min={5}
            max={120}
          />
          <Suffix>minutes</Suffix>
        </Row>
      </Section>

      {/* Booking window */}
      <Section
        title="Booking window"
        subtitle="How soon and how far ahead people can book."
      >
        <Row
          label="Minimum lead time"
          hint="People can't book within this many minutes of now."
        >
          <Input
            type="number"
            value={values.min_lead_time_minutes}
            onChange={(e) => update("min_lead_time_minutes", e.target.value)}
            className="max-w-[120px] tabular"
            min={0}
          />
          <Suffix>minutes</Suffix>
        </Row>
        <Row
          label="Maximum advance"
          hint="People can't book more than this far in the future. 0 = no limit."
        >
          <Input
            type="number"
            value={values.max_advance_days}
            onChange={(e) => update("max_advance_days", e.target.value)}
            className="max-w-[120px] tabular"
            min={0}
            max={365}
          />
          <Suffix>{values.max_advance_days === "0" ? "no limit" : "days"}</Suffix>
        </Row>
      </Section>

      {/* Buffers */}
      <Section
        title="Buffers around meetings"
        subtitle="Protect time on either side so the host isn't back-to-back."
      >
        <Row
          label="Buffer before"
          hint="Extra time reserved before every approved meeting."
        >
          <Input
            type="number"
            value={values.buffer_before_minutes}
            onChange={(e) => update("buffer_before_minutes", e.target.value)}
            className="max-w-[120px] tabular"
            min={0}
            max={240}
          />
          <Suffix>minutes</Suffix>
        </Row>
        <Row
          label="Buffer after"
          hint="Extra time reserved after every approved meeting."
        >
          <Input
            type="number"
            value={values.buffer_after_minutes}
            onChange={(e) => update("buffer_after_minutes", e.target.value)}
            className="max-w-[120px] tabular"
            min={0}
            max={240}
          />
          <Suffix>minutes</Suffix>
        </Row>
      </Section>

      {/* Caps */}
      <Section
        title="Meeting caps"
        subtitle="Hard limits on how many approved meetings can fit a period. 0 = no cap."
      >
        <Row label="Per day">
          <Input
            type="number"
            value={values.max_meetings_per_day}
            onChange={(e) => update("max_meetings_per_day", e.target.value)}
            className="max-w-[120px] tabular"
            min={0}
            max={50}
          />
          <Suffix>{values.max_meetings_per_day === "0" ? "no cap" : "meetings/day"}</Suffix>
        </Row>
        <Row label="Per week">
          <Input
            type="number"
            value={values.max_meetings_per_week}
            onChange={(e) => update("max_meetings_per_week", e.target.value)}
            className="max-w-[120px] tabular"
            min={0}
            max={200}
          />
          <Suffix>{values.max_meetings_per_week === "0" ? "no cap" : "meetings/week"}</Suffix>
        </Row>
        <Row label="Per month">
          <Input
            type="number"
            value={values.max_meetings_per_month}
            onChange={(e) => update("max_meetings_per_month", e.target.value)}
            className="max-w-[120px] tabular"
            min={0}
            max={600}
          />
          <Suffix>{values.max_meetings_per_month === "0" ? "no cap" : "meetings/month"}</Suffix>
        </Row>
      </Section>

      {error && (
        <div className="text-sm text-danger rounded-md bg-danger/5 border border-danger/15 px-3 py-2.5">
          {error}
        </div>
      )}

      <div className="sticky bottom-6 flex justify-end gap-3">
        <Button variant="accent" size="lg" onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            "Save settings"
          )}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-4">
        <h2 className="display text-xl text-ink">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </header>
      <div className="card-e divide-y divide-line">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-3 md:gap-8 p-5 md:p-6 items-center">
      <div>
        <Label>{label}</Label>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}

function Suffix({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-muted-foreground">{children}</span>;
}
