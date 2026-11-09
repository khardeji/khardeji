import { Link } from "@tanstack/react-router";
import { Gavel, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auctionCurrentPrice, governorateLabel, subcategoryLabel, type Listing } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { Countdown } from "./Countdown";

export function AuctionCard({ listing }: { listing: Listing }) {
  const a = listing.auction!;
  const { t, dt } = useI18n();
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-on-dark/10 bg-charcoal-soft text-on-dark shadow-lg sm:flex-row">
      <div className="relative aspect-[4/3] overflow-hidden sm:aspect-auto sm:w-2/5">
        <img
          src={listing.images[0]}
          alt={t(listing.title)}
          loading="lazy"
          width={1024}
          height={768}
          className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="label-stamp absolute start-3 top-3 inline-flex items-center gap-1 rounded bg-rust px-2 py-1 text-[0.65rem] text-rust-foreground">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-rust-foreground" /> {t({ ar: "مباشر", fr: "En direct", en: "Live" })}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="label-stamp text-[0.68rem] text-brass">
          {t(subcategoryLabel(listing.subcategory))} · {t(governorateLabel(listing.governorate))}
        </p>
        <h3 className="mt-1 font-display text-xl font-medium leading-snug">{t(listing.title)}</h3>

        <div className="mt-4 grid grid-cols-3 gap-3 border-y border-on-dark/10 py-3">
          <div>
            <p className="text-[0.7rem] text-on-dark-muted">{t({ ar: "السعر الحالي", fr: "Prix actuel", en: "Current price" })}</p>
            <p className="font-display text-lg font-semibold text-brass">{dt(auctionCurrentPrice(listing))}</p>
          </div>
          <div>
            <p className="text-[0.7rem] text-on-dark-muted">{t({ ar: "العروض", fr: "Offres", en: "Bids" })}</p>
            <p className="flex items-center gap-1 font-display text-lg font-semibold">
              <Users className="size-4 text-on-dark-muted" /> {a.bids.length}
            </p>
          </div>
          <div>
            <p className="text-[0.7rem] text-on-dark-muted">{t({ ar: "الوقت المتبقي", fr: "Temps restant", en: "Time left" })}</p>
            <Countdown auction={a} className="mt-1 text-on-dark" />
          </div>
        </div>

        <Button asChild variant="rust" className="mt-4 self-start">
          <Link to="/annonces/$id" params={{ id: listing.id }}>
            <Gavel /> {t({ ar: "شارك في المزايدة", fr: "Participer à l'enchère", en: "Join the auction" })}
          </Link>
        </Button>
      </div>
    </article>
  );
}
