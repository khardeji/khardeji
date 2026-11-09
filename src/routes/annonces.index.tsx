import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ListingCard } from "@/components/site/ListingCard";
import { PageHeader } from "@/components/site/SectionHeading";
import {
  auctionCurrentPrice,
  CATEGORIES,
  getCategory,
  GOVERNORATES,
  LISTINGS,
  SALE_TYPE_LABEL,
  type SaleType,
} from "@/data/catalog";

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
  head: () => ({
    meta: [
      { title: "Annonces — Ferraille, pièces auto et récupération | Khardeji" },
      { name: "description", content: "Parcourez les annonces de ferraille, métaux, pièces automobiles et matériel industriel en Tunisie. Filtrez par catégorie, gouvernorat et prix." },
      { property: "og:title", content: "Annonces Khardeji" },
      { property: "og:description", content: "Ferraille, métaux et pièces auto à vendre partout en Tunisie." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalogue,
});

const field =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-rust focus:ring-2 focus:ring-rust/25";

function Filters({ search, onDone }: { search: AnnoncesSearch; onDone?: () => void }) {
  const navigate = useNavigate({ from: "/annonces/" });
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
        <p className="label-stamp text-xs text-muted-foreground">Recherche</p>
        <input className={field} placeholder="Cuivre, moteur, jantes…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className={field} type="number" min={0} placeholder="Prix min" value={min} onChange={(e) => setMin(e.target.value)} />
          <input className={field} type="number" min={0} placeholder="Prix max" value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
        <Button type="submit" className="w-full">Appliquer</Button>
      </form>

      <div>
        <p className="label-stamp mb-2 text-xs text-muted-foreground">Catégorie</p>
        <div className="flex flex-col gap-0.5">
          <FilterChip active={!search.cat} onClick={() => set({ cat: undefined, sub: undefined })}>Toutes</FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip key={c.slug} active={search.cat === c.slug} onClick={() => set({ cat: c.slug, sub: undefined })}>
              {c.name}
            </FilterChip>
          ))}
        </div>
      </div>

      {cat && (
        <div>
          <p className="label-stamp mb-2 text-xs text-muted-foreground">Sous-catégorie</p>
          <div className="flex flex-wrap gap-1.5">
            {cat.subcategories.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ sub: search.sub === s ? undefined : s })}
                className={`rounded-full border px-3 py-1 text-xs transition ${search.sub === s ? "border-rust bg-rust text-rust-foreground" : "border-border bg-card hover:border-rust/60"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="label-stamp mb-2 text-xs text-muted-foreground">Type de vente</p>
        <div className="flex flex-col gap-0.5">
          <FilterChip active={!search.type} onClick={() => set({ type: undefined })}>Tous</FilterChip>
          {(Object.keys(SALE_TYPE_LABEL) as SaleType[]).map((t) => (
            <FilterChip key={t} active={search.type === t} onClick={() => set({ type: t })}>
              {SALE_TYPE_LABEL[t]}
            </FilterChip>
          ))}
        </div>
      </div>

      <div>
        <p className="label-stamp mb-2 text-xs text-muted-foreground">Gouvernorat</p>
        <select className={field} value={search.gov ?? ""} onChange={(e) => set({ gov: e.target.value || undefined })}>
          <option value="">Toute la Tunisie</option>
          {GOVERNORATES.map((g) => (
            <option key={g} value={g}>{g}</option>
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
      className={`rounded-md px-3 py-2 text-left text-sm transition ${active ? "bg-charcoal font-semibold text-on-dark" : "text-foreground/80 hover:bg-accent/60"}`}
    >
      {children}
    </button>
  );
}

function Catalogue() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/annonces/" });
  const [open, setOpen] = useState(false);

  const q = search.q?.toLowerCase();
  let results = LISTINGS.filter((l) => {
    const price = l.saleType === "enchere" ? auctionCurrentPrice(l) : l.price;
    if (q && !`${l.title} ${l.description} ${l.subcategory}`.toLowerCase().includes(q)) return false;
    if (search.cat && l.category !== search.cat) return false;
    if (search.sub && l.subcategory !== search.sub) return false;
    if (search.gov && l.governorate !== search.gov) return false;
    if (search.type && l.saleType !== search.type) return false;
    if (search.min !== undefined && price < search.min) return false;
    if (search.max !== undefined && price > search.max) return false;
    return true;
  });
  const sort = search.sort ?? "recent";
  results = [...results].sort((a, b) =>
    sort === "recent" ? b.publishedAt.localeCompare(a.publishedAt) : sort === "prix-asc" ? a.price - b.price : b.price - a.price,
  );

  const activeCat = search.cat ? getCategory(search.cat) : undefined;
  const hasFilters = Object.values(search).some((v) => v !== undefined && v !== "recent");

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title={activeCat ? activeCat.name : "Toutes les annonces"}
        intro="Ferraille, métaux, pièces automobiles et matériel industriel — prix en dinars tunisiens, partout en Tunisie."
      />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="surface-card sticky top-24 p-5">
            <Filters key={JSON.stringify(search)} search={search} />
          </div>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{results.length}</span> annonce{results.length > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              {hasFilters && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/annonces"><X /> Effacer les filtres</Link>
                </Button>
              )}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden"><SlidersHorizontal /> Filtres</Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto bg-background">
                  <SheetTitle className="font-display">Filtres</SheetTitle>
                  <div className="mt-4">
                    <Filters search={search} onDone={() => setOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
              <select
                aria-label="Trier"
                className="h-8 rounded-md border border-input bg-card px-2 text-sm"
                value={sort}
                onChange={(e) => navigate({ search: (prev) => ({ ...prev, sort: e.target.value as Sort }) })}
              >
                <option value="recent">Plus récentes</option>
                <option value="prix-asc">Prix croissant</option>
                <option value="prix-desc">Prix décroissant</option>
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
              <h2 className="text-2xl font-semibold">Aucune annonce trouvée</h2>
              <p className="mt-2 text-muted-foreground">Essayez d'élargir votre recherche ou de changer de gouvernorat.</p>
              <Button asChild variant="rust" className="mt-6">
                <Link to="/annonces">Voir toutes les annonces</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
