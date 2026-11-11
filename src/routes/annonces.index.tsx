import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ListingCard } from "@/components/site/ListingCard";
import { PageHeader } from "@/components/site/SectionHeading";
import {
  auctionCurrentPrice,
  boostPriority,
  governorateLabel,
  GOVERNORATES,
  listingSearchText,
  SALE_TYPE_LABEL,
  subcategoryLabel,
  type SaleType,
} from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { catalogQuery, useCatalog } from "@/lib/catalog-queries";
import { pageMeta, SHARE_IMAGE } from "@/lib/i18n";

type Sort = "recent" | "prix-asc" | "prix-desc";

export interface AnnoncesSearch {
  q?: string | undefined;
  cat?: string | undefined;
  sub?: string | undefined;
  gov?: string | undefined;
  min?: number | undefined;
  max?: number | undefined;
  type?: SaleType | undefined;
  sort?: Sort | undefined;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export const Route = createFileRoute("/annonces/")({
  validateSearch: (s: Record<string, unknown>): AnnoncesSearch => ({
    q: str(s["q"]),
    cat: str(s["cat"]),
    sub: str(s["sub"]),
    gov: str(s["gov"]),
    min: num(s["min"]),
    max: num(s["max"]),
    type: s["type"] === "fixe" || s["type"] === "negociable" || s["type"] === "enchere" ? s["type"] : undefined,
    sort: s["sort"] === "prix-asc" || s["sort"] === "prix-desc" || s["sort"] === "recent" ? s["sort"] : undefined,
  }),
  head: ({ match }) => ({
    meta: pageMeta(match.context.locale, {
      image: SHARE_IMAGE,
      title: {
        ar: "الإعلانات — خردة، قطع غيار ومواد رسكلة | خردجي",
        fr: "Annonces — Ferraille, pièces auto et récupération | Khardeji",
        en: "Listings — Scrap, car parts and salvage | Khardeji",
      },
      description: {
        ar: "تصفّح إعلانات الخردة، المعادن، قطع غيار السيارات والمعدات الصناعية في تونس. فلتر حسب الصنف، الولاية والسعر.",
        fr: "Parcourez les annonces de ferraille, métaux, pièces automobiles et matériel industriel en Tunisie. Filtrez par catégorie, gouvernorat et prix.",
        en: "Browse scrap, metal, car part and industrial equipment listings in Tunisia. Filter by category, governorate and price.",
      },
    }),
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Catalogue,
});

const field =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-rust focus:ring-2 focus:ring-rust/25";

function Filters({ search, onDone }: { search: AnnoncesSearch; onDone?: () => void }) {
  const navigate = useNavigate({ from: "/annonces/" });
  const { t } = useI18n();
  const { categories: CATEGORIES, getCategory } = useCatalog();
  const [q, setQ] = useState(search.q ?? "");
  const [min, setMin] = useState(search.min?.toString() ?? "");
  const [max, setMax] = useState(search.max?.toString() ?? "");
  const cat = search.cat ? getCategory(search.cat) : undefined;

  const set = (patch: Partial<AnnoncesSearch>) => navigate({ search: (prev) => ({ ...prev, ...patch }) });

  function applyText(e: FormEvent) {
    e.preventDefault();
    set({ q: q || undefined, min: min ? Number(min) : undefined, max: max ? Number(max) : undefined });
    onDone?.();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={applyText} className="space-y-3">
        <p className="label-stamp text-xs text-muted-foreground">{t({ ar: "بحث", fr: "Recherche", en: "Search" })}</p>
        <input className={field} placeholder={t({ ar: "نحاس، محرك، جنط…", fr: "Cuivre, moteur, jantes…", en: "Copper, engine, rims…" })} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className={field} type="number" min={0} placeholder={t({ ar: "أدنى سعر", fr: "Prix min", en: "Min price" })} value={min} onChange={(e) => setMin(e.target.value)} />
          <input className={field} type="number" min={0} placeholder={t({ ar: "أقصى سعر", fr: "Prix max", en: "Max price" })} value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
        <Button type="submit" className="w-full">{t({ ar: "طبّق", fr: "Appliquer", en: "Apply" })}</Button>
      </form>

      <div>
        <p className="label-stamp mb-2 text-xs text-muted-foreground">{t({ ar: "الصنف", fr: "Catégorie", en: "Category" })}</p>
        <div className="flex flex-col gap-0.5">
          <FilterChip active={!search.cat} onClick={() => set({ cat: undefined, sub: undefined })}>{t({ ar: "الكل", fr: "Toutes", en: "All" })}</FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip key={c.slug} active={search.cat === c.slug} onClick={() => set({ cat: c.slug, sub: undefined })}>
              {t(c.name)}
            </FilterChip>
          ))}
        </div>
      </div>

      {cat && (
        <div>
          <p className="label-stamp mb-2 text-xs text-muted-foreground">{t({ ar: "الصنف الفرعي", fr: "Sous-catégorie", en: "Subcategory" })}</p>
          <div className="flex flex-wrap gap-1.5">
            {cat.subcategories.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ sub: search.sub === s ? undefined : s })}
                className={`rounded-full border px-3 py-1 text-xs transition ${search.sub === s ? "border-rust bg-rust text-rust-foreground" : "border-border bg-card hover:border-rust/60"}`}
              >
                {t(subcategoryLabel(s))}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="label-stamp mb-2 text-xs text-muted-foreground">{t({ ar: "طريقة البيع", fr: "Type de vente", en: "Sale type" })}</p>
        <div className="flex flex-col gap-0.5">
          <FilterChip active={!search.type} onClick={() => set({ type: undefined })}>{t({ ar: "الكل", fr: "Tous", en: "All" })}</FilterChip>
          {(Object.keys(SALE_TYPE_LABEL) as SaleType[]).map((st) => (
            <FilterChip key={st} active={search.type === st} onClick={() => set({ type: st })}>
              {t(SALE_TYPE_LABEL[st])}
            </FilterChip>
          ))}
        </div>
      </div>

      <div>
        <p className="label-stamp mb-2 text-xs text-muted-foreground">{t({ ar: "الولاية", fr: "Gouvernorat", en: "Governorate" })}</p>
        <select className={field} value={search.gov ?? ""} onChange={(e) => set({ gov: e.target.value || undefined })}>
          <option value="">{t({ ar: "كامل تونس", fr: "Toute la Tunisie", en: "All of Tunisia" })}</option>
          {GOVERNORATES.map((g) => (
            <option key={g} value={g}>{t(governorateLabel(g))}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-start text-sm transition ${active ? "bg-charcoal font-semibold text-on-dark" : "text-foreground/80 hover:bg-accent/60"}`}
    >
      {children}
    </button>
  );
}

function Catalogue() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/annonces/" });
  const [open, setOpen] = useState(false);
  const { t, dir, locale } = useI18n();
  const { listings: LISTINGS, getCategory } = useCatalog();

  const q = search.q?.toLowerCase();
  let results = LISTINGS.filter((l) => {
    const price = l.saleType === "enchere" ? auctionCurrentPrice(l) : l.price;
    if (q && !listingSearchText(l).includes(q)) return false;
    if (search.cat && l.category !== search.cat) return false;
    if (search.sub && l.subcategory !== search.sub) return false;
    if (search.gov && l.governorate !== search.gov) return false;
    if (search.type && l.saleType !== search.type) return false;
    if (search.min !== undefined && price < search.min) return false;
    if (search.max !== undefined && price > search.max) return false;
    return true;
  });
  const sort = search.sort ?? "recent";
  results = [...results].sort((a, b) => {
    // Boosted listings always appear first, ordered by plan tier
    const boostDiff = boostPriority(b) - boostPriority(a);
    if (boostDiff !== 0) return boostDiff;
    // Then apply the user-selected sort
    if (sort === "recent") return b.publishedAt.localeCompare(a.publishedAt);
    if (sort === "prix-asc") return a.price - b.price;
    return b.price - a.price;
  });

  const activeCat = search.cat ? getCategory(search.cat) : undefined;
  const hasFilters = Object.values(search).some((v) => v !== undefined && v !== "recent");
  const n = results.length;

  return (
    <>
      <PageHeader
        eyebrow={t({ ar: "الكتالوج", fr: "Catalogue", en: "Catalogue" })}
        title={activeCat ? t(activeCat.name) : t({ ar: "كل الإعلانات", fr: "Toutes les annonces", en: "All listings" })}
        intro={t({
          ar: "خردة، معادن، قطع غيار السيارات ومعدات صناعية — الأسعار بالدينار التونسي، في كامل تونس.",
          fr: "Ferraille, métaux, pièces automobiles et matériel industriel — prix en dinars tunisiens, partout en Tunisie.",
          en: "Scrap, metals, car parts and industrial equipment — prices in Tunisian dinars, across Tunisia.",
        })}
      />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          {/* Fits the screen and scrolls on its own, so the bottom filters are always reachable. */}
          <div className="surface-card sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain p-5">
            <Filters key={JSON.stringify(search)} search={search} />
          </div>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{n}</span>{" "}
              {locale === "ar" ? "إعلان" : locale === "fr" ? (n > 1 ? "annonces" : "annonce") : n === 1 ? "listing" : "listings"}
            </p>
            <div className="flex items-center gap-2">
              {hasFilters && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/annonces"><X /> {t({ ar: "امسح الفلاتر", fr: "Effacer les filtres", en: "Clear filters" })}</Link>
                </Button>
              )}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden"><SlidersHorizontal /> {t({ ar: "الفلاتر", fr: "Filtres", en: "Filters" })}</Button>
                </SheetTrigger>
                <SheetContent side={dir === "rtl" ? "right" : "left"} dir={dir} className="w-80 overflow-y-auto bg-background">
                  <SheetTitle className="font-display">{t({ ar: "الفلاتر", fr: "Filtres", en: "Filters" })}</SheetTitle>
                  <div className="mt-4">
                    <Filters search={search} onDone={() => setOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
              <select
                aria-label={t({ ar: "رتّب", fr: "Trier", en: "Sort" })}
                className="h-8 rounded-md border border-input bg-card px-2 text-sm"
                value={sort}
                onChange={(e) => navigate({ search: (prev) => ({ ...prev, sort: e.target.value as Sort }) })}
              >
                <option value="recent">{t({ ar: "الأحدث", fr: "Plus récentes", en: "Newest" })}</option>
                <option value="prix-asc">{t({ ar: "السعر من الأرخص", fr: "Prix croissant", en: "Price: low to high" })}</option>
                <option value="prix-desc">{t({ ar: "السعر من الأغلى", fr: "Prix décroissant", en: "Price: high to low" })}</option>
              </select>
            </div>
          </div>

          {results.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <div className="surface-card p-12 text-center">
              <h2 className="text-2xl font-semibold">{t({ ar: "ما لقينا حتى إعلان", fr: "Aucune annonce trouvée", en: "No listings found" })}</h2>
              <p className="mt-2 text-muted-foreground">
                {t({ ar: "جرّب توسّع البحث ولا بدّل الولاية.", fr: "Essayez d'élargir votre recherche ou de changer de gouvernorat.", en: "Try widening your search or changing governorate." })}
              </p>
              <Button asChild variant="rust" className="mt-6">
                <Link to="/annonces">{t({ ar: "شوف كل الإعلانات", fr: "Voir toutes les annonces", en: "See all listings" })}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
