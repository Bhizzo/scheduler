"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDate, formatTime, initials } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ReviewDialog } from "./review-dialog";
import { EditMeetingDialog } from "./edit-meeting-dialog";
import { NewMeetingDialog } from "./new-meeting-dialog";
import { PriorityDot, PriorityPicker } from "./priority-picker";
import { NotesEditor } from "./notes-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "@/lib/utils";
import type { Meeting, MeetingStatus, User } from "@prisma/client";
import {
  Check,
  X,
  ChevronRight,
  Phone,
  Mail,
  Calendar as CalIcon,
  MapPin,
  Edit3,
  StickyNote,
  Plus,
  Search,
  SlidersHorizontal,
  EyeOff,
  Eye,
  Loader2,
} from "lucide-react";
import { getTimeStatus, TIME_STATUS_META } from "@/lib/meeting-time";

type MeetingWithUser = Meeting & {
  user: Pick<User, "id" | "name" | "phone" | "email"> | null;
};

type TabKey = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

const statusTabs: { key: TabKey; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Declined" },
  { key: "ALL", label: "All" },
];

/** Resolve display identity for a meeting, whether it has a linked user or just guest fields. */
function guestIdentity(m: MeetingWithUser): { name: string; phone: string; email?: string | null } | null {
  if (m.user) return { name: m.user.name, phone: m.user.phone, email: m.user.email };
  if (m.guestName || m.guestPhone) {
    return {
      name: m.guestName ?? "Unnamed guest",
      phone: m.guestPhone ?? "",
    };
  }
  return null; // personal appointment, no external guest
}

