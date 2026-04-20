import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string) {
  return format(new Date(d), "EEE, d MMM yyyy");
}

export function formatTime(d: Date | string) {
  return format(new Date(d), "HH:mm");
}

export function formatDateTime(d: Date | string) {
  return format(new Date(d), "EEE, d MMM yyyy · HH:mm");
}

export function normalizePhone(raw: string) {
  // Strip whitespace, dashes, parens. Keep a leading +.
  const cleaned = raw.replace(/[\s\-().]/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}
