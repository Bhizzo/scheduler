import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
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
