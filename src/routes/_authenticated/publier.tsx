import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Gavel, HandCoins, ImagePlus, Tag, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/site/SectionHeading";
import { CATEGORIES, governorateLabel, GOVERNORATES, SALE_TYPE_LABEL, subcategoryLabel, type SaleType } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { pageMeta, type Msg } from "@/lib/i18n";
import { UNIT_LABEL, type SaleUnit } from "@/lib/quantity";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/publier")({
  head: ({ match }) => ({
    meta: pageMeta(match.context.locale, {
      title: { ar: "انشر إعلان — بيع الخردة متاعك | خردجي", fr: "Publier une annonce — Vendez votre ferraille | Khardeji", en: "Post a listing — Sell your scrap | Khardeji" },
      description: {
        ar: "انشر إعلان خردة، قطع غيار ولا معدات: سعر ثابت، قابل للتفاوض ولا مزايدة، بالكيلو، بالقطعة، بالطن ولا بالدفعة.",
        fr: "Publiez votre annonce de ferraille, pièces auto ou matériel : prix fixe, négociable ou enchère, au kg, à la pièce, à la tonne ou au lot.",
        en: "Post your scrap, car part or equipment listing: fixed, negotiable or auction, per kg, piece, tonne or lot.",
      },
      card: "summary",
    }),
  }),
  component: Publish,
});

const STEPS: Msg[] = [
  { ar: "المعلومات", fr: "Informations", en: "Details" },
  { ar: "طريقة البيع", fr: "Type de vente", en: "Sale type" },
  { ar: "الكمية والسعر", fr: "Quantité et prix", en: "Quantity and price" },
  { ar: "الملخّص", fr: "Récapitulatif", en: "Summary" },
];
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

const SALE_MODES = [
  { id: "fixe", icon: Tag, text: { ar: "إنت تحدّد السعر والكمية. المشتري يختار الكمية بالضبط.", fr: "Vous fixez un prix et une quantité. L'acheteur choisit la quantité exacte.", en: "You set a price and quantity. The buyer picks the exact quantity." } },
  { id: "negociable", icon: HandCoins, text: { ar: "سعر مقترح: المشترين ينجموا يقترحوا سعر آخر.", fr: "Prix indicatif : les acheteurs peuvent proposer un autre prix.", en: "Asking price: buyers can propose another price." } },
  { id: "enchere", icon: Gavel, text: { ar: "سعر انطلاق، زيادة دنيا ومدّة. أعلى عرض يربح.", fr: "Prix de départ, incrément et durée. La meilleure offre l'emporte.", en: "Start price, increment and duration. The highest bid wins." } },
] as const;

