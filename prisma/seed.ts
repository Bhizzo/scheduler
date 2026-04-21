import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const phone = process.env.SEED_ASSISTANT_PHONE || "+265999000000";
  const name = process.env.SEED_ASSISTANT_NAME || "Assistant";
  const password = process.env.SEED_ASSISTANT_PASSWORD || "change-me-on-first-login";

  // 1. Seed the assistant account
  const passwordHash = await bcrypt.hash(password, 10);
  const assistant = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: {
      phone,
      name,
      passwordHash,
      role: Role.ASSISTANT,
    },
  });
  console.log(`✓ Assistant account ready: ${assistant.phone}`);

  // 2. Seed availability rules: Mon–Fri 09:00–17:00
  const weekdayRules = [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startTime: "09:00",
    endTime: "17:00",
    enabled: true,
  }));

  for (const rule of weekdayRules) {
    await prisma.availabilityRule.upsert({
      where: {
        weekday_startTime_endTime: {
          weekday: rule.weekday,
          startTime: rule.startTime,
          endTime: rule.endTime,
        },
      },
      update: { enabled: rule.enabled },
      create: rule,
    });
  }
  console.log(`✓ Availability rules ready (Mon–Fri 09:00–17:00)`);

  // 3. Seed default settings
  const settings: Record<string, string> = {
    default_meeting_minutes: "30",
    allowed_durations: "15,30,45,60,90",
    min_lead_time_minutes: "120",
    max_advance_days: "60",
    slot_increment_minutes: "15",
    buffer_before_minutes: "0",
    buffer_after_minutes: "0",
    max_meetings_per_day: "0",
    max_meetings_per_week: "0",
    max_meetings_per_month: "0",
    notification_retention_days: "60",
    max_notifications_per_user: "200",
    timezone: process.env.APP_TIMEZONE || "Africa/Blantyre",
  };

  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  console.log(`✓ Default settings ready`);
  console.log(`\nAssistant login → phone: ${phone} / password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
