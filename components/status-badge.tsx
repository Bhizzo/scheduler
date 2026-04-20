import { cn } from "@/lib/utils";
import { Clock, Check, X, CircleSlash } from "lucide-react";
import type { MeetingStatus } from "@prisma/client";

const statusConfig: Record<
  MeetingStatus,
  { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: {
    label: "Pending review",
    className: "bg-warn/10 text-warn ring-warn/20",
    Icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    className: "bg-accent/10 text-accent ring-accent/20",
    Icon: Check,
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-danger/10 text-danger ring-danger/20",
    Icon: X,
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground ring-line",
    Icon: CircleSlash,
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: MeetingStatus;
  className?: string;
}) {
  const { label, className: cls, Icon } = statusConfig[status];
  return (
    <span
      className={cn(
        "chip ring-1 ring-inset",
        cls,
        className
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.25} />
      {label}
    </span>
  );
}