function Publish() {
  const { t, dt, num } = useI18n();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(EMPTY);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const cat = CATEGORIES.find((c) => c.slug === d.category);
  const unit = { step: UNIT_LABEL[d.unit].step, short: t(UNIT_LABEL[d.unit].short), long: t(UNIT_LABEL[d.unit].long) };
  const choose = t({ ar: "اختار…", fr: "Choisir…", en: "Choose…" });

  function validate(s: number): Msg | null {
    if (s === 0) {
      if (d.title.trim().length < 5) return { ar: "العنوان لازم يكون 5 حروف على الأقل.", fr: "Le titre doit contenir au moins 5 caractères.", en: "The title needs at least 5 characters." };
      if (!d.category || !d.subcategory) return { ar: "اختار صنف وصنف فرعي.", fr: "Choisissez une catégorie et une sous-catégorie.", en: "Choose a category and subcategory." };
      if (!d.governorate) return { ar: "اختار الولاية.", fr: "Choisissez un gouvernorat.", en: "Choose a governorate." };
    }
    if (s === 2) {
      if (d.saleType === "enchere") {
        if (!(Number(d.startPrice) > 0)) return { ar: "اكتب سعر الانطلاق.", fr: "Indiquez un prix de départ.", en: "Enter a start price." };
        if (!(Number(d.increment) > 0)) return { ar: "اكتب أدنى زيادة.", fr: "Indiquez un incrément minimum.", en: "Enter a minimum increment." };
        if (!d.startAt || !d.endAt || d.endAt <= d.startAt) return { ar: "تاريخ النهاية لازم يكون بعد تاريخ البداية.", fr: "La date de fin doit suivre la date de début.", en: "The end date must be after the start date." };
      } else if (!(Number(d.price) > 0)) return { ar: "اكتب السعر.", fr: "Indiquez un prix.", en: "Enter a price." };
      if (d.unit !== "libre" && !(Number(d.stock) > 0)) return { ar: "اكتب الكمية المتوفرة.", fr: "Indiquez la quantité disponible.", en: "Enter the available quantity." };
    }
    return null;
  }

  function next() {
    const err = validate(step);
    if (err) {
      toast.error(t(err));
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const urls = Array.from(files).slice(0, 12 - d.photos.length).map((f) => URL.createObjectURL(f));
    set("photos", [...d.photos, ...urls]);
  }

  const priceLabel =
    d.saleType === "negociable"
      ? `${t({ ar: "السعر المقترح", fr: "Prix indicatif", en: "Asking price" })} (${t({ ar: "د.ت", fr: "DT", en: "TND" })} / ${unit.short})`
      : `${t({ ar: "السعر", fr: "Prix", en: "Price" })} (${t({ ar: "د.ت", fr: "DT", en: "TND" })} / ${unit.short})`;

  const summary: [string, string][] = [
    [t({ ar: "الصنف", fr: "Catégorie", en: "Category" }), `${cat ? t(cat.name) : ""} › ${d.subcategory ? t(subcategoryLabel(d.subcategory)) : ""}`],
    [t({ ar: "المكان", fr: "Localisation", en: "Location" }), `${d.city ? d.city + "، " : ""}${d.governorate ? t(governorateLabel(d.governorate)) : ""}`],
    [t({ ar: "طريقة البيع", fr: "Type de vente", en: "Sale type" }), t(SALE_TYPE_LABEL[d.saleType])],
    [t({ ar: "الوحدة", fr: "Unité", en: "Unit" }), unit.long],
    d.saleType === "enchere"
      ? [t({ ar: "سعر الانطلاق", fr: "Prix de départ", en: "Start price" }), `${dt(Number(d.startPrice))} · +${dt(Number(d.increment))} ${t({ ar: "أدنى", fr: "min.", en: "min." })}`]
      : [t({ ar: "السعر", fr: "Prix", en: "Price" }), `${dt(Number(d.price))} / ${unit.short}`],
    [t({ ar: "الكمية", fr: "Quantité", en: "Quantity" }), d.unit === "libre" ? t({ ar: "حرة", fr: "Libre", en: "Free" }) : `${num(Number(d.stock))} ${unit.short}`],
    [t({ ar: "التصاور", fr: "Photos", en: "Photos" }), `${d.photos.length}`],
  ];

  return (
    <>
      <PageHeader
        eyebrow={t({ ar: "بيع", fr: "Vendre", en: "Sell" })}
        title={t({ ar: "انشر إعلان", fr: "Publier une annonce", en: "Post a listing" })}
        intro={t({ ar: "أربع مراحل باش تعرض الموادّ متاعك للبيع. النشر العادي بلاش.", fr: "Quatre étapes pour mettre vos matériaux en vente. La publication de base est gratuite.", en: "Four steps to put your materials up for sale. Basic posting is free." })}
      />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <ol className="mb-8 grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.fr} className="flex flex-col gap-2">
              <span className={cn("h-1.5 rounded-full", i <= step ? "bg-rust" : "bg-border")} />
              <span className={cn("label-stamp text-[0.68rem]", i === step ? "text-rust" : "text-muted-foreground")}>
                {i + 1}. <span className="hidden sm:inline">{t(s)}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="surface-card p-6 sm:p-8">
          {step === 0 && (
            <div className="grid gap-5">
              <Field label={t({ ar: "العنوان", fr: "Titre", en: "Title" })} htmlFor="p-title">
                <input id="p-title" className={field} value={d.title} maxLength={90} onChange={(e) => set("title", e.target.value)} placeholder={t({ ar: "مثال: نحاس مسترجع — خيوط منظفة", fr: "Ex. Cuivre récupéré — fils nettoyés", en: "E.g. Recovered copper — cleaned wires" })} />
              </Field>
              <Field label={t({ ar: "الوصف", fr: "Description", en: "Description" })} htmlFor="p-desc">
                <textarea id="p-desc" rows={4} className={`${field} h-auto py-2`} value={d.description} onChange={(e) => set("description", e.target.value)} placeholder={t({ ar: "الحالة، المصدر، شروط الاستلام…", fr: "État, provenance, conditions d'enlèvement…", en: "Condition, origin, collection terms…" })} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t({ ar: "الصنف", fr: "Catégorie", en: "Category" })} htmlFor="p-cat">
                  <select id="p-cat" className={field} value={d.category} onChange={(e) => setD((p) => ({ ...p, category: e.target.value, subcategory: "" }))}>
                    <option value="">{choose}</option>
                    {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{t(c.name)}</option>)}
                  </select>
                </Field>
                <Field label={t({ ar: "الصنف الفرعي", fr: "Sous-catégorie", en: "Subcategory" })} htmlFor="p-sub">
                  <select id="p-sub" className={field} value={d.subcategory} disabled={!cat} onChange={(e) => set("subcategory", e.target.value)}>
                    <option value="">{choose}</option>
                    {cat?.subcategories.map((s) => <option key={s} value={s}>{t(subcategoryLabel(s))}</option>)}
                  </select>
                </Field>
                <Field label={t({ ar: "الولاية", fr: "Gouvernorat", en: "Governorate" })} htmlFor="p-gov">
                  <select id="p-gov" className={field} value={d.governorate} onChange={(e) => set("governorate", e.target.value)}>
                    <option value="">{choose}</option>
                    {GOVERNORATES.map((g) => <option key={g} value={g}>{t(governorateLabel(g))}</option>)}
                  </select>
                </Field>
                <Field label={t({ ar: "المدينة / المعتمدية", fr: "Ville / délégation", en: "Town / delegation" })} htmlFor="p-city">
                  <input id="p-city" className={field} value={d.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
              </div>
              {d.category === "vehicules" && (
                <p className="rounded-md border border-brass/50 bg-brass/10 p-3 text-sm">
                  {t({ ar: "العربات: لازم إثبات ملكية (البطاقة الرمادية) قبل ما الإعلان يتنشر.", fr: "Véhicules : une preuve de propriété (carte grise) sera demandée avant la mise en ligne.", en: "Vehicles: proof of ownership (registration) is required before going live." })}
                </p>
              )}
              <div>
                <p className="text-sm font-medium">{t({ ar: "التصاور", fr: "Photos", en: "Photos" })} ({d.photos.length}/12)</p>
                <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {d.photos.map((p, i) => (
                    <div key={p} className="relative aspect-square overflow-hidden rounded-md border border-border">
                      <img src={p} alt={`${t({ ar: "تصويرة", fr: "Photo", en: "Photo" })} ${i + 1}`} className="size-full object-cover" />
                      <button type="button" aria-label={t({ ar: "نحّي", fr: "Retirer", en: "Remove" })} onClick={() => set("photos", d.photos.filter((x) => x !== p))} className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-charcoal/80 text-on-dark">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  {d.photos.length < 12 && (
                    <label className="grid aspect-square cursor-pointer place-items-center rounded-md border-2 border-dashed border-border text-muted-foreground transition hover:border-rust hover:text-rust">
                      <ImagePlus className="size-6" />
                      <span className="sr-only">{t({ ar: "زيد تصاور", fr: "Ajouter des photos", en: "Add photos" })}</span>
                      <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-3">
              {SALE_MODES.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => set("saleType", o.id)}
                  aria-pressed={d.saleType === o.id}
                  className={cn("rounded-xl border-2 p-5 text-start transition", d.saleType === o.id ? "border-rust bg-rust/5" : "border-border hover:border-rust/50")}
                >
                  <o.icon className={cn("size-7", d.saleType === o.id ? "text-rust" : "text-brass")} />
                  <h3 className="mt-3 text-lg font-semibold">{t(SALE_TYPE_LABEL[o.id])}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(o.text)}</p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6">
              <div>
                <p className="text-sm font-medium">{t({ ar: "وحدة البيع", fr: "Unité de vente", en: "Sale unit" })}</p>
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
                    <Field label={`${t({ ar: "سعر الانطلاق", fr: "Prix de départ", en: "Start price" })} (${t({ ar: "د.ت", fr: "DT", en: "TND" })}${d.unit === "piece" ? "" : ` / ${unit.short}`})`} htmlFor="p-start"><input id="p-start" type="number" min={0} className={field} value={d.startPrice} onChange={(e) => set("startPrice", e.target.value)} /></Field>
                    <Field label={t({ ar: "أدنى سعر للبيع (اختياري)", fr: "Prix minimum de vente (facultatif)", en: "Reserve price (optional)" })} htmlFor="p-res" hint={t({ ar: "المشترين ما يشوفوهش.", fr: "Non visible par les acheteurs.", en: "Not shown to buyers." })}><input id="p-res" type="number" min={0} className={field} value={d.reservePrice} onChange={(e) => set("reservePrice", e.target.value)} /></Field>
                    <Field label={t({ ar: "أدنى زيادة (د.ت)", fr: "Incrément minimum (DT)", en: "Minimum increment (TND)" })} htmlFor="p-inc"><input id="p-inc" type="number" min={1} className={field} value={d.increment} onChange={(e) => set("increment", e.target.value)} /></Field>
                    <div />
                    <Field label={t({ ar: "البداية", fr: "Début", en: "Start" })} htmlFor="p-sa"><input id="p-sa" type="datetime-local" className={field} value={d.startAt} onChange={(e) => set("startAt", e.target.value)} /></Field>
                    <Field label={t({ ar: "النهاية", fr: "Fin", en: "End" })} htmlFor="p-ea"><input id="p-ea" type="datetime-local" className={field} value={d.endAt} onChange={(e) => set("endAt", e.target.value)} /></Field>
                  </>
                ) : (
                  <Field label={priceLabel} htmlFor="p-price"><input id="p-price" type="number" min={0} step="0.1" className={field} value={d.price} onChange={(e) => set("price", e.target.value)} /></Field>
                )}
                {d.unit !== "libre" && (
                  <Field
                    label={`${t({ ar: "الكمية المتوفرة", fr: "Quantité disponible", en: "Available quantity" })} (${unit.short})`}
                    htmlFor="p-stock"
                    hint={
                      d.unit === "kg"
                        ? t({ ar: "مثال 150 كغ — المشتري ينجم يطلب جزء منها.", fr: "Ex. 150 kg — l'acheteur pourra en demander une partie.", en: "E.g. 150 kg — buyers can request part of it." })
                        : d.unit === "tonne"
                          ? t({ ar: "نص الطن مقبول.", fr: "Les demi-tonnes sont acceptées.", en: "Half tonnes are accepted." })
                          : undefined
                    }
                  >
                    <input id="p-stock" type="number" min={0} step={unit.step} className={field} value={d.stock} onChange={(e) => set("stock", e.target.value)} />
                  </Field>
                )}
              </div>
              {d.saleType !== "enchere" && Number(d.price) > 0 && Number(d.stock) > 0 && (
                <p className="rounded-md bg-muted p-3 text-sm">
                  {t({ ar: "القيمة الجملية للمخزون:", fr: "Valeur totale du stock :", en: "Total stock value:" })} <span className="font-semibold">{dt(Number(d.price) * Number(d.stock))}</span>
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">{d.title}</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {summary.map(([k, v]) => (
                  <div key={k} className="rounded-md bg-muted/70 p-3">
                    <dt className="label-stamp text-[0.68rem] text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-muted-foreground">
                {t({ ar: "فريقنا يراجع الإعلان قبل ما يتنشر.", fr: "Votre annonce sera vérifiée par notre équipe avant publication.", en: "Our team will review your listing before it goes live." })}
              </p>
            </div>
          )}

          <div className="mt-8 flex justify-between gap-3 border-t border-border pt-6">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ChevronLeft className="rtl:rotate-180" /> {t({ ar: "السابق", fr: "Précédent", en: "Back" })}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="default" onClick={next}>{t({ ar: "التالي", fr: "Suivant", en: "Next" })} <ChevronRight className="rtl:rotate-180" /></Button>
            ) : (
              <Button
                variant="rust"
                onClick={() =>
                  toast(t({ ar: "الإعلان حاضر", fr: "Annonce prête", en: "Listing ready" }), {
                    description: t({
                      ar: "حفظ الإعلانات على الموقع باش يتحلّ في المرحلة الجاية.",
                      fr: "L'enregistrement des annonces en ligne ouvre à la prochaine étape.",
                      en: "Saving listings online opens in the next step.",
                    }),
                  })
                }
              >
                <Check /> {t({ ar: "انشر الإعلان", fr: "Publier l'annonce", en: "Publish listing" })}
              </Button>
            )}
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t({ ar: "تحب إعلانك يبان أكثر؟", fr: "Besoin de plus de visibilité ?", en: "Need more visibility?" })}{" "}
          <Link to="/services" className="text-rust hover:underline">{t({ ar: "اكتشف التبويست", fr: "Découvrez les boosts", en: "Discover boosts" })}</Link>
        </p>
      </div>
    </>
  );
}
