import { z } from "zod";

// Allow international phone: + followed by 7–15 digits.
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{6,14}$/, "Enter a valid phone number (include country code)")
  .transform((v) => (v.startsWith("+") ? v : `+${v}`));

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  phone: phoneSchema,
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Password is required"),
});

export const bookingSchema = z.object({
  subject: z.string().trim().min(3, "Subject is required").max(120),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  durationMinutes: z.coerce.number().int().min(5).max(480),
});

// 0 = LOW, 1 = NORMAL, 2 = HIGH, 3 = URGENT
export const prioritySchema = z.coerce.number().int().min(0).max(3);

export const approveSchema = z.object({
  action: z.literal("approve"),
  // Optional reschedule on approval
  confirmedStart: z.string().datetime().optional(),
  confirmedEnd: z.string().datetime().optional(),
  location: z.string().trim().max(500).optional(),
  internalNotes: z.string().trim().max(2000).optional(),
});

export const rejectSchema = z.object({
  action: z.literal("reject"),
  reason: z.string().trim().min(3, "Please provide a reason").max(500),
});

export const setPrioritySchema = z.object({
  action: z.literal("setPriority"),
  priority: prioritySchema,
});

// Edit an already-approved meeting (date/time/location/subject/description/notes)
export const editConfirmedSchema = z.object({
  action: z.literal("editConfirmed"),
  confirmedStart: z.string().datetime(),
  confirmedEnd: z.string().datetime(),
  subject: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(500).optional(),
  internalNotes: z.string().trim().max(2000).optional(),
});

// Update ONLY the assistant-only internal notes on any meeting
export const updateNotesSchema = z.object({
  action: z.literal("updateNotes"),
  internalNotes: z.string().trim().max(2000),
});

// Guest proposes a new time on a pending or approved meeting
export const proposeRescheduleSchema = z.object({
  action: z.literal("proposeReschedule"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.coerce.number().int().min(5).max(480),
});

export const reviewSchema = z.discriminatedUnion("action", [
  approveSchema,
  rejectSchema,
  setPrioritySchema,
  editConfirmedSchema,
  updateNotesSchema,
  proposeRescheduleSchema,
]);

export const availabilityRuleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  enabled: z.boolean(),
});

export const settingsSchema = z.object({
  default_meeting_minutes: z.coerce.number().int().min(5).max(480),
  allowed_durations: z.string().regex(/^(\d+)(,\d+)*$/),
  min_lead_time_minutes: z.coerce.number().int().min(0).max(10080),
  max_advance_days: z.coerce.number().int().min(0).max(365),
  slot_increment_minutes: z.coerce.number().int().min(5).max(120),
  buffer_before_minutes: z.coerce.number().int().min(0).max(240),
  buffer_after_minutes: z.coerce.number().int().min(0).max(240),
  max_meetings_per_day: z.coerce.number().int().min(0).max(50),
  max_meetings_per_week: z.coerce.number().int().min(0).max(200),
  max_meetings_per_month: z.coerce.number().int().min(0).max(600),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
