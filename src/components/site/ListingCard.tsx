import { Link } from "@tanstack/react-router";
import { Gavel, Heart, MapPin, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auctionCurrentPrice, governorateLabel, SALE_TYPE_LABEL, subcategoryLabel, type Listing } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { useFavorites } from "@/lib/favorites";
import { UNIT_LABEL } from "@/lib/quantity";
import { cn } from "@/lib/utils";

const NEW_SINCE = "2026-11-08";

export function ListingCard({ listing }: { listing: Listing }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(listing.id);
  const { t, dt, num, date } = useI18n();
  const unit = t(UNIT_LABEL[listing.unit].short);
  const isAuction = listing.saleType === "enchere";
  const price = isAuction ? auctionCurrentPrice(listing) : listing.price;

  return (
    <article className="surface-card card-lift group flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={listing.images[0]}
          alt={t(listing.title)}
          loading="lazy"
          width={1024}
          height={768}
          className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute start-3 end-14 top-3 flex flex-wrap gap-1.5">
          {listing.publishedAt >= NEW_SINCE && <Badge variant="olive">Nouveau</Badge>}
          {isAuction && (
            <Badge variant="rust">
              <Gavel className="me-1 size-3" /> Enchère
            </Badge>
          )}
          {listing.saleType === "negociable" && <Badge variant="brass">Prix négociable</Badge>}
          {listing.urgent && <Badge variant="dark">Urgent</Badge>}
        </div>
        <button
          type="button"
          onClick={() => toggle(listing.id)}
          aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={fav}
          className="absolute end-3 top-3 grid size-9 place-items-center rounded-full bg-card/90 text-foreground shadow-sm transition hover:scale-105"
        >
          <Heart className={cn("size-4", fav && "fill-rust text-rust")} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="label-stamp text-[0.68rem] text-muted-foreground">{t(subcategoryLabel(listing.subcategory))}</p>
        <h3 className="mt-1 line-clamp-2 font-display text-lg font-medium leading-snug text-foreground">
          {t(listing.title)}
        </h3>

        <div className="mt-3 flex items-baseline gap-1.5">
          {isAuction && <span className="text-xs text-muted-foreground">Actuel</span>}
          <span className="font-display text-2xl font-semibold text-rust">{dt(price)}</span>
          <span className="text-sm text-muted-foreground">/ {unit}</span>
        </div>

        <dl className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-brass" />
            <dt className="sr-only">Quantité</dt>
            <dd>
              {num(listing.stock)} {unit} · {t(SALE_TYPE_LABEL[listing.saleType])}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-brass" />
            <dt className="sr-only">Localisation</dt>
            <dd>
              {t(listing.city)}، {t(governorateLabel(listing.governorate))} · {date(listing.publishedAt)}
            </dd>
          </div>
        </dl>

        <Button asChild variant="default" className="mt-4 w-full">
          <Link to="/annonces/$id" params={{ id: listing.id }}>
            Voir détails
          </Link>
        </Button>
      </div>
    </article>
  );
}
