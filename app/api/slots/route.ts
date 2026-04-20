import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAvailableSlots, getSettings } from "@/lib/slots";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const duration = Number(url.searchParams.get("duration") ?? "30");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (!Number.isFinite(duration) || duration < 5 || duration > 480) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const settings = await getSettings();
  const result = await getAvailableSlots(date, duration);
  return NextResponse.json({ ...result, settings });
}
