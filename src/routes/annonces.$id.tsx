import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeCheck, CalendarDays, Heart, MapPin, MessageSquare, Package, Phone, Share2, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountRequiredDialog } from "@/components/site/ActionDialogs";
import { ContactSellerDialog } from "@/components/site/ContactSellerDialog";
import { ListingCard } from "@/components/site/ListingCard";
import { ReportButton } from "@/components/site/ReportButton";
import { AuctionPanel, FixedPricePanel, OfferPanel } from "@/components/site/PurchasePanels";
import { governorateLabel, SALE_TYPE_LABEL, SELLER_KIND_LABEL, subcategoryLabel } from "@/data/catalog";
import { catalogQuery, useCatalog } from "@/lib/catalog-queries";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useFavorites } from "@/lib/favorites";
import { formatDT } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { UNIT_LABEL } from "@/lib/quantity";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/annonces/$id")({
  loader: async ({ context, params }) => {
    const { listings } = await context.queryClient.ensureQueryData(catalogQuery);
    const listing = listings.find((l) => l.id === params.id);
    if (!listing) throw notFound();
    return { listing };
  },
  head: ({ loaderData, match }) => {
    const l = loaderData?.listing;
    const locale = match.context.locale;
    const tr = translator(locale);
    const title = l
      ? `${tr(l.title)} — ${tr(governorateLabel(l.governorate))} | Khardeji`
      : tr({ ar: "إعلان غير موجود | خردجي", fr: "Annonce introuvable | Khardeji", en: "Listing not found | Khardeji" });
    const desc = l
      ? `${tr(l.title)} : ${formatDT(l.price, locale)} / ${tr(UNIT_LABEL[l.unit].short)} — ${tr(l.city)}, ${tr(governorateLabel(l.governorate))}.`
      : tr({ ar: "هذا الإعلان غير موجود ولا تنحّى.", fr: "Cette annonce n'existe pas ou a été retirée.", en: "This listing doesn't exist or was removed." });
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(l ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: NotFound,
  component: ListingDetail,
});

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold">{t({ ar: "الإعلان غير موجود", fr: "Annonce introuvable", en: "Listing not found" })}</h1>
      <p className="mt-3 text-muted-foreground">
        {t({ ar: "يمكن تباع ولا البائع نحّاه.", fr: "Elle a peut-être été vendue ou retirée par le vendeur.", en: "It may have been sold or removed by the seller." })}
      </p>
      <Button asChild variant="rust" className="mt-6">
        <Link to="/annonces">{t({ ar: "ارجع للإعلانات", fr: "Retour aux annonces", en: "Back to listings" })}</Link>
      </Button>
    </div>
  );
}