export function AdminMeetingsTable({
  initialMeetings,
  initialCounts,
}: {
  initialMeetings: MeetingWithUser[];
  initialCounts: Record<TabKey, number>;
}) {
  // Filter state
  const [tab, setTab] = useState<TabKey>("PENDING");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("priority");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Data state
  const [meetings, setMeetings] = useState<MeetingWithUser[]>(initialMeetings);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Dialog state
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState<"approve" | "reject">("approve");
  const [reviewTarget, setReviewTarget] = useState<MeetingWithUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MeetingWithUser | null>(null);
  const [newMeetingOpen, setNewMeetingOpen] = useState(false);

  // Debounce the search input so we don't hammer the API
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setSearch(searchInput.trim()), 300);
  }, [searchInput]);

  // Re-fetch whenever filter state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "ALL") params.set("status", tab);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (sort) params.set("sort", sort);
    if (search) params.set("q", search);
    if (showPast) params.set("past", "1");
    params.set("limit", "50");

    setLoading(true);
    fetch(`/api/meetings?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setMeetings(data.meetings ?? []);
        setNextCursor(data.nextCursor ?? null);
      })
      .catch(() => {
        // keep prior data
      })
      .finally(() => setLoading(false));
  }, [tab, priorityFilter, sort, search, showPast]);

  async function loadMore() {
    if (!nextCursor) return;
    const params = new URLSearchParams();
    if (tab !== "ALL") params.set("status", tab);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (sort) params.set("sort", sort);
    if (search) params.set("q", search);
    if (showPast) params.set("past", "1");
    params.set("limit", "50");
    params.set("cursor", nextCursor);

    setLoading(true);
    const res = await fetch(`/api/meetings?${params.toString()}`);
    const data = await res.json();
    setMeetings((prev) => [...prev, ...(data.meetings ?? [])]);
    setNextCursor(data.nextCursor ?? null);
    setLoading(false);
  }

  function openReview(mode: "approve" | "reject", m: MeetingWithUser) {
    setReviewMode(mode);
    setReviewTarget(m);
    setReviewOpen(true);
  }

  function openEdit(m: MeetingWithUser) {
    setEditTarget(m);
    setEditOpen(true);
  }

  const filtersApplied =
    priorityFilter !== "all" || sort !== "priority" || search !== "" || showPast;

  return (
    <>
      {/* Header row: tabs + new-meeting button */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="flex gap-1 -mb-px flex-1 border-b border-line">
          {statusTabs.map((t) => {
            const active = tab === t.key;
            const count = initialCounts[t.key];
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-4 h-11 flex items-center gap-2 text-sm border-b-2 transition-colors",
                  active
                    ? "border-ink text-ink"
                    : "border-transparent text-muted-foreground hover:text-ink"
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "tabular text-[11px] px-1.5 py-0.5 rounded",
                    active ? "bg-ink text-paper" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <Button variant="accent" size="sm" onClick={() => setNewMeetingOpen(true)}>
          <Plus className="h-4 w-4" /> New meeting
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 py-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-[360px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search subject, guest, location…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Button
          variant={filtersOpen || filtersApplied ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          {filtersApplied && (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-accent" aria-label="Filters active" />
          )}
        </Button>

        {(tab === "APPROVED" || tab === "ALL") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPast((v) => !v)}
            className={showPast ? "border-ink" : undefined}
          >
            {showPast ? (
              <>
                <Eye className="h-3.5 w-3.5" /> Past shown
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5" /> Hide past
              </>
            )}
          </Button>
        )}

        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
      </div>

      {filtersOpen && (
        <div className="rounded-lg border border-line bg-muted/20 p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-down">
          <div className="space-y-1.5">
            <p className="label-caps">Priority</p>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any priority</SelectItem>
                <SelectItem value="3">Urgent only</SelectItem>
                <SelectItem value="2">High only</SelectItem>
                <SelectItem value="1">Normal only</SelectItem>
                <SelectItem value="0">Low only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="label-caps">Sort</p>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority (urgent first)</SelectItem>
                <SelectItem value="date">Meeting date (soonest first)</SelectItem>
                <SelectItem value="recent">Most recently submitted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Rows */}
      {meetings.length === 0 ? (
        <div className="py-20 text-center">
          <CalIcon className="h-5 w-5 text-muted-foreground mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">
            {search || filtersApplied ? "Nothing matches these filters." : "Nothing here."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {meetings.map((m) => {
            const start = m.confirmedStart ?? m.requestedStart;
            const end = m.confirmedEnd ?? m.requestedEnd;
            const isOpen = expanded === m.id;
            const identity = guestIdentity(m);
            const timeStatus =
              m.status === "APPROVED"
                ? getTimeStatus(start, end)
                : "upcoming";
            const timeMeta = TIME_STATUS_META[timeStatus];
            const isPast = timeStatus === "completed";

            return (
              <li key={m.id} className={cn("group", isPast && "opacity-60")}>
                <button
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  className="w-full text-left py-4 grid grid-cols-[auto_auto_1fr_auto] md:grid-cols-[auto_auto_1fr_auto_auto_auto] items-center gap-3 md:gap-4 hover:bg-muted/30 px-3 md:px-4 -mx-3 md:-mx-4 rounded-md transition-colors"
                >
                  <PriorityDot priority={m.priority ?? 1} />
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/10 text-accent text-xs font-medium tabular">
                    {identity ? initials(identity.name) : "·"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="text-ink font-medium truncate">{m.subject}</span>
                      {m.internalNotes && (
                        <StickyNote
                          className="h-3 w-3 text-warn shrink-0"
                          aria-label="Has internal notes"
                        />
                      )}
                      {timeMeta && (
                        <span className={cn("chip ring-1 ring-inset", timeMeta.classes)}>
                          {timeMeta.label}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      {identity ? (
                        <span>
                          {identity.name}
                          {identity.phone && (
                            <>
                              {" "}
                              · <span className="tabular">{identity.phone}</span>
                            </>
                          )}
                          {!m.user && (m.guestName || m.guestPhone) && (
                            <span className="ml-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                              · no account
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="italic">Personal appointment</span>
                      )}
                      {m.location && (
                        <span className="hidden lg:inline-flex items-center gap-1 text-muted-foreground/70 truncate max-w-[180px]">
                          <MapPin className="h-3 w-3" />
                          {m.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:block text-sm tabular">
                    <div className="text-ink">{formatDate(start)}</div>
                    <div className="text-muted-foreground text-xs">
                      {formatTime(start)}–{formatTime(end)}
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <StatusBadge status={m.status} />
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isOpen && "rotate-90"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="pb-6 px-3 md:px-4 animate-slide-down">
                    <div className="rounded-lg border border-line bg-muted/30 p-5 grid md:grid-cols-[1fr_280px] gap-6">
                      <div>
                        <p className="label-caps">Requested</p>
                        <p className="mt-1 tabular text-sm text-ink">
                          {formatDate(m.requestedStart)} ·{" "}
                          {formatTime(m.requestedStart)}–{formatTime(m.requestedEnd)}
                        </p>

                        {m.confirmedStart && (
                          <>
                            <p className="label-caps mt-4">Confirmed</p>
                            <p className="mt-1 tabular text-sm text-accent">
                              {formatDate(m.confirmedStart)} ·{" "}
                              {formatTime(m.confirmedStart)}–{formatTime(m.confirmedEnd!)}
                            </p>
                          </>
                        )}

                        {m.location && (
                          <>
                            <p className="label-caps mt-4">Location</p>
                            <p className="mt-1 text-sm text-ink flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {m.location}
                            </p>
                          </>
                        )}

                        {m.description && (
                          <>
                            <p className="label-caps mt-4">Context</p>
                            <p className="mt-1 text-sm text-ink leading-relaxed whitespace-pre-wrap">
                              {m.description}
                            </p>
                          </>
                        )}

                        {m.status === "REJECTED" && m.rejectionReason && (
                          <>
                            <p className="label-caps mt-4">Reason given</p>
                            <p className="mt-1 text-sm text-ink leading-relaxed">
                              {m.rejectionReason}
                            </p>
                          </>
                        )}

                        <div className="mt-5 border-t border-line pt-4">
                          <NotesEditor
                            meetingId={m.id}
                            initialNotes={m.internalNotes}
                          />
                        </div>
                      </div>
                      <div className="md:border-l md:border-line md:pl-5 space-y-4">
                        <div>
                          <p className="label-caps">Priority</p>
                          <div className="mt-2">
                            <PriorityPicker meetingId={m.id} priority={m.priority ?? 1} />
                          </div>
                        </div>

                        {identity ? (
                          <div>
                            <p className="label-caps">
                              {m.user ? "Requester" : "Guest (no account)"}
                            </p>
                            <p className="mt-1 text-sm text-ink">{identity.name}</p>
                            {identity.phone && (
                              <a
                                href={`tel:${identity.phone}`}
                                className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink tabular"
                              >
                                <Phone className="h-3 w-3" />
                                {identity.phone}
                              </a>
                            )}
                            {identity.email && (
                              <a
                                href={`mailto:${identity.email}`}
                                className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink"
                              >
                                <Mail className="h-3 w-3" />
                                {identity.email}
                              </a>
                            )}
                          </div>
                        ) : (
                          <div>
                            <p className="label-caps">Guest</p>
                            <p className="mt-1 text-sm italic text-muted-foreground">
                              Personal appointment — no external guest
                            </p>
                          </div>
                        )}

                        {m.status === "PENDING" && (
                          <div className="pt-3 border-t border-line space-y-2">
                            <Button
                              variant="accent"
                              size="sm"
                              className="w-full"
                              onClick={() => openReview("approve", m)}
                            >
                              <Check className="h-4 w-4" /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => openReview("reject", m)}
                            >
                              <X className="h-4 w-4" /> Decline
                            </Button>
                          </div>
                        )}

                        {m.status === "APPROVED" && (
                          <div className="pt-3 border-t border-line">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => openEdit(m)}
                            >
                              <Edit3 className="h-4 w-4" /> Edit or cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {nextCursor && (
        <div className="flex justify-center py-6">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
          </Button>
        </div>
      )}

      <ReviewDialog
        meeting={reviewTarget as any}
        mode={reviewMode}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
      />
      <EditMeetingDialog
        meeting={editTarget as any}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <NewMeetingDialog open={newMeetingOpen} onOpenChange={setNewMeetingOpen} />
    </>
  );
}
