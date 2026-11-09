import { Clock } from "lucide-react";
import { demoEndsAt, useNow } from "@/lib/demo-clock";
import { formatRemaining } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Countdown({ endsInHours, className }: { endsInHours: number; className?: string }) {
  const now = useNow();
  const remaining = now === null ? null : demoEndsAt(endsInHours) - now;
  const urgent = remaining !== null && remaining < 6 * 3_600_000;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-label text-sm font-semibold tabular-nums tracking-wide",
        urgent ? "text-rust" : "text-foreground",
        className,
      )}
    >
      <Clock className={cn("size-4", urgent && "animate-pulse-dot")} />
      {remaining === null ? "—" : formatRemaining(remaining)}
    </span>
  );
}
