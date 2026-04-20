"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, Check } from "lucide-react";

type Rule = { weekday: number; startTime: string; endTime: string; enabled: boolean };
type BlockedDate = { date: string; reason?: string };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AvailabilityEditor({
  initialRules,
  initialBlocked,
}: {
  initialRules: Rule[];
  initialBlocked: BlockedDate[];
}) {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [blocked, setBlocked] = useState<BlockedDate[]>(initialBlocked);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRule(i: number, patch: Partial<Rule>) {
    setRules((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRule() {
    setRules((rs) => [...rs, { weekday: 1, startTime: "09:00", endTime: "17:00", enabled: true }]);
  }
  function removeRule(i: number) {
    setRules((rs) => rs.filter((_, idx) => idx !== i));
  }

  function addBlocked() {
    setBlocked((b) => [...b, { date: "", reason: "" }]);
  }
  function updateBlocked(i: number, patch: Partial<BlockedDate>) {
    setBlocked((b) => b.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }
  function removeBlocked(i: number) {
    setBlocked((b) => b.filter((_, idx) => idx !== i));
  }

  async function save() {
    setError(null);
    setSaving(true);
    const res = await fetch("/api/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rules,
        blockedDates: blocked
          .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date))
          .map((d) => ({ date: d.date, reason: d.reason || undefined })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save changes.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  // Group rules by weekday for a cleaner display
  const byDay = Array.from({ length: 7 }, (_, weekday) =>
    rules
      .map((r, idx) => ({ ...r, idx }))
      .filter((r) => r.weekday === weekday)
  );

  return (
    <div className="space-y-12">
      {/* Weekly hours */}
      <section>
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <span className="label-caps">Weekly hours</span>
            <h2 className="display text-2xl mt-1">When people can book</h2>
          </div>
          <Button variant="outline" size="sm" onClick={addRule}>
            <Plus className="h-4 w-4" /> Add window
          </Button>
        </div>

        <div className="card-e divide-y divide-line">
          {byDay.map((dayRules, weekday) => (
            <div key={weekday} className="grid grid-cols-[100px_1fr] items-start p-4 gap-4">
              <div className="pt-2">
                <div className="font-medium text-sm text-ink">{WEEKDAYS[weekday]}</div>
                {dayRules.length === 0 && (
                  <div className="text-xs text-muted-foreground mt-1">Closed</div>
                )}
              </div>
              <div className="space-y-2">
                {dayRules.length === 0 ? (
                  <button
                    onClick={() =>
                      setRules((rs) => [
                        ...rs,
                        { weekday, startTime: "09:00", endTime: "17:00", enabled: true },
                      ])
                    }
                    className="text-sm text-muted-foreground hover:text-ink"
                  >
                    + Open {WEEKDAYS[weekday]}
                  </button>
                ) : (
                  dayRules.map((r) => (
                    <div key={r.idx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        onChange={(e) => updateRule(r.idx, { enabled: e.target.checked })}
                        className="accent-[hsl(var(--accent))]"
                      />
                      <Input
                        type="time"
                        value={r.startTime}
                        onChange={(e) => updateRule(r.idx, { startTime: e.target.value })}
                        className="w-32 tabular"
                      />
                      <span className="text-muted-foreground">—</span>
                      <Input
                        type="time"
                        value={r.endTime}
                        onChange={(e) => updateRule(r.idx, { endTime: e.target.value })}
                        className="w-32 tabular"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRule(r.idx)}
                        className="ml-auto"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Blocked dates */}
      <section>
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <span className="label-caps">Blocked dates</span>
            <h2 className="display text-2xl mt-1">Holidays & days off</h2>
          </div>
          <Button variant="outline" size="sm" onClick={addBlocked}>
            <Plus className="h-4 w-4" /> Add date
          </Button>
        </div>

        <div className="card-e p-4">
          {blocked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blocked dates.</p>
          ) : (
            <div className="space-y-2">
              {blocked.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={b.date}
                    onChange={(e) => updateBlocked(i, { date: e.target.value })}
                    className="w-44 tabular"
                  />
                  <Input
                    placeholder="Reason (optional)"
                    value={b.reason ?? ""}
                    onChange={(e) => updateBlocked(i, { reason: e.target.value })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeBlocked(i)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="text-sm text-danger rounded-md bg-danger/5 border border-danger/15 px-3 py-2.5">
          {error}
        </div>
      )}

      <div className={cn("sticky bottom-6 flex justify-end gap-3")}>
        <Button variant="accent" size="lg" onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </div>
  );
}
