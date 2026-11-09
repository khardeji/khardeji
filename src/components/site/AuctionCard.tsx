import { Link } from "@tanstack/react-router";
import { Gavel, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auctionCurrentPrice, type Listing } from "@/data/catalog";
import { formatDT } from "@/lib/format";
import { Countdown } from "./Countdown";

export function AuctionCard({ listing }: { listing: Listing }) {
  const a = listing.auction!;
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-on-dark/10 bg-charcoal-soft text-on-dark shadow-lg sm:flex-row">
      <div className="relative aspect-[4/3] overflow-hidden sm:aspect-auto sm:w-2/5">
        <img
          src={listing.images[0]}
          alt={listing.title}
          loading="lazy"
          width={1024}
          height={768}
          className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="label-stamp absolute left-3 top-3 inline-flex items-center gap-1 rounded bg-rust px-2 py-1 text-[0.65rem] text-rust-foreground">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-rust-foreground" /> En direct
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="label-stamp text-[0.68rem] text-brass">
          {listing.subcategory} · {listing.governorate}
        </p>
        <h3 className="mt-1 font-display text-xl font-medium leading-snug">{listing.title}</h3>

        <div className="mt-4 grid grid-cols-3 gap-3 border-y border-on-dark/10 py-3">
          <div>
            <p className="text-[0.7rem] text-on-dark-muted">Prix actuel</p>
            <p className="font-display text-lg font-semibold text-brass">{formatDT(auctionCurrentPrice(listing))}</p>
          </div>
          <div>
            <p className="text-[0.7rem] text-on-dark-muted">Offres</p>
            <p className="flex items-center gap-1 font-display text-lg font-semibold">
              <Users className="size-4 text-on-dark-muted" /> {a.bids.length}
            </p>
          </div>
          <div>
            <p className="text-[0.7rem] text-on-dark-muted">Temps restant</p>
            <Countdown endsInHours={a.endsInHours} className="mt-1 text-on-dark" />
          </div>
        </div>

        <Button asChild variant="rust" className="mt-4 self-start">
          <Link to="/annonces/$id" params={{ id: listing.id }}>
            <Gavel /> Participer à l'enchère
          </Link>
        </Button>
      </div>
    </article>
  );
}