function ListingDetail() {
  const { listing } = Route.useLoaderData();
  const { user } = useAuth();
  const isOwner = !!user && !!listing.ownerId && user.id === listing.ownerId;
  const [active, setActive] = useState(0);
  const { isFavorite, toggle, needAccount, closeAccount } = useFavorites();
  const { t, dt, num, date } = useI18n();
  const fav = isFavorite(listing.id);
  const { listings, getCategory } = useCatalog();
  const cat = getCategory(listing.category);
  const unit = { short: t(UNIT_LABEL[listing.unit].short), long: t(UNIT_LABEL[listing.unit].long) };
  const similar = listings.filter((l) => l.category === listing.category && l.id !== listing.id).slice(0, 4);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: t(listing.title), url }).catch(() => {});
    else {
      await navigator.clipboard.writeText(url);
      toast.success(t({ ar: "الرابط تنسخ", fr: "Lien copié", en: "Link copied" }));
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label={t({ ar: "مسار التصفح", fr: "Fil d'Ariane", en: "Breadcrumb" })}>
        <Link to="/annonces" className="hover:text-foreground">{t({ ar: "الإعلانات", fr: "Annonces", en: "Listings" })}</Link>
        <span>/</span>
        {cat && <Link to="/annonces" search={{ cat: cat.slug }} className="hover:text-foreground">{t(cat.name)}</Link>}
        <span>/</span>
        <span className="text-foreground">{t(subcategoryLabel(listing.subcategory))}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-xl border border-border bg-muted">
            <img src={listing.images[active]} alt={t(listing.title)} width={1024} height={768} className="aspect-[4/3] w-full object-cover" />
          </div>
          {listing.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {listing.images.map((img, i) => (
                <button key={i} type="button" onClick={() => setActive(i)} aria-label={`${t({ ar: "تصويرة", fr: "Photo", en: "Photo" })} ${i + 1}`} className={cn("overflow-hidden rounded-lg border-2", i === active ? "border-rust" : "border-transparent opacity-70 hover:opacity-100")}>
                  <img src={img} alt="" width={1024} height={768} loading="lazy" className="h-20 w-28 object-cover" />
                </button>
              ))}
            </div>
          )}

          <section className="surface-card mt-8 p-6">
            <h2 className="text-2xl font-semibold">{t({ ar: "الوصف", fr: "Description", en: "Description" })}</h2>
            <p className="mt-3 leading-relaxed text-foreground/85">{t(listing.description)}</p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { icon: Tag, label: t({ ar: "طريقة البيع", fr: "Type de vente", en: "Sale type" }), value: t(SALE_TYPE_LABEL[listing.saleType]) },
                { icon: Package, label: t({ ar: "وحدة البيع", fr: "Unité de vente", en: "Sale unit" }), value: unit.long },
                { icon: Package, label: t({ ar: "الكمية المتوفرة", fr: "Quantité disponible", en: "Available quantity" }), value: `${num(listing.stock)} ${unit.short}` },
                { icon: MapPin, label: t({ ar: "المكان", fr: "Localisation", en: "Location" }), value: `${t(listing.city)}، ${t(governorateLabel(listing.governorate))}` },
                { icon: CalendarDays, label: t({ ar: "تاريخ النشر", fr: "Publiée le", en: "Posted on" }), value: date(listing.publishedAt) },
              ].map((r) => (
                <div key={r.label} className="flex items-start gap-3">
                  <r.icon className="mt-0.5 size-4 text-brass" />
                  <div>
                    <dt className="label-stamp text-[0.68rem] text-muted-foreground">{r.label}</dt>
                    <dd className="font-medium">{r.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="space-y-5">
          <div className="surface-card p-6">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={listing.saleType === "enchere" ? "rust" : listing.saleType === "negociable" ? "brass" : "olive"}>{t(SALE_TYPE_LABEL[listing.saleType])}</Badge>
              {listing.urgent && <Badge variant="dark">{t({ ar: "مستعجل", fr: "Urgent", en: "Urgent" })}</Badge>}
            </div>
            <h1 className="mt-3 text-3xl font-semibold leading-tight">{t(listing.title)}</h1>
            {listing.saleType !== "enchere" && (
              <p className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-4xl font-semibold text-rust">{dt(listing.price)}</span>
                <span className="text-muted-foreground">/ {unit.short}</span>
              </p>
            )}
            <div className="rivet-rule my-5" />
            {listing.saleType === "fixe" && <FixedPricePanel listing={listing} />}
            {listing.saleType === "negociable" && <OfferPanel listing={listing} />}
            {listing.saleType === "enchere" && <AuctionPanel listing={listing} />}

            <div className="mt-5 grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => void toggle(listing.id)} aria-pressed={fav}>
                <Heart className={cn(fav && "fill-rust text-rust")} /> {fav ? t({ ar: "في المفضلة", fr: "Favori", en: "Saved" }) : t({ ar: "المفضلة", fr: "Favoris", en: "Save" })}
              </Button>
              <Button variant="outline" onClick={share}><Share2 /> {t({ ar: "شارك", fr: "Partager", en: "Share" })}</Button>
              <ReportButton listingId={listing.id} listingTitle={t(listing.title)} />
            </div>
            <AccountRequiredDialog open={needAccount} onClose={closeAccount} reason="favori" />
          </div>

          <div className="surface-card p-6">
            <p className="label-stamp text-xs text-muted-foreground">{t({ ar: "البائع", fr: "Vendeur", en: "Seller" })}</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-charcoal font-display text-lg text-brass">
                {listing.seller.name.charAt(0)}
              </span>
              <div>
                <p className="flex items-center gap-1.5 font-semibold">
                  {listing.seller.name}
                  {listing.seller.verified && <BadgeCheck className="size-4 text-olive" aria-label={t({ ar: "بائع متثبّت منو", fr: "Vendeur vérifié", en: "Verified seller" })} />}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(SELLER_KIND_LABEL[listing.seller.kind])} · {t({ ar: "عضو منذ", fr: "membre depuis", en: "member since" })} {listing.seller.memberSince}
                </p>
              </div>
            </div>
            {isOwner ? (
              <div className="mt-4 space-y-2">
                <Badge variant="brass" className="w-full justify-center py-1">
                  {t({ ar: "أنت صاحب هذا الإعلان", fr: "Votre propre annonce", en: "Your own listing" })}
                </Badge>
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/mes-annonces">
                      {t({ ar: "إعلاناتي", fr: "Mes annonces", en: "My listings" })}
                    </Link>
                  </Button>
                  {listing.saleType === "negociable" ? (
                    <Button asChild variant="rust" size="sm">
                      <Link to="/mes-offres">
                        {t({ ar: "العروض", fr: "Voir offres", en: "View offers" })}
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild variant="rust" size="sm">
                      <Link to="/mes-demandes">
                        {t({ ar: "الطلبات", fr: "Commandes", en: "Requests" })}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <ContactSellerDialog
                  listingId={listing.id}
                  listingTitle={t(listing.title)}
                  sellerName={listing.seller.name}
                />
                {listing.seller.phone ? (
                  <Button variant="outline" asChild>
                    <a href={`tel:${listing.seller.phone.replace(/[^+\d]/g, "")}`} dir="ltr">
                      <Phone /> {listing.seller.phone}
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    <Phone /> {t({ ar: "ما فمّاش رقم", fr: "Pas de numéro", en: "No number" })}
                  </Button>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-3xl font-semibold">{t({ ar: "منتوجات مشابهة", fr: "Produits similaires", en: "Similar items" })}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
