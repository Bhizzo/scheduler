import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="text-ink"
        aria-hidden
      >
        <rect x="1" y="1" width="22" height="22" rx="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 9h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="14" r="1.25" fill="currentColor" />
        <circle cx="12" cy="14" r="1.25" fill="hsl(var(--accent))" />
        <circle cx="16" cy="14" r="1.25" fill="currentColor" opacity="0.35" />
      </svg>
      <span className="display text-[17px] tracking-tight">Scheduler</span>
    </div>
  );
}
