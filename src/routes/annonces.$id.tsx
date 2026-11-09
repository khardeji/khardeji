import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeCheck, CalendarDays, Flag, Heart, MapPin, MessageSquare, Package, Phone, Share2, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/site/ListingCard";
import { AuctionPanel, FixedPricePanel, OfferPanel } from "@/components/site/PurchasePanels";
import { getCategory, getListing, LISTINGS, SALE_TYPE_LABEL } from "@/data/catalog";
import { useFavorites } from "@/lib/favorites";
import { formatDateFr, formatDT, formatNumber } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/quantity";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/annonces/$id")({
  loader: ({ params }) => {
    const listing = getListing(params.id);
    if (!listing) throw notFound();
    return { listing };
  },
  head: ({ loaderData }) => {
    const l = loaderData?.listing;
    const title = l ? `${l.title} — ${l.governorate} | Khardeji` : "Annonce introuvable | Khardeji";
    const desc = l ? `${l.title} : ${formatDT(l.price)} / ${UNIT_LABEL[l.unit].short} à ${l.city}, ${l.governorate}.` : "Cette annonce n'existe pas ou a été retirée.";
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
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold">Annonce introuvable</h1>
      <p className="mt-3 text-muted-foreground">Elle a peut-être été vendue ou retirée par le vendeur.</p>
      <Button asChild variant="rust" className="mt-6"><Link to="/annonces">Retour aux annonces</Link></Button>
    </div>
  ),
  component: ListingDetail,
});

function ListingDetail() {
  const { listing } = Route.useLoaderData();
  const [active, setActive] = useState(0);
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(listing.id);
  const cat = getCategory(listing.category);
  const unit = UNIT_LABEL[listing.unit];
  const similar = LISTINGS.filter((l) => l.category === listing.category && l.id !== listing.id).slice(0, 4);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: listing.title, url }).catch(() => {});
    else {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Fil d'Ariane">
        <Link to="/annonces" className="hover:text-foreground">Annonces</Link>
        <span>/</span>
        {cat && <Link to="/annonces" search={{ cat: cat.slug }} className="hover:text-foreground">{cat.name}</Link>}
        <span>/</span>
        <span className="text-foreground">{listing.subcategory}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-xl border border-border bg-muted">
            <img src={listing.images[active]} alt={listing.title} width={1024} height={768} className="aspect-[4/3] w-full object-cover" />
          </div>
          {listing.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {listing.images.map((img, i) => (
                <button key={i} type="button" onClick={() => setActive(i)} aria-label={`Photo ${i + 1}`} className={cn("overflow-hidden rounded-lg border-2", i === active ? "border-rust" : "border-transparent opacity-70 hover:opacity-100")}>
                  <img src={img} alt="" width={1024} height={768} loading="lazy" className="h-20 w-28 object-cover" />
                </button>
              ))}
            </div>
          )}

          <section className="surface-card mt-8 p-6">
            <h2 className="text-2xl font-semibold">Description</h2>
            <p className="mt-3 leading-relaxed text-foreground/85">{listing.description}</p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { icon: Tag, label: "Type de vente", value: SALE_TYPE_LABEL[listing.saleType] },
                { icon: Package, label: "Unité de vente", value: unit.long },
                { icon: Package, label: "Quantité disponible", value: `${formatNumber(listing.stock)} ${unit.short}` },
                { icon: MapPin, label: "Localisation", value: `${listing.city}, ${listing.governorate}` },
                { icon: CalendarDays, label: "Publiée le", value: formatDateFr(listing.publishedAt) },
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
              <Badge variant={listing.saleType === "enchere" ? "rust" : listing.saleType === "negociable" ? "brass" : "olive"}>{SALE_TYPE_LABEL[listing.saleType]}</Badge>
              {listing.urgent && <Badge variant="dark">Urgent</Badge>}
            </div>
            <h1 className="mt-3 text-3xl font-semibold leading-tight">{listing.title}</h1>
            {listing.saleType !== "enchere" && (
              <p className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-4xl font-semibold text-rust">{formatDT(listing.price)}</span>
                <span className="text-muted-foreground">/ {unit.short}</span>
              </p>
            )}
            <div className="rivet-rule my-5" />
            {listing.saleType === "fixe" && <FixedPricePanel listing={listing} />}
            {listing.saleType === "negociable" && <OfferPanel listing={listing} />}
            {listing.saleType === "enchere" && <AuctionPanel listing={listing} />}

            <div className="mt-5 grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => toggle(listing.id)} aria-pressed={fav}>
                <Heart className={cn(fav && "fill-rust text-rust")} /> {fav ? "Favori" : "Favoris"}
              </Button>
              <Button variant="outline" onClick={share}><Share2 /> Partager</Button>
              <Button variant="outline" onClick={() => toast("Signalement reçu", { description: "Notre équipe de modération va examiner l'annonce." })}>
                <Flag /> Signaler
              </Button>
            </div>
          </div>

          <div className="surface-card p-6">
            <p className="label-stamp text-xs text-muted-foreground">Vendeur</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-charcoal font-display text-lg text-brass">
                {listing.seller.name.charAt(0)}
              </span>
              <div>
                <p className="flex items-center gap-1.5 font-semibold">
                  {listing.seller.name}
                  {listing.seller.verified && <BadgeCheck className="size-4 text-olive" aria-label="Vendeur vérifié" />}
                </p>
                <p className="text-sm text-muted-foreground">{listing.seller.kind} · membre depuis {listing.seller.memberSince}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="default" onClick={() => toast("Messagerie bientôt disponible", { description: "Connectez-vous pour écrire au vendeur." })}>
                <MessageSquare /> Contacter
              </Button>
              <Button variant="outline" onClick={() => toast(listing.seller.phone, { description: "Numéro de démonstration" })}>
                <Phone /> Appeler
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-3xl font-semibold">Produits similaires</h2>
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
