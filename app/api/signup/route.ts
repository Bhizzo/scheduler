import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { Role } from "@prisma/client";
import {
  clientIdFromRequest,
  maybeCleanup,
  rateLimit,
} from "@/lib/rate-limit";

export async function POST(req: Request) {
  maybeCleanup();

  // 5 signup attempts per IP per hour
  const ip = clientIdFromRequest(req);
  const limit = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many signup attempts. Try again in ${Math.ceil(
          limit.retryAfterMs / 60000
        )} minute(s).`,
      },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, phone, email, password } = parsed.data;

  const existing = await db.user.findFirst({
    where: { OR: [{ phone }, ...(email ? [{ email }] : [])] },
  });
  if (existing) {
    const field = existing.phone === phone ? "phone number" : "email";
    return NextResponse.json(
      { error: `An account with that ${field} already exists.` },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      name,
      phone,
      email: email || null,
      passwordHash,
      role: Role.USER,
    },
    select: { id: true, phone: true, name: true, role: true },
  });

  return NextResponse.json({ user });
}
