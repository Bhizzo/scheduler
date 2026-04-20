# Scheduler

A calm meeting scheduling tool. Guests request time with a phone-based account; an assistant reviews every request from a single dashboard, approves / reschedules / declines with reason, can edit approved meetings after the fact, sees the full day laid out visually, and gets live in-app notifications for every event.

Built with Next.js 15 (App Router), TypeScript, Prisma + PostgreSQL, NextAuth, Tailwind.

## What's inside

**Two roles, one app.** Guests (role `USER`) sign up with a phone number and optional email, then request meetings. The assistant (`ASSISTANT`) has `/admin` with the full inbox, the visual schedule, availability, and settings.

**Booking rules that hold.** A request only blocks a slot once it's **approved** — multiple people can have pending requests for the same time. When the assistant approves one, any overlapping pending requests are auto-declined with a clear reason. The slot engine (`lib/slots.ts`) checks weekly availability rules, blocked dates, minimum lead time, the daily meeting cap, and existing approved meetings.

**Reschedule is part of approval — and editing is separate.** The data model stores both `requestedStart/End` (what the guest asked for) and `confirmedStart/End` (what got booked). The assistant can approve at a different time in one action, and can also edit an already-approved meeting later (change date, time, location, subject, description, or cancel outright).

**Visual schedule view.** `/admin/schedule` shows the day or week with time down the left and approved meetings as blocks. A red "now" indicator crosses the current time. Click any block to edit. Each block shows the priority dot, subject, time, guest name, and location.

**Priority on every meeting.** Assistant-only. Four levels (Low / Normal / High / Urgent) with colored dots. Pending requests auto-sort urgent-first.

**In-app notifications.** A bell in the top nav polls for unread count every 30 seconds. Assistants get notified on new requests and guest cancellations; guests get notified on approval (plain or rescheduled), rejection with reason, host-side edits, and host cancellations. All routed through `lib/notifications.ts` — one call site, so SMS/email can be bolted on later without touching the API routes.

**Location / meeting link field.** Optional on the booking form, editable by the assistant on approval and after. Displays as a pin on meeting cards, admin rows, and schedule blocks.

**Guest-side cancellation.** Guests can cancel their own pending requests. Assistants get a notification when they do.

**Daily meeting cap.** Configurable (0 = no cap). The slot engine stops offering times on any day where the cap has been hit. Prevents back-to-back overload.

**Timezone-aware.** Availability rules are stored as local `HH:mm` + configured timezone (default `Africa/Blantyre`); all meeting times are stored as UTC.

## Getting started

### 1. Prerequisites

- Node.js 18.17+ (or 20+)
- A PostgreSQL database (local or managed — Neon, Supabase, Railway)

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

Paste as `NEXTAUTH_SECRET`. Update `DATABASE_URL`. Change `SEED_ASSISTANT_*` values if you want custom credentials for the first assistant account.

### 4. Initialize the database

```bash
npm run db:push    # creates tables from prisma/schema.prisma
npm run db:seed    # creates the first assistant + default availability + settings
```

The seed prints the assistant login. Save it.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000 — "Create account" for a guest, or sign in as the assistant.

## Project structure

```
app/
  (auth)/              login, signup, split-hero layout
  (user)/              my meetings + booking flow
  (admin)/             assistant area — requests, schedule, availability, settings
  api/
    auth/              NextAuth handler
    meetings/          list, create, get, review (approve/reject), edit, setPriority, cancel
    notifications/     list, mark-all-read, mark-one-read
    slots/             available times for a date + duration
    availability/      rules + blocked dates
    settings/          app-wide booking rules
    signup/            account creation
components/
  ui/                  headless primitives (button, input, dialog, select, …)
  top-nav              with notification bell
  booking-form         4-step guest flow
  admin-meetings-table rich inbox with expand + review + edit
  day-view             time-axis schedule
  edit-meeting-dialog  edit or cancel an approved meeting
  review-dialog        approve (optional reschedule + location) or reject
  notification-bell    polls unread, dropdown list
  meeting-card         guest-facing card with status + location
  priority-picker      colored-dot priority selector
  availability-editor  weekly hours + blocked dates
  settings-editor      daily cap + durations + lead time + increment
lib/
  db                   Prisma client singleton
  auth                 NextAuth config (phone + password)
  slots                availability engine + daily cap + auto-reject
  validation           all Zod schemas
  notifications        one call site for every notification
  utils                cn, date formatting, phone normalizing, initials
prisma/
  schema.prisma        User, Meeting, Notification, AvailabilityRule, BlockedDate, Setting
  seed.ts              first assistant + defaults
middleware.ts          route protection (leaves /api/* alone)
```

## Customizing

**Design tokens** in `app/globals.css` as CSS variables — warm paper background, forest-green accent, status colors. Change a few values and the whole app shifts.

**Fonts** — Fraunces (display serif) + Geist (sans + mono) in `app/layout.tsx`.

**Booking rules** (default length, allowed durations, lead time, slot granularity, daily cap) — `/admin/settings`.

**Availability** (weekly hours, blocked dates) — `/admin/availability`.

## Common commands

```bash
npm run dev         # local dev
npm run build       # production build
npm start           # run production build
npm run db:push     # push schema changes
npm run db:migrate  # create a migration
npm run db:seed     # re-seed (safe — uses upsert)
npm run db:studio   # browse the DB
```

## Wiring SMS or email later

Every notification already gets written to the `Notification` table via `lib/notifications.ts`. To add SMS or email delivery, modify `notifyUser` and `notifyAssistants` in that file: after the `db.notification.create`, look up the recipient's phone/email and send through your provider. No calling code changes.

For Malawi, Africa's Talking is much cheaper than Twilio for SMS.

## Things left for later

- Phone OTP login (currently phone + password) — swap the Credentials provider in `lib/auth.ts`
- Multi-host calendars — schema assumes one host; would need a `hosts` table and host selector on booking
- iCal export so the host's Google/Outlook calendar mirrors approved meetings
- Search ("find my meetings with Grace last month")
- Meeting types with per-type availability

## License

Private, yours to adapt.
