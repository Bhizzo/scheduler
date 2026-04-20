"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Loader2 } from "lucide-react";

export const PRIORITY_META: Record<
  number,
  { label: string; dot: string; ring: string; text: string }
> = {
  0: {
    label: "Low",
    dot: "bg-muted-foreground/40",
    ring: "ring-muted-foreground/20",
    text: "text-muted-foreground",
  },
  1: {
    label: "Normal",
    dot: "bg-muted-foreground",
    ring: "ring-muted-foreground/20",
    text: "text-ink",
  },
  2: {
    label: "High",
    dot: "bg-warn",
    ring: "ring-warn/20",
    text: "text-warn",
  },
  3: {
    label: "Urgent",
    dot: "bg-danger",
    ring: "ring-danger/25",
    text: "text-danger",
  },
};

/** A compact read-only indicator (dot + label). */
export function PriorityDot({
  priority,
  showLabel = false,
  className,
}: {
  priority: number;
  showLabel?: boolean;
  className?: string;
}) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META[1];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "h-2 w-2 rounded-full ring-2 ring-inset",
          meta.dot,
          meta.ring
        )}
      />
      {showLabel && (
        <span className={cn("text-[11px] font-medium uppercase tracking-wider", meta.text)}>
          {meta.label}
        </span>
      )}
    </span>
  );
}

/** Editable picker — assistant-only. */
export function PriorityPicker({
  meetingId,
  priority,
  compact = false,
}: {
  meetingId: string;
  priority: number;
  compact?: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(priority);

  async function onChange(next: string) {
    const n = Number(next);
    setValue(n);
    setSaving(true);
    const res = await fetch(`/api/meetings/${meetingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setPriority", priority: n }),
    });
    setSaving(false);
    if (!res.ok) {
      // revert on error
      setValue(priority);
      return;
    }
    router.refresh();
  }

  const meta = PRIORITY_META[value] ?? PRIORITY_META[1];

  return (
    <div
      onClick={(e) => {
        // Prevent parent row click handler from toggling the expand state
        e.stopPropagation();
      }}
      className="inline-flex items-center gap-2"
    >
      <Select value={String(value)} onValueChange={onChange} disabled={saving}>
        <SelectTrigger
          className={cn(
            "h-8 border-line bg-transparent hover:bg-muted/60 transition-colors gap-2",
            compact ? "w-[118px] px-2.5 text-xs" : "w-[148px] text-sm"
          )}
        >
          <SelectValue>
            <span className="inline-flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full ring-2 ring-inset",
                  meta.dot,
                  meta.ring
                )}
              />
              <span className={meta.text}>{meta.label}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {[3, 2, 1, 0].map((p) => {
            const m = PRIORITY_META[p];
            return (
              <SelectItem key={p} value={String(p)}>
                <span className="inline-flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full ring-2 ring-inset",
                      m.dot,
                      m.ring
                    )}
                  />
                  <span>{m.label}</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
    </div>
  );
}
