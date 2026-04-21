import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Role } from "@prisma/client";

// Search the user directory by name or phone. Assistant-only.
// Used by the new-meeting dialog's guest picker.
export async function GET(req: Request) {
  const me = await requireUser();
  if (!me || me.role !== "ASSISTANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await db.user.findMany({
    where: {
      role: Role.USER,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    select: { id: true, name: true, phone: true, email: true },
    take: 10,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}
