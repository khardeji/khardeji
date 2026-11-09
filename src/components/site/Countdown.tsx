import { Clock } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { auctionEndsAt, useNow } from "@/lib/demo-clock";
import { cn } from "@/lib/utils";

export function Countdown({
  auction,
  className,
}: {
  auction: { endsInHours?: number | undefined; endsAt?: string | undefined };
  className?: string;
}) {
  const now = useNow();
  const { remaining: fmt } = useI18n();
  const remaining = now === null ? null : Math.max(0, auctionEndsAt(auction) - now);
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
      {remaining === null ? "—" : fmt(remaining)}
    </span>
  );
}
