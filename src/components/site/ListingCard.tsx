import { Link } from "@tanstack/react-router";
import { BadgeCheck, Flame, Gavel, Heart, MapPin, Package, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auctionCurrentPrice, governorateLabel, isBoostActive, SALE_TYPE_LABEL, subcategoryLabel, type Listing } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { useFavorites } from "@/lib/favorites";
import { AccountRequiredDialog } from "./ActionDialogs";
import { UNIT_LABEL } from "@/lib/quantity";
import { cn } from "@/lib/utils";

const NEW_SINCE = "2026-11-08";

export function ListingCard({ listing }: { listing: Listing }) {
  const { isFavorite, toggle, needAccount, closeAccount } = useFavorites();
  const { t, dt, num, date } = useI18n();
  const fav = isFavorite(listing.id);
  const unit = UNIT_LABEL[listing.unit as keyof typeof UNIT_LABEL]
    ? t(UNIT_LABEL[listing.unit as keyof typeof UNIT_LABEL].short)
    : (listing.unit || "");
  const isAuction = listing.saleType === "enchere";
  const price = isAuction ? auctionCurrentPrice(listing) : listing.price;

  return (
    <article className={cn("surface-card card-lift group flex flex-col overflow-hidden", listing.featured && "ring-2 ring-brass shadow-md")}>
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
          {listing.publishedAt >= NEW_SINCE && <Badge variant="olive">{t({ ar: "جديد", fr: "Nouveau", en: "New" })}</Badge>}
          {isAuction && (
            <Badge variant="rust">
              <Gavel className="me-1 size-3" /> {t(SALE_TYPE_LABEL.enchere)}
            </Badge>
          )}
          {listing.saleType === "negociable" && <Badge variant="brass">{t(SALE_TYPE_LABEL.negociable)}</Badge>}
          {listing.activeBoost && isBoostActive(listing.activeBoost) ? (
            listing.activeBoost.boostId === "urgent" ? (
              <Badge variant="dark" className="bg-rust text-white border-transparent">
                <Flame className="me-1 size-3" /> {t({ ar: "مستعجل", fr: "Urgent", en: "Urgent" })}
              </Badge>
            ) : listing.activeBoost.boostId === "remonter" ? (
              <Badge variant="olive" className="bg-olive text-white border-transparent">
                <Rocket className="me-1 size-3" /> {t({ ar: "محدّث", fr: "Remontée", en: "Bumped" })}
              </Badge>
            ) : (
              <Badge variant="brass" className="bg-brass text-brass-foreground font-semibold">
                <BadgeCheck className="me-1 size-3" /> {t({ ar: "في الواجهة", fr: "À la une", en: "Featured" })}
              </Badge>
            )
          ) : (
            <>
              {listing.urgent && (
                <Badge variant="dark" className="bg-rust text-white border-transparent">
                  <Flame className="me-1 size-3" /> {t({ ar: "مستعجل", fr: "Urgent", en: "Urgent" })}
                </Badge>
              )}
              {listing.featured && (
                <Badge variant="brass" className="bg-brass text-brass-foreground font-semibold">
                  <BadgeCheck className="me-1 size-3" /> {t({ ar: "في الواجهة", fr: "À la une", en: "Featured" })}
                </Badge>
              )}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => void toggle(listing.id)}
          aria-label={fav ? t({ ar: "نحّي من المفضلة", fr: "Retirer des favoris", en: "Remove from favourites" }) : t({ ar: "زيد للمفضلة", fr: "Ajouter aux favoris", en: "Add to favourites" })}
          aria-pressed={fav}
          className="absolute end-3 top-3 grid size-9 place-items-center rounded-full bg-card/90 text-foreground shadow-sm transition hover:scale-105"
        >
          <Heart className={cn("size-4", fav && "fill-rust text-rust")} />
        </button>
        <AccountRequiredDialog open={needAccount} onClose={closeAccount} reason="favori" />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="label-stamp text-[0.68rem] text-muted-foreground">{t(subcategoryLabel(listing.subcategory))}</p>
        <h3 className="mt-1 line-clamp-2 font-display text-lg font-medium leading-snug text-foreground">
          {t(listing.title)}
        </h3>

        <div className="mt-3 flex items-baseline gap-1.5">
          {isAuction && <span className="text-xs text-muted-foreground">{t({ ar: "حالياً", fr: "Actuel", en: "Current" })}</span>}
          <span className="font-display text-2xl font-semibold text-rust">{dt(price)}</span>
          <span className="text-sm text-muted-foreground">/ {unit}</span>
        </div>

        <dl className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Package className="size-4 shrink-0 text-brass" />
            <dt className="sr-only">{t({ ar: "الكمية", fr: "Quantité", en: "Quantity" })}</dt>
            <dd>
              {num(listing.stock)} {unit} {t({ ar: "متوفرة", fr: "dispo.", en: "available" })} · {t(SALE_TYPE_LABEL[listing.saleType])}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-brass" />
            <dt className="sr-only">{t({ ar: "المكان", fr: "Localisation", en: "Location" })}</dt>
            <dd>
              {t(listing.city)}، {t(governorateLabel(listing.governorate))} · {date(listing.publishedAt)}
            </dd>
          </div>
        </dl>

        <Button asChild variant="default" className="mt-4 w-full">
          <Link to="/annonces/$id" params={{ id: listing.id }}>
            {t({ ar: "شوف التفاصيل", fr: "Voir détails", en: "View details" })}
          </Link>
        </Button>
      </div>
    </article>
  );
}
