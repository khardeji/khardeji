import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Gavel, HandCoins, ImagePlus, Tag, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/site/SectionHeading";
import { CATEGORIES, governorateLabel, GOVERNORATES, SALE_TYPE_LABEL, subcategoryLabel, type SaleType } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { UNIT_LABEL, type SaleUnit } from "@/lib/quantity";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/publier")({
  head: () => ({
    meta: [
      { title: "Publier une annonce — Vendez votre ferraille | Khardeji" },
      { name: "description", content: "Publiez gratuitement votre annonce de ferraille, pièces auto ou matériel : prix fixe, négociable ou enchère, au kg, à la pièce, à la tonne ou au lot." },
      { property: "og:title", content: "Publier une annonce sur Khardeji" },
      { property: "og:description", content: "Vendez vos métaux, pièces et matériaux de récupération partout en Tunisie." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Publish,
});

const STEPS = ["Informations", "Type de vente", "Quantité et prix", "Récapitulatif"];
const field =
  "h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-rust focus:ring-2 focus:ring-rust/25";

interface Draft {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  governorate: string;
  city: string;
  photos: string[];
  saleType: SaleType;
  unit: SaleUnit;
  price: string;
  stock: string;
  startPrice: string;
  reservePrice: string;
  increment: string;
  startAt: string;
  endAt: string;
}

const EMPTY: Draft = {
  title: "", description: "", category: "", subcategory: "", governorate: "", city: "", photos: [],
  saleType: "fixe", unit: "kg", price: "", stock: "", startPrice: "", reservePrice: "", increment: "50", startAt: "", endAt: "",
};

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string | undefined; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Publish() {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(EMPTY);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const { t, dt: formatDT, num: formatNumber } = useI18n();
  const cat = CATEGORIES.find((c) => c.slug === d.category);
  const unit = { step: UNIT_LABEL[d.unit].step, short: t(UNIT_LABEL[d.unit].short), long: t(UNIT_LABEL[d.unit].long) };

  function validate(s: number): string | null {
    if (s === 0) {
      if (d.title.trim().length < 5) return "Le titre doit contenir au moins 5 caractères.";
      if (!d.category || !d.subcategory) return "Choisissez une catégorie et une sous-catégorie.";
      if (!d.governorate) return "Choisissez un gouvernorat.";
    }
    if (s === 2) {
      if (d.saleType === "enchere") {
        if (!(Number(d.startPrice) > 0)) return "Indiquez un prix de départ.";
        if (!(Number(d.increment) > 0)) return "Indiquez un incrément minimum.";
        if (!d.startAt || !d.endAt || d.endAt <= d.startAt) return "La date de fin doit suivre la date de début.";
      } else if (!(Number(d.price) > 0)) return "Indiquez un prix.";
      if (d.unit !== "libre" && !(Number(d.stock) > 0)) return "Indiquez la quantité disponible.";
    }
    return null;
  }

  function next() {
    const err = validate(step);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const urls = Array.from(files).slice(0, 12 - d.photos.length).map((f) => URL.createObjectURL(f));
    set("photos", [...d.photos, ...urls]);
  }

  const priceLabel = d.saleType === "negociable" ? `Prix indicatif (DT / ${unit.short})` : `Prix (DT / ${unit.short})`;

  return (
    <>
      <PageHeader eyebrow="Vendre" title="Publier une annonce" intro="Quatre étapes pour mettre vos matériaux en vente. La publication de base est gratuite." />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <ol className="mb-8 grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-col gap-2">
              <span className={cn("h-1.5 rounded-full", i <= step ? "bg-rust" : "bg-border")} />
              <span className={cn("label-stamp text-[0.68rem]", i === step ? "text-rust" : "text-muted-foreground")}>
                {i + 1}. <span className="hidden sm:inline">{s}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="surface-card p-6 sm:p-8">
          {step === 0 && (
            <div className="grid gap-5">
              <Field label="Titre" htmlFor="p-title">
                <input id="p-title" className={field} value={d.title} maxLength={90} onChange={(e) => set("title", e.target.value)} placeholder="Ex. Cuivre récupéré — fils nettoyés" />
              </Field>
              <Field label="Description" htmlFor="p-desc">
                <textarea id="p-desc" rows={4} className={`${field} h-auto py-2`} value={d.description} onChange={(e) => set("description", e.target.value)} placeholder="État, provenance, conditions d'enlèvement…" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Catégorie" htmlFor="p-cat">
                  <select id="p-cat" className={field} value={d.category} onChange={(e) => setD((p) => ({ ...p, category: e.target.value, subcategory: "" }))}>
                    <option value="">Choisir…</option>
                    {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{t(c.name)}</option>)}
                  </select>
                </Field>
                <Field label="Sous-catégorie" htmlFor="p-sub">
                  <select id="p-sub" className={field} value={d.subcategory} disabled={!cat} onChange={(e) => set("subcategory", e.target.value)}>
                    <option value="">Choisir…</option>
                    {cat?.subcategories.map((s) => <option key={s} value={s}>{t(subcategoryLabel(s))}</option>)}
                  </select>
                </Field>
                <Field label="Gouvernorat" htmlFor="p-gov">
                  <select id="p-gov" className={field} value={d.governorate} onChange={(e) => set("governorate", e.target.value)}>
                    <option value="">Choisir…</option>
                    {GOVERNORATES.map((g) => <option key={g} value={g}>{t(governorateLabel(g))}</option>)}
                  </select>
                </Field>
                <Field label="Ville / délégation" htmlFor="p-city">
                  <input id="p-city" className={field} value={d.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
              </div>
              {d.category === "vehicules" && (
                <p className="rounded-md border border-brass/50 bg-brass/10 p-3 text-sm">
                  Véhicules : une preuve de propriété (carte grise) sera demandée avant la mise en ligne.
                </p>
              )}
              <div>
                <p className="text-sm font-medium">Photos ({d.photos.length}/12)</p>
                <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {d.photos.map((p, i) => (
                    <div key={p} className="relative aspect-square overflow-hidden rounded-md border border-border">
                      <img src={p} alt={`Photo ${i + 1}`} className="size-full object-cover" />
                      <button type="button" aria-label="Retirer" onClick={() => set("photos", d.photos.filter((x) => x !== p))} className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-charcoal/80 text-on-dark">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  {d.photos.length < 12 && (
                    <label className="grid aspect-square cursor-pointer place-items-center rounded-md border-2 border-dashed border-border text-muted-foreground transition hover:border-rust hover:text-rust">
                      <ImagePlus className="size-6" />
                      <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-3">
              {([
                { id: "fixe", icon: Tag, text: "Vous fixez un prix et une quantité. L'acheteur choisit la quantité exacte." },
                { id: "negociable", icon: HandCoins, text: "Prix indicatif : les acheteurs peuvent proposer un autre prix." },
                { id: "enchere", icon: Gavel, text: "Prix de départ, incrément et durée. La meilleure offre l'emporte." },
              ] as const).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => set("saleType", o.id)}
                  aria-pressed={d.saleType === o.id}
                  className={cn("rounded-xl border-2 p-5 text-start transition", d.saleType === o.id ? "border-rust bg-rust/5" : "border-border hover:border-rust/50")}
                >
                  <o.icon className={cn("size-7", d.saleType === o.id ? "text-rust" : "text-brass")} />
                  <h3 className="mt-3 text-lg font-semibold">{t(SALE_TYPE_LABEL[o.id])}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{o.text}</p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6">
              <div>
                <p className="text-sm font-medium">Unité de vente</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(UNIT_LABEL) as SaleUnit[]).map((u) => (
                    <button key={u} type="button" onClick={() => set("unit", u)} aria-pressed={d.unit === u} className={cn("rounded-full border px-4 py-2 text-sm transition", d.unit === u ? "border-rust bg-rust text-rust-foreground" : "border-border bg-card hover:border-rust/50")}>
                      {t(UNIT_LABEL[u].long)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {d.saleType === "enchere" ? (
                  <>
                    <Field label={`Prix de départ (DT${d.unit === "piece" ? "" : ` / ${unit.short}`})`} htmlFor="p-start"><input id="p-start" type="number" min={0} className={field} value={d.startPrice} onChange={(e) => set("startPrice", e.target.value)} /></Field>
                    <Field label="Prix minimum de vente (facultatif)" htmlFor="p-res" hint="Non visible par les acheteurs."><input id="p-res" type="number" min={0} className={field} value={d.reservePrice} onChange={(e) => set("reservePrice", e.target.value)} /></Field>
                    <Field label="Incrément minimum (DT)" htmlFor="p-inc"><input id="p-inc" type="number" min={1} className={field} value={d.increment} onChange={(e) => set("increment", e.target.value)} /></Field>
                    <div />
                    <Field label="Début" htmlFor="p-sa"><input id="p-sa" type="datetime-local" className={field} value={d.startAt} onChange={(e) => set("startAt", e.target.value)} /></Field>
                    <Field label="Fin" htmlFor="p-ea"><input id="p-ea" type="datetime-local" className={field} value={d.endAt} onChange={(e) => set("endAt", e.target.value)} /></Field>
                  </>
                ) : (
                  <Field label={priceLabel} htmlFor="p-price"><input id="p-price" type="number" min={0} step="0.1" className={field} value={d.price} onChange={(e) => set("price", e.target.value)} /></Field>
                )}
                {d.unit !== "libre" && (
                  <Field
                    label={`Quantité disponible (${unit.short}${d.unit === "piece" || d.unit === "lot" ? "s" : ""})`}
                    htmlFor="p-stock"
                    hint={d.unit === "kg" ? "Ex. 150 kg — l'acheteur pourra en demander une partie." : d.unit === "tonne" ? "Les demi-tonnes sont acceptées." : undefined}
                  >
                    <input id="p-stock" type="number" min={0} step={unit.step} className={field} value={d.stock} onChange={(e) => set("stock", e.target.value)} />
                  </Field>
                )}
              </div>
              {d.saleType !== "enchere" && Number(d.price) > 0 && Number(d.stock) > 0 && (
                <p className="rounded-md bg-muted p-3 text-sm">
                  Valeur totale du stock : <span className="font-semibold">{formatDT(Number(d.price) * Number(d.stock))}</span>
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">{d.title}</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Catégorie", `${cat ? t(cat.name) : ""} › ${d.subcategory ? t(subcategoryLabel(d.subcategory)) : ""}`],
                  ["Localisation", `${d.city ? d.city + ", " : ""}${d.governorate ? t(governorateLabel(d.governorate)) : ""}`],
                  ["Type de vente", t(SALE_TYPE_LABEL[d.saleType])],
                  ["Unité", unit.long],
                  d.saleType === "enchere"
                    ? ["Prix de départ", `${formatDT(Number(d.startPrice))} · +${formatDT(Number(d.increment))} min.`]
                    : ["Prix", `${formatDT(Number(d.price))} / ${unit.short}`],
                  ["Quantité", d.unit === "libre" ? "Libre" : `${formatNumber(Number(d.stock))} ${unit.short}`],
                  ["Photos", `${d.photos.length}`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md bg-muted/70 p-3">
                    <dt className="label-stamp text-[0.68rem] text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-muted-foreground">Votre annonce sera vérifiée par notre équipe avant publication.</p>
            </div>
          )}

          <div className="mt-8 flex justify-between gap-3 border-t border-border pt-6">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ChevronLeft className="rtl:rotate-180" /> Précédent
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="default" onClick={next}>Suivant <ChevronRight className="rtl:rotate-180" /></Button>
            ) : (
              <Button variant="rust" onClick={() => toast("Connexion requise", { description: "La publication ouvrira avec les comptes vendeurs.", action: { label: "Connexion", onClick: () => (window.location.href = "/connexion") } })}>
                <Check /> Publier l'annonce
              </Button>
            )}
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Besoin de plus de visibilité ? <Link to="/services" className="text-rust hover:underline">Découvrez les boosts</Link>
        </p>
      </div>
    </>
  );
}
