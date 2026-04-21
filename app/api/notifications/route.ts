import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// Amortized cleanup running at most once every 20 min per server instance.
// Reads retention + cap from settings so it's configurable at runtime.
let lastCleanup = 0;
const CLEANUP_INTERVAL_MS = 20 * 60 * 1000;

async function maybeCleanupOldNotifications() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  try {
    const settingsRows = await db.setting.findMany({
      where: {
        key: {
          in: ["notification_retention_days", "max_notifications_per_user"],
        },
      },
    });
    const map = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));
    const retentionDays = Number(map.notification_retention_days ?? "60");
    const maxPerUser = Number(map.max_notifications_per_user ?? "200");

    // 1. Global age-based cleanup (0 = never expire)
    if (retentionDays > 0) {
      const cutoff = new Date(now - retentionDays * 24 * 60 * 60 * 1000);
      await db.notification.deleteMany({ where: { createdAt: { lt: cutoff } } });
    }

    // 2. Per-user cap trimming. For any user over the cap, trim the oldest.
    // Done as a SQL CTE for efficiency when there are many users.
    if (maxPerUser > 0) {
      await db.$executeRawUnsafe(
        `DELETE FROM "Notification"
         WHERE id IN (
           SELECT id FROM (
             SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" DESC) AS rn
             FROM "Notification"
           ) t
           WHERE t.rn > $1
         )`,
        maxPerUser
      );
    }
  } catch {
    // non-fatal — logs would go here in prod
  }
}

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fire-and-forget cleanup (don't await — doesn't block this response)
  void maybeCleanupOldNotifications();

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "1";

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.notification.count({
      where: { userId: user.id, readAt: null },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

// Mark all as read, or clear read notifications older than N days.
// Body: { action: "markAllRead" | "clearReadOlderThan", days?: number }
export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = (body as { action?: string }).action;

  if (action === "clearReadOlderThan") {
    const days = Math.max(1, Math.min(365, Number((body as { days?: number }).days ?? 7)));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await db.notification.deleteMany({
      where: {
        userId: user.id,
        readAt: { not: null, lt: cutoff },
      },
    });
    return NextResponse.json({ ok: true, deleted: result.count });
  }

  // Default: mark all as read
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
