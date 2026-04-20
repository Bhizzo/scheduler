"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Loader2, Check, StickyNote } from "lucide-react";

export function NotesEditor({
  meetingId,
  initialNotes,
}: {
  meetingId: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = notes.trim() !== (initialNotes ?? "").trim();

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/meetings/${meetingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateNotes", internalNotes: notes.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 label-caps text-warn">
        <StickyNote className="h-3 w-3" />
        Internal notes
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Private to you. e.g. They know the host from university."
        maxLength={2000}
        className="bg-warn/[0.03] text-sm min-h-[72px]"
      />
      {dirty && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="accent"
            onClick={save}
            disabled={saving}
            className="h-7 text-xs"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : saved ? (
              <>
                <Check className="h-3 w-3" /> Saved
              </>
            ) : (
              "Save notes"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
