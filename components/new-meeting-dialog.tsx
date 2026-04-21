"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, startOfDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, UserPlus, Users, User as UserIcon, X } from "lucide-react";

type UserHit = { id: string; name: string; phone: string; email: string | null };

type GuestMode = "none" | "existing" | "new";

export function NewMeetingDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultTime,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate?: string;
  defaultTime?: string;
}) {
  const router = useRouter();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [priority, setPriority] = useState(1);

  // Guest selection
  const [guestMode, setGuestMode] = useState<GuestMode>("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserHit[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserHit | null>(null);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestPhone, setNewGuestPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      // Initialize with tomorrow at 10:00 (or passed-in defaults)
      const tomorrow = addDays(startOfDay(new Date()), 1);
      setDate(defaultDate ?? format(tomorrow, "yyyy-MM-dd"));
      setTime(defaultTime ?? "10:00");
      setDurationMinutes(30);
      setSubject("");
      setDescription("");
      setLocation("");
      setInternalNotes("");
      setPriority(1);
      setGuestMode("none");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUser(null);
      setNewGuestName("");
      setNewGuestPhone("");
      setError(null);
    }
  }, [open, defaultDate, defaultTime]);

  // Debounced user search
  useEffect(() => {
    if (guestMode !== "existing") return;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setSearchResults(data.users ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  }, [searchQuery, guestMode]);

  async function submit() {
    setError(null);
    if (!subject.trim()) return setError("Add a subject.");
    if (!date || !time) return setError("Pick a date and time.");

    if (guestMode === "new") {
      if (!newGuestName.trim()) return setError("Add the guest's name.");
      if (!newGuestPhone.trim()) return setError("Add the guest's phone number.");
    }
    if (guestMode === "existing" && !selectedUser) {
      return setError("Pick a guest from the list, or choose a different option.");
    }

    setSubmitting(true);
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assistantCreate: true,
        subject: subject.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        date,
        time,
        durationMinutes,
        priority,
        ...(guestMode === "existing" && selectedUser
          ? { userId: selectedUser.id }
          : {}),
        ...(guestMode === "new"
          ? { guestName: newGuestName.trim(), guestPhone: newGuestPhone.trim() }
          : {}),
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't create the meeting.");
      return;
    }

    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New meeting</DialogTitle>
          <DialogDescription>
            Add a meeting directly to the host's calendar. It will be approved immediately.
          </DialogDescription>
        </DialogHeader>

        {/* When */}
        <div>
          <p className="label-caps mb-2">When</p>
          <div className="grid grid-cols-[1fr_140px_120px] gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="nm-date">Date</Label>
              <Input
                id="nm-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="tabular"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nm-time">Start</Label>
              <Input
                id="nm-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                step={60}
                className="tabular"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nm-duration">Minutes</Label>
              <Input
                id="nm-duration"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                min={5}
                max={480}
                step={5}
                className="tabular"
              />
            </div>
          </div>
        </div>

        {/* What */}
        <div className="space-y-3">
          <p className="label-caps">What</p>
          <div className="space-y-2">
            <Label htmlFor="nm-subject">Subject</Label>
            <Input
              id="nm-subject"
              placeholder="e.g. Quarterly review"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="nm-location">
                Location <span className="text-muted-foreground font-normal">· optional</span>
              </Label>
              <Input
                id="nm-location"
                placeholder="e.g. Office, Google Meet"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nm-priority">Priority</Label>
              <Select
                value={String(priority)}
                onValueChange={(v) => setPriority(Number(v))}
              >
                <SelectTrigger id="nm-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Urgent</SelectItem>
                  <SelectItem value="2">High</SelectItem>
                  <SelectItem value="1">Normal</SelectItem>
                  <SelectItem value="0">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nm-description">
              Context <span className="text-muted-foreground font-normal">· optional</span>
            </Label>
            <Textarea
              id="nm-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nm-notes">
              Internal notes{" "}
              <span className="text-muted-foreground font-normal">
                · only you see these
              </span>
            </Label>
            <Textarea
              id="nm-notes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              maxLength={2000}
              className="min-h-[60px] bg-warn/[0.04]"
            />
          </div>
        </div>

        {/* Who — the guest, optional */}
        <div>
          <p className="label-caps mb-2">Who</p>
          <div className="inline-flex rounded-md border border-line overflow-hidden bg-surface">
            {([
              { key: "none", label: "No external guest", Icon: UserIcon },
              { key: "existing", label: "Existing user", Icon: Users },
              { key: "new", label: "New person", Icon: UserPlus },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setGuestMode(opt.key)}
                className={cn(
                  "px-3 h-9 text-xs inline-flex items-center gap-1.5 transition-colors",
                  guestMode === opt.key
                    ? "bg-ink text-paper"
                    : "text-muted-foreground hover:text-ink"
                )}
              >
                <opt.Icon className="h-3 w-3" />
                {opt.label}
              </button>
            ))}
          </div>

          {guestMode === "existing" && (
            <div className="mt-3 space-y-2">
              {selectedUser ? (
                <div className="flex items-center justify-between rounded-md border border-accent bg-accent/5 px-3 py-2">
                  <div>
                    <p className="text-sm text-ink">{selectedUser.name}</p>
                    <p className="text-xs text-muted-foreground tabular">
                      {selectedUser.phone}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1 hover:bg-accent/10 rounded"
                    aria-label="Clear selection"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Search name or phone…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery.trim().length >= 2 && (
                    <div className="max-h-[180px] overflow-y-auto border border-line rounded-md bg-surface">
                      {searching ? (
                        <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          No matches.
                        </div>
                      ) : (
                        <ul className="divide-y divide-line">
                          {searchResults.map((u) => (
                            <li key={u.id}>
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setSearchQuery("");
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-muted/40"
                              >
                                <p className="text-sm text-ink">{u.name}</p>
                                <p className="text-xs text-muted-foreground tabular">
                                  {u.phone}
                                </p>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {guestMode === "new" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="nm-guest-name">Name</Label>
                <Input
                  id="nm-guest-name"
                  placeholder="e.g. Grace Banda"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nm-guest-phone">Phone</Label>
                <Input
                  id="nm-guest-phone"
                  type="tel"
                  placeholder="+265 999 000 000"
                  value={newGuestPhone}
                  onChange={(e) => setNewGuestPhone(e.target.value)}
                  className="tabular"
                />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                This will be stored on the meeting only — no account is created.
                If they sign up later with the same phone, link them manually from the meeting.
              </p>
            </div>
          )}

          {guestMode === "none" && (
            <p className="mt-3 text-xs text-muted-foreground italic">
              Use this for personal appointments where no external guest is involved.
            </p>
          )}
        </div>

        {error && (
          <div className="flex gap-2 text-sm text-danger rounded-md bg-danger/5 border border-danger/15 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create meeting"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
