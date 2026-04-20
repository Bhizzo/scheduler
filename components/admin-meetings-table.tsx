"use client";

import { useMemo, useState } from "react";
import { formatDate, formatTime, initials } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import { Button } from "./ui/button";
import { ReviewDialog } from "./review-dialog";
import { EditMeetingDialog } from "./edit-meeting-dialog";
import { PriorityDot, PriorityPicker } from "./priority-picker";
import { NotesEditor } from "./notes-editor";
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
} from "lucide-react";

type MeetingWithUser = Meeting & { user: Pick<User, "id" | "name" | "phone" | "email"> };

const tabs: { key: "ALL" | MeetingStatus; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Declined" },
  { key: "ALL", label: "All" },
];

export function AdminMeetingsTable({ meetings }: { meetings: MeetingWithUser[] }) {
  const [tab, setTab] = useState<"ALL" | MeetingStatus>("PENDING");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState<"approve" | "reject">("approve");
  const [reviewTarget, setReviewTarget] = useState<MeetingWithUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MeetingWithUser | null>(null);

  const counts = useMemo(() => {
    return {
      PENDING: meetings.filter((m) => m.status === "PENDING").length,
      APPROVED: meetings.filter((m) => m.status === "APPROVED").length,
      REJECTED: meetings.filter((m) => m.status === "REJECTED").length,
      ALL: meetings.length,
    } as Record<"ALL" | MeetingStatus, number>;
  }, [meetings]);

  const filtered = useMemo(() => {
    const base = tab === "ALL" ? meetings : meetings.filter((m) => m.status === tab);
    const copy = [...base];
    copy.sort((a, b) => {
      if ((b.priority ?? 1) !== (a.priority ?? 1)) {
        return (b.priority ?? 1) - (a.priority ?? 1);
      }
      if (tab === "APPROVED") {
        const da = (a.confirmedStart ?? a.requestedStart).getTime();
        const db = (b.confirmedStart ?? b.requestedStart).getTime();
        return da - db;
      }
      if (tab === "REJECTED") {
        const da = (a.reviewedAt ?? a.createdAt).getTime();
        const db = (b.reviewedAt ?? b.createdAt).getTime();
        return db - da;
      }
      return a.requestedStart.getTime() - b.requestedStart.getTime();
    });
    return copy;
  }, [meetings, tab]);

  function openReview(mode: "approve" | "reject", m: MeetingWithUser) {
    setReviewMode(mode);
    setReviewTarget(m);
    setReviewOpen(true);
  }

  function openEdit(m: MeetingWithUser) {
    setEditTarget(m);
    setEditOpen(true);
  }

  return (
    <>
      {/* Tabs */}
      <div className="border-b border-line">
        <div className="flex gap-1 -mb-px">
          {tabs.map((t) => {
            const active = tab === t.key;
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
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <CalIcon className="h-5 w-5 text-muted-foreground mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Nothing here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {filtered.map((m) => {
            const start = m.confirmedStart ?? m.requestedStart;
            const end = m.confirmedEnd ?? m.requestedEnd;
            const isOpen = expanded === m.id;
            return (
              <li key={m.id} className="group">
                <button
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  className="w-full text-left py-4 grid grid-cols-[auto_auto_1fr_auto] md:grid-cols-[auto_auto_1fr_auto_auto_auto] items-center gap-3 md:gap-4 hover:bg-muted/30 px-3 md:px-4 -mx-3 md:-mx-4 rounded-md transition-colors"
                >
                  <PriorityDot priority={m.priority ?? 1} />
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/10 text-accent text-xs font-medium tabular">
                    {initials(m.user.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-ink font-medium truncate">{m.subject}</span>
                      {m.internalNotes && (
                        <StickyNote
                          className="h-3 w-3 text-warn shrink-0"
                          aria-label="Has internal notes"
                        />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{m.user.name} · <span className="tabular">{m.user.phone}</span></span>
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

                        <div>
                          <p className="label-caps">Requester</p>
                          <p className="mt-1 text-sm text-ink">{m.user.name}</p>
                          <a
                            href={`tel:${m.user.phone}`}
                            className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink tabular"
                          >
                            <Phone className="h-3 w-3" />
                            {m.user.phone}
                          </a>
                          {m.user.email && (
                            <a
                              href={`mailto:${m.user.email}`}
                              className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink"
                            >
                              <Mail className="h-3 w-3" />
                              {m.user.email}
                            </a>
                          )}
                        </div>

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

      <ReviewDialog
        meeting={reviewTarget}
        mode={reviewMode}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
      />
      <EditMeetingDialog
        meeting={editTarget}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
