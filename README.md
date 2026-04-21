# Scheduler

A calm meeting scheduling tool for a single host and their assistant.

- **Guests** sign up with a phone number and optional email, request meetings, propose reschedules, cancel their own requests, and see clear status updates.
- **The assistant** lives in `/admin`: a daily briefing of today's meetings, a searchable & sortable inbox with priority filtering, a visual day/week schedule, the ability to add meetings directly (with or without a guest), edit approved meetings, and full control over availability and booking rules.

Built with Next.js 15 (App Router), TypeScript, Prisma + PostgreSQL, NextAuth, Tailwind.

---

## What's inside

**Two roles, one app.** Guests (`USER`) use `/dashboard` and `/book`. The assistant (`ASSISTANT`) gets `/admin`, `/admin/schedule`, `/admin/availability`, `/admin/settings`.

**Booking rules that hold.** A request only blocks a slot once it's **approved** — multiple people can have pending requests for the same time. When the assistant approves one, overlapping pending requests are auto-declined with a clear reason. Every booking is checked against: weekly hours, blocked dates, minimum lead time, maximum advance window, buffer-before/after, daily/weekly/monthly caps, and existing approved meetings.

**Assistant can create meetings directly.** One click from the admin inbox opens a form. Three guest modes: pick an **existing user**, enter a **new person** (name + phone, stored on the meeting without creating an account), or **no guest** (personal appointment). Directly approved, guest notified if linked.

**Reschedule is part of approval — and editing is separate.** The data model stores both `requestedStart/End` (what the guest asked for) and `confirmedStart/End` (what got booked). The assistant can approve at a different time in one action, and edit an already-approved meeting any time (date, time, location, subject, description, internal notes, or cancel outright).

**Guests can propose reschedules.** Instead of cancelling an approved meeting to re-request, guests open a "Propose new time" dialog. The meeting drops back to PENDING with the new proposed time; the assistant gets a notification and reviews.

**Visual schedule.** `/admin/schedule` shows the day or week with time down the left and approved meetings as colored blocks. Red "now" indicator crosses the current time. Block colors reflect time status — amber "starting soon", red "in progress", muted grey "completed". Click any block to edit.

**Priority on every meeting.** Assistant-only. Four levels (Low / Normal / High / Urgent) with colored dots. Pending requests auto-sort urgent-first; can also sort by date or recency.

**Filter, sort, search.** Admin inbox has a collapsible filter bar: priority filter, sort order (priority / soonest date / most recent), and free-text search across subject, guest name, phone, and location. Debounced 300ms.

**Past meetings hidden by default.** Approved meetings that have already ended are dimmed and hidden from the default admin view — a "Hide past" / "Past shown" toggle flips it. Every meeting shows a time-status pill: *Starting soon* (within 30 min), *In progress* (happening now), *Completed* (already ended).

**In-app notifications.** Bell in the top nav polls every 30 seconds. Assistants get pinged on new requests, guest cancellations, guest-proposed reschedules. Guests get pinged on approval (plain or rescheduled), rejection with reason, host edits, host cancellations. All flow through `lib/notifications.ts` — one call site, ready for SMS/email.

**Daily briefing** at the top of `/admin`. Today's meetings in chronological order, with "Now" indicator, location, internal notes highlighted, and flags like *"First meeting"* or *"3 past cancellations"* computed from each guest's history.

**Location / meeting link field.** Optional on the booking form, editable by the assistant on approval and after.

**Internal assistant notes.** A private textarea on every meeting. Inline editor in the expanded admin row. Never sent to guests — scrubbed from the API response for non-assistants.

**Timezone-aware.** Availability rules are stored as local `HH:mm` + configured timezone (default `Africa/Blantyre`); all meeting times stored as UTC.

**Scalability basics.** Cursor-pagination on the meetings API (50/page + "Load more"). Server-side filter/sort/search. Debounced search input. Auto-cleanup of notifications older than 60 days (amortized, no cron needed). Signup rate-limited to 5/hour per IP. Compound index on `(status, confirmedStart)` for fast schedule queries.

---

## Getting started

### 1. Prerequisites

- Node.js 18.17+ (or 20+)
- PostgreSQL (local or Neon, Supabase, Railway, etc.)

### 2. Install

```bash
npm install
```

### 3. Environment

```bash
cp .env.example .env
```

Generate a NextAuth secret:

```bash
openssl rand -base64 32
```

Paste as `NEXTAUTH_SECRET`. Update `DATABASE_URL`. Customize `SEED_ASSISTANT_*` for your first assistant account.

### 4. Initialize the database

```bash
npm run db:push    # creates tables from prisma/schema.prisma
npm run db:seed    # creates the first assistant + default availability + settings
```

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000 — "Create account" for a guest, or sign in as the assistant.

---

## Project structure

```
app/
  (auth)/                      login, signup
  (user)/                      dashboard, book
  (admin)/                     requests + briefing, schedule, availability, settings
  api/
    auth/[...nextauth]
    signup                     (rate-limited)
    meetings                   (GET: filter/sort/search/paginate. POST: guest book + assistant create)
    meetings/[id]              (approve/reject/setPriority/editConfirmed/updateNotes/proposeReschedule/cancel)
    slots
    availability
    settings
    notifications, notifications/[id]
    users                      (search — assistant only)
components/
  ui/                          button, input, label, textarea, select, dialog
  top-nav, logo, providers, status-badge
  booking-form, meeting-card, reschedule-dialog
  admin-meetings-table         (filter bar, pagination, client-side fetch)
  new-meeting-dialog           (assistant direct-create with three guest modes)
  review-dialog, edit-meeting-dialog
  priority-picker, notes-editor, notification-bell
  day-view, daily-briefing
  availability-editor, settings-editor
lib/
  db, auth, slots, validation, notifications, utils
  meeting-time                 (upcoming / starting_soon / in_progress / completed)
  rate-limit                   (in-memory; replace with Redis in prod)
prisma/
  schema.prisma, seed.ts
middleware.ts
```

---

## All configurable settings (at `/admin/settings`)

**Meeting lengths:** default length · allowed durations · slot granularity

**Booking window:** minimum lead time · maximum advance days (0 = no limit)

**Buffers around meetings:** buffer before · buffer after

**Meeting caps:** per day · per week · per month (0 = no cap)

Plus weekly hours and blocked dates at `/admin/availability`.

---

## Wiring SMS or email later

Every notification is written to the `Notification` table via `lib/notifications.ts`. To add SMS (Africa's Talking recommended in Malawi, cheaper than Twilio) or email, modify `notifyUser` and `notifyAssistants` in that file: after the `db.notification.create`, look up the recipient's phone or email and send via your provider. No other code changes.

## Things left for later

- Phone OTP login (currently phone + password)
- Multi-host calendars (schema assumes one host)
- iCal / Google Calendar sync
- Meeting types with per-type availability

## License

Private, yours to adapt.
