"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Clock, CalendarCheck, X, Edit3, CalendarOff, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import type { NotificationKind } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  meetingId: string | null;
  readAt: string | null;
  createdAt: string;
};

const KIND_ICON: Record<NotificationKind, { Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; tone: string }> = {
  MEETING_REQUESTED:             { Icon: Clock,        tone: "text-warn" },
  MEETING_APPROVED:              { Icon: CalendarCheck, tone: "text-accent" },
  MEETING_APPROVED_RESCHEDULED:  { Icon: CalendarCheck, tone: "text-accent" },
  MEETING_REJECTED:              { Icon: X,            tone: "text-danger" },
  MEETING_UPDATED:               { Icon: Edit3,        tone: "text-ink" },
  MEETING_CANCELLED_BY_HOST:     { Icon: CalendarOff,  tone: "text-danger" },
  MEETING_CANCELLED_BY_GUEST:    { Icon: UserX,        tone: "text-muted-foreground" },
  MEETING_RESCHEDULE_PROPOSED:   { Icon: Clock,        tone: "text-warn" },
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Poll for unread count
  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const res = await fetch("/api/notifications?unread=1");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUnread(data.unreadCount ?? 0);
      } catch {
        // ignore
      }
    }
    pull();
    const id = setInterval(pull, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Load full list when dropdown opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.notifications ?? []);
        setUnread(data.unreadCount ?? 0);
      })
      .finally(() => setLoading(false));
  }, [open]);

  // Close when clicking outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setItems((xs) => xs.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    setUnread(0);
  }

  async function openNotification(n: Notification) {
    if (!n.readAt) {
      await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
      setItems((xs) =>
        xs.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
      );
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (n.meetingId) {
      router.push("/admin"); // the meeting will be in the inbox
      router.refresh();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 rounded-md hover:bg-muted grid place-items-center transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-ink" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-danger text-paper text-[9px] font-medium tabular leading-none grid place-items-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-lg shadow-xl z-50 animate-slide-down overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <div>
              <p className="display text-[15px] text-ink">Notifications</p>
              <p className="text-[11px] text-muted-foreground">
                {unread === 0
                  ? "All caught up"
                  : `${unread} unread`}
              </p>
            </div>
            {unread > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-7">
                <Check className="h-3 w-3" /> Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center">
                <Bell className="h-5 w-5 text-muted-foreground/60 mx-auto" />
                <p className="mt-3 text-sm text-muted-foreground">Nothing yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((n) => {
                  const meta = KIND_ICON[n.kind] ?? KIND_ICON.MEETING_UPDATED;
                  const unreadStyle = !n.readAt;
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => openNotification(n)}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors grid grid-cols-[auto_1fr] gap-3",
                          unreadStyle && "bg-accent/[0.03]"
                        )}
                      >
                        <div className={cn("mt-0.5 h-7 w-7 grid place-items-center rounded-md bg-muted/60", meta.tone)}>
                          <meta.Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p
                              className={cn(
                                "text-sm text-ink truncate",
                                unreadStyle && "font-medium"
                              )}
                            >
                              {n.title}
                            </p>
                            <span className="text-[10.5px] text-muted-foreground tabular shrink-0">
                              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {n.body}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
