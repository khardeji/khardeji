import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Ban, Clock, Gavel, Layers, ShoppingBag, UserPlus, Users } from "lucide-react";
import type { ReactNode } from "react";
import { LISTING_STATUS_LABEL, type ListingStatus } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { getAdminOverview } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";
import { Loading, Panel } from "./shared";

function Stat({ label, value, icon, highlight, onClick }: { label: string; value: string; icon: ReactNode; highlight?: boolean; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 rounded-xl border p-4 text-start transition",
        highlight ? "border-rust bg-rust/5" : "border-border bg-card",
        onClick && "hover:border-rust/60",
      )}
    >
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-lg", highlight ? "bg-rust text-rust-foreground" : "bg-muted text-brass")}>{icon}</span>
      <span>
        <span className="block font-display text-3xl leading-none">{value}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{label}</span>
      </span>
    </Comp>
  );
}

export function Overview({ onOpenListings, onOpenUsers }: { onOpenListings: (s: ListingStatus) => void; onOpenUsers: () => void }) {
  const { t, num } = useI18n();
  const fetchOverview = useServerFn(getAdminOverview);
  const q = useQuery({ queryKey: ["admin", "overview"], queryFn: () => fetchOverview() });
  if (!q.data) return <Loading error={q.isError} />;
  const s = q.data;
  const statuses: ListingStatus[] = ["pending", "approved", "rejected", "hidden", "sold"];

  return (
    <div className="grid gap-6">
      <Panel title={t({ ar: "الحسابات", fr: "Comptes", en: "Accounts" })}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat icon={<Users />} value={num(s.users)} label={t({ ar: "حسابات مسجّلة", fr: "Comptes inscrits", en: "Registered accounts" })} onClick={onOpenUsers} />
          <Stat icon={<UserPlus />} value={num(s.newUsers)} label={t({ ar: "جدد هالجمعة", fr: "Nouveaux cette semaine", en: "New this week" })} />
          <Stat icon={<Ban />} value={num(s.blocked)} label={t({ ar: "حسابات مسكّرة", fr: "Comptes bloqués", en: "Blocked accounts" })} />
        </div>
      </Panel>
      <Panel title={t({ ar: "الإعلانات", fr: "Annonces", en: "Listings" })}>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statuses.map((st) => (
            <Stat
              key={st}
              icon={st === "pending" ? <Clock /> : <ShoppingBag />}
              value={num(s.listings[st])}
              label={t(LISTING_STATUS_LABEL[st])}
              highlight={st === "pending" && s.listings.pending > 0}
              onClick={() => onOpenListings(st)}
            />
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat icon={<Gavel />} value={num(s.auctions)} label={t({ ar: "مزايدات منشورة", fr: "Enchères en ligne", en: "Live auctions" })} />
          <Stat icon={<Layers />} value={num(s.categories)} label={t({ ar: "أصناف", fr: "Catégories", en: "Categories" })} />
        </div>
      </Panel>
    </div>
  );
}
