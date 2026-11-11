import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  Check,
  CheckCheck,
  Gavel,
  HandCoins,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { getMyNotifications, markNotificationRead } from "@/lib/marketplace.functions";

export function NotificationBell() {
  const { user } = useAuth();
  const { t, date } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchNotifs = useServerFn(getMyNotifications);
  const markRead = useServerFn(markNotificationRead);

  const { data } = useQuery({
    queryKey: ["me", "notifications"],
    queryFn: () => fetchNotifs(),
    enabled: !!user,
    refetchInterval: 15_000, // Poll every 15s for real-time responsiveness
  });

  if (!user) return null;

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  async function handleMarkAll() {
    await markRead({ data: { markAll: true } });
    await qc.invalidateQueries({ queryKey: ["me", "notifications"] });
  }

  async function handleClickItem(notif: any) {
    if (!notif.read) {
      await markRead({ data: { id: notif.id } });
      await qc.invalidateQueries({ queryKey: ["me", "notifications"] });
    }
    if (notif.link) {
      navigate({ to: notif.link });
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "bid_placed":
      case "outbid":
        return <Gavel className="size-4 text-brass shrink-0" />;
      case "offer_received":
      case "offer_accepted":
      case "offer_rejected":
        return <HandCoins className="size-4 text-rust shrink-0" />;
      case "quantity_requested":
      case "quantity_accepted":
      case "quantity_rejected":
        return <Package className="size-4 text-olive shrink-0" />;
      default:
        return <Bell className="size-4 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 rounded-full"
          aria-label={t({ ar: "الإشعارات", fr: "Notifications", en: "Notifications" })}
        >
          <Bell className="size-4 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid min-w-4.5 h-4.5 place-items-center rounded-full bg-rust px-1 text-[0.65rem] font-bold text-rust-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <DropdownMenuLabel className="p-0 font-display text-base font-semibold">
            {t({ ar: "الإشعارات", fr: "Notifications", en: "Notifications" })}
            {unreadCount > 0 && (
              <span className="ms-2 rounded-full bg-rust/15 px-2 py-0.5 text-xs font-semibold text-rust">
                {unreadCount} {t({ ar: "جديد", fr: "nouvelles", en: "new" })}
              </span>
            )}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="size-3.5" />
              <span>{t({ ar: "تحديد الكل كمقروء", fr: "Tout marquer lu", en: "Mark all read" })}</span>
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {t({ ar: "لا توجد إشعارات حالياً", fr: "Aucune notification pour le moment", en: "No notifications yet" })}
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={() => handleClickItem(n)}
                className={`flex cursor-pointer items-start gap-3 p-3.5 transition-colors ${
                  !n.read ? "bg-accent/40 font-medium" : "opacity-80"
                }`}
              >
                <div className="mt-0.5">{getIcon(n.type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {typeof n.title === "object" ? t(n.title) : n.title}
                    </p>
                    <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                      {date(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {typeof n.message === "object" ? t(n.message) : n.message}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

