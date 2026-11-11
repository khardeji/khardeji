import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Building2, Check, ChevronLeft, ChevronRight, Coins, Flame, Gavel, HandCoins, Home, ImagePlus, Loader2, Rocket, ShieldAlert, Tag, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/site/SectionHeading";
import { SubscribePlanDialog } from "@/components/site/ServiceOrderDialogs";
import { governorateLabel, GOVERNORATES, SALE_TYPE_LABEL, subcategoryLabel, type SaleType } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { PHOTO_BUCKET } from "@/lib/catalog-map";
import { catalogQuery, useCatalog } from "@/lib/catalog-queries";
import { getEffectivePlan, MAX_PHOTOS, PLAN_CONFIG, type ListingProblem } from "@/lib/listing-rules";
import { createListing } from "@/lib/listings.functions";
import { pageMeta, type Msg } from "@/lib/i18n";
import { UNIT_LABEL, type SaleUnit } from "@/lib/quantity";
import { getMyOverview } from "@/lib/services.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/publier")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
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
  photos: { file: File; url: string }[];
  saleType: SaleType;
  unit: SaleUnit;
  price: string;
  stock: string;
  startPrice: string;
  reservePrice: string;
  increment: string;
  startAt: string;
  endAt: string;
  urgent: boolean;
  featured: boolean;
}

const EMPTY: Draft = {
  title: "", description: "", category: "", subcategory: "", governorate: "", city: "", photos: [],
  saleType: "fixe", unit: "kg", price: "", stock: "", startPrice: "", reservePrice: "", increment: "50", startAt: "", endAt: "",
  urgent: false, featured: false,
};

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

const PROBLEM_MSG: Record<ListingProblem | "blocked" | "failed" | "upload", Msg> = {
  title: { ar: "العنوان لازم يكون بين 5 و90 حرف.", fr: "Le titre doit contenir entre 5 et 90 caractères.", en: "The title must be 5 to 90 characters." },
  category: { ar: "اختار صنف وصنف فرعي.", fr: "Choisissez une catégorie et une sous-catégorie.", en: "Choose a category and subcategory." },
  governorate: { ar: "اختار الولاية.", fr: "Choisissez un gouvernorat.", en: "Choose a governorate." },
  photos: { ar: "فمّا مشكل في التصاور (12 على الأكثر).", fr: "Problème avec les photos (12 maximum).", en: "Problem with the photos (12 maximum)." },
  sale: { ar: "طريقة البيع ولا الوحدة غالطة.", fr: "Type de vente ou unité invalide.", en: "Invalid sale type or unit." },
  price: { ar: "اكتب السعر.", fr: "Indiquez un prix.", en: "Enter a price." },
  start_price: { ar: "اكتب سعر الانطلاق.", fr: "Indiquez un prix de départ.", en: "Enter a start price." },
  increment: { ar: "اكتب أدنى زيادة.", fr: "Indiquez un incrément minimum.", en: "Enter a minimum increment." },
  dates: { ar: "تاريخ النهاية لازم يكون بعد تاريخ البداية.", fr: "La date de fin doit suivre la date de début.", en: "The end date must be after the start date." },
  stock: { ar: "اكتب الكمية المتوفرة.", fr: "Indiquez la quantité disponible.", en: "Enter the available quantity." },
  insufficient_tokens: { ar: "رصيد النقاط غير كافٍ لخيارات الترويج المختارة. اشري نقاط من صفحة الخدمات.", fr: "Solde de jetons insuffisant pour les options de boost. Rechargez sur la page Services.", en: "Insufficient tokens for the chosen boosts. Buy tokens on Services page." },
  plan_limit_reached: {
    ar: "وصلت للحدّ الأقصى للإعلانات في باقتك الحالية. رقّي حسابك لـ Pro ولا Entreprise باش تنشر إعلانات جديدة.",
    fr: "Limite d'annonces atteinte pour votre offre actuelle. Passez à une offre Pro ou Entreprise pour continuer à publier.",
    en: "Listing limit reached for your current plan. Upgrade to Pro or Enterprise to post more listings.",
  },
  blocked: { ar: "حسابك مسكّر: ما تنجمش تنشر إعلانات. اتصل بالإدارة.", fr: "Votre compte est bloqué : vous ne pouvez pas publier. Contactez l'administration.", en: "Your account is blocked: you can't post. Contact the administrators." },
  failed: { ar: "ما نجمناش نسجّلو الإعلان. عاود جرّب.", fr: "L'annonce n'a pas pu être enregistrée. Réessayez.", en: "The listing could not be saved. Try again." },
  upload: { ar: "ما نجمناش نرفعو التصاور. ثبّت في الكونكسيون وعاود.", fr: "L'envoi des photos a échoué. Vérifiez votre connexion et réessayez.", en: "Photo upload failed. Check your connection and try again." },
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
  const [busy, setBusy] = useState(false);
  const { categories: CATEGORIES } = useCatalog();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createListingFn = useServerFn(createListing);
  const fetchOverview = useServerFn(getMyOverview);
  const { data: overview, isLoading: loadingOverview } = useQuery({ queryKey: ["me", "overview"], queryFn: () => fetchOverview() });
  const [subscribingPlan, setSubscribingPlan] = useState<{ id: "pro" | "entreprise"; name: Msg; price: number } | null>(null);

  const effectivePlan = getEffectivePlan(overview?.subscriptionPlan, overview?.subscriptionExpiresAt);
  const planLimits = PLAN_CONFIG[effectivePlan] ?? PLAN_CONFIG.basique;
  const activeCount = (overview?.listingsCount.approved ?? 0) + (overview?.listingsCount.pending ?? 0);
  const isLimitReached = !loadingOverview && activeCount >= planLimits.maxListings;
  const currentTokens = overview?.tokensBalance ?? 0;

  const boostCost = (d.urgent ? 3 : 0) + (d.featured ? 15 : 0);
  const hasEnoughTokens = currentTokens >= boostCost;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const cat = CATEGORIES.find((c) => c.slug === d.category);
  const uObj = UNIT_LABEL[d.unit] || UNIT_LABEL.piece;
  const unit = { step: uObj.step, short: t(uObj.short), long: t(uObj.long) };
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
    const all = Array.from(files);
    const maxPhotos = planLimits.maxPhotos;
    const ok = all.filter((f) => f.type.startsWith("image/") && f.size <= MAX_PHOTO_BYTES).slice(0, maxPhotos - d.photos.length);
    if (ok.length < all.length) {
      toast.error(
        t({
          ar: `بعض التصاور ما تزادوش: تصاور برك، 8 ميغا على الأكثر، و${maxPhotos} في الجملة.`,
          fr: `Certaines photos ont été ignorées : images uniquement, 8 Mo max, ${maxPhotos} au total.`,
          en: `Some photos were skipped: images only, 8 MB max, ${maxPhotos} in total.`,
        }),
      );
    }
    set("photos", [...d.photos, ...ok.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  function removePhoto(url: string) {
    URL.revokeObjectURL(url);
    set("photos", d.photos.filter((x) => x.url !== url));
  }

  async function publish() {
    if (isLimitReached) {
      toast.error(t(PROBLEM_MSG.plan_limit_reached));
      return;
    }
    for (const s of [0, 2]) {
      const err = validate(s);
      if (err) {
        toast.error(t(err));
        setStep(s);
        return;
      }
    }
    setBusy(true);
    const uploaded: string[] = [];
    const cleanup = () => (uploaded.length ? supabase.storage.from(PHOTO_BUCKET).remove(uploaded) : Promise.resolve());
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate({ to: "/connexion", search: { redirect: "/publier", raison: "publier" } });
        return;
      }
      for (const p of d.photos) {
        const ext = (p.file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
        const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, p.file, { contentType: p.file.type, upsert: false });
        if (error) {
          console.error("Erreur lors de l'envoi de la photo :", error);
          await cleanup();
          toast.error(t(PROBLEM_MSG.upload));
          return;
        }
        uploaded.push(path);
      }
      const auction = d.saleType === "enchere";
      const res = await createListingFn({
        data: {
          title: d.title.trim(),
          description: d.description.trim(),
          category: d.category,
          subcategory: d.subcategory,
          governorate: d.governorate,
          city: d.city.trim(),
          photos: uploaded,
          saleType: d.saleType,
          unit: d.unit,
          price: auction ? 0 : Number(d.price),
          stock: d.unit === "libre" ? 0 : Number(d.stock),
          startPrice: auction ? Number(d.startPrice) : 0,
          reservePrice: auction && Number(d.reservePrice) > 0 ? Number(d.reservePrice) : null,
          increment: auction ? Number(d.increment) : 0,
          startAt: auction ? new Date(d.startAt).toISOString() : "",
          endAt: auction ? new Date(d.endAt).toISOString() : "",
          urgent: d.urgent,
          featured: d.featured,
        },
      });
      if (!res.ok) {
        await cleanup();
        toast.error(t(PROBLEM_MSG[res.error]));
        return;
      }
      d.photos.forEach((p) => URL.revokeObjectURL(p.url));
      await qc.invalidateQueries({ queryKey: ["me", "listings"] });
      toast.success(t({ ar: "الإعلان تبعث للمراجعة", fr: "Annonce envoyée pour validation", en: "Listing sent for review" }), {
        description: t({ ar: "باش يتنشر كي فريقنا يقبلو.", fr: "Elle sera en ligne dès que notre équipe l'aura validée.", en: "It goes live once our team approves it." }),
      });
      navigate({ to: "/mes-annonces" });
    } catch {
      await cleanup();
      toast.error(t(PROBLEM_MSG.failed));
    } finally {
      setBusy(false);
    }
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
        {isLimitReached ? (
          <div className="surface-card overflow-hidden p-6 sm:p-10 text-center ring-1 ring-rust/30">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-rust/15 text-rust">
              <ShieldAlert className="size-8" />
            </span>
            <h2 className="mt-4 font-display text-2xl sm:text-3xl font-bold text-foreground">
              {t({
                ar: `وصلت للحدّ الأقصى للإعلانات (${activeCount} / ${planLimits.maxListings})`,
                fr: `Limite d'annonces atteinte (${activeCount} / ${planLimits.maxListings})`,
                en: `Listing limit reached (${activeCount} / ${planLimits.maxListings})`,
              })}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm sm:text-base text-muted-foreground">
              {t({
                ar: `باقتك الحالية (${t(planLimits.name)}) تسمح لك بنشر حتى ${planLimits.maxListings} إعلانات نشيطة. عندك حالياً ${overview?.listingsCount.approved ?? 0} مباشر و${overview?.listingsCount.pending ?? 0} في الانتظار. باش تنشر أكثر، لازم ترقّي باقتك.`,
                fr: `Votre forfait actuel (${t(planLimits.name)}) vous permet de publier jusqu'à ${planLimits.maxListings} annonces actives. Vous en avez actuellement ${overview?.listingsCount.approved ?? 0} en ligne et ${overview?.listingsCount.pending ?? 0} en attente de validation. Pour continuer à publier, passez à un forfait supérieur.`,
                en: `Your current plan (${t(planLimits.name)}) allows up to ${planLimits.maxListings} active listings. You currently have ${overview?.listingsCount.approved ?? 0} live and ${overview?.listingsCount.pending ?? 0} pending review. To post more, upgrade your plan.`,
              })}
            </p>

            {/* Upgrade offers */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 text-start">
              {/* Pro Ferrailleur */}
              <div className="surface-card relative flex flex-col justify-between rounded-xl border-2 border-rust bg-card p-6 shadow-sm">
                <div>
                  <span className="label-stamp rounded bg-rust px-2 py-0.5 text-[0.62rem] text-rust-foreground">
                    {t({ ar: "الموصى به للمحترفين", fr: "Recommandé pour les pros", en: "Recommended for pros" })}
                  </span>
                  <h3 className="mt-2 text-xl font-bold text-foreground flex items-center gap-1.5">
                    Pro Ferrailleur <BadgeCheck className="size-5 text-rust" />
                  </h3>
                  <p className="mt-2 font-display text-3xl font-bold text-foreground">
                    49 DT <span className="text-xs font-normal text-muted-foreground">/ {t({ ar: "شهر", fr: "mois", en: "month" })}</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-olive shrink-0" />
                      <strong className="text-rust">50 {t({ ar: "إعلانات نشيطة", fr: "annonces actives", en: "active listings" })}</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-olive shrink-0" />
                      <strong>40 {t({ ar: "نقطة هدية كل شهر", fr: "jetons offerts chaque mois", en: "free monthly tokens" })}</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-olive shrink-0" />
                      {t({ ar: "علامة بائع محترف", fr: "Badge vendeur professionnel", en: "Pro seller badge" })}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-olive shrink-0" />
                      {t({ ar: "إحصائيات المشاهدة وتسيير المخزون", fr: "Statistiques & gestion des stocks", en: "View stats & stock" })}
                    </li>
                  </ul>
                </div>
                <Button
                  variant="rust"
                  className="mt-6 w-full"
                  onClick={() =>
                    setSubscribingPlan({
                      id: "pro",
                      name: { ar: "محترف خردة", fr: "Pro Ferrailleur", en: "Scrap Pro" },
                      price: 49,
                    })
                  }
                >
                  <Rocket className="size-4" />
                  {t({ ar: "اختيار Pro Ferrailleur (49 DT)", fr: "Choisir Pro Ferrailleur (49 DT)", en: "Choose Scrap Pro (49 DT)" })}
                </Button>
              </div>

              {/* Entreprise */}
              <div className="surface-card relative flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm">
                <div>
                  <span className="label-stamp rounded bg-charcoal px-2 py-0.5 text-[0.62rem] text-brass">
                    {t({ ar: "للشركات", fr: "Entreprises", en: "Enterprise" })}
                  </span>
                  <h3 className="mt-2 text-xl font-bold text-foreground flex items-center gap-1.5">
                    Entreprise <Building2 className="size-5 text-olive" />
                  </h3>
                  <p className="mt-2 font-display text-3xl font-bold text-foreground">
                    149 DT <span className="text-xs font-normal text-muted-foreground">/ {t({ ar: "شهر", fr: "mois", en: "month" })}</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-olive shrink-0" />
                      <strong className="text-olive">{t({ ar: "إعلانات غير محدودة", fr: "Annonces illimitées", en: "Unlimited listings" })}</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-olive shrink-0" />
                      <strong className="text-rust">{t({ ar: "حانوت / بوتيك باسمك", fr: "Boutique à votre nom", en: "Branded shop" })}</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-olive shrink-0" />
                      <strong>150 {t({ ar: "نقطة هدية كل شهر", fr: "jetons offerts chaque mois", en: "free monthly tokens" })}</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-olive shrink-0" />
                      {t({ ar: "حسابات متعددة ومرافقة خاصة", fr: "Multi-comptes & accompagnement dédié", en: "Team accounts & dedicated support" })}
                    </li>
                  </ul>
                </div>
                <Button
                  variant="default"
                  className="mt-6 w-full"
                  onClick={() =>
                    setSubscribingPlan({
                      id: "entreprise",
                      name: { ar: "شركة", fr: "Entreprise", en: "Business" },
                      price: 149,
                    })
                  }
                >
                  <Building2 className="size-4" />
                  {t({ ar: "اختيار باقة Entreprise (149 DT)", fr: "Choisir Entreprise (149 DT)", en: "Choose Enterprise (149 DT)" })}
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
              <Button asChild variant="outline" size="sm">
                <Link to="/mes-annonces">
                  {t({ ar: "إدارة إعلاناتي الحالية", fr: "Gérer mes annonces existantes", en: "Manage my current listings" })}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/services">
                  {t({ ar: "مقارنة كافة العروض والخدمات", fr: "Comparer toutes les offres", en: "Compare all plans" })}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
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
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card/60 p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span>{t({ ar: "الباقة الحالية :", fr: "Forfait actuel :", en: "Current plan:" })}</span>
                  <span className="font-semibold uppercase text-foreground">{t(planLimits.name)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>{t({ ar: "الإعلانات النشيطة :", fr: "Annonces actives :", en: "Active listings:" })}</span>
                  <span className={cn("font-bold", activeCount >= planLimits.maxListings ? "text-rust" : "text-foreground")}>
                    {activeCount} / {planLimits.maxListings < 9999 ? planLimits.maxListings : "∞"}
                  </span>
                </div>
              </div>

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
                <p className="text-sm font-medium">{t({ ar: "التصاور", fr: "Photos", en: "Photos" })} ({d.photos.length}/{planLimits.maxPhotos})</p>
                <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {d.photos.map((p, i) => (
                    <div key={p.url} className="relative aspect-square overflow-hidden rounded-md border border-border">
                      <img src={p.url} alt={`${t({ ar: "تصويرة", fr: "Photo", en: "Photo" })} ${i + 1}`} className="size-full object-cover" />
                      <button type="button" aria-label={t({ ar: "نحّي", fr: "Retirer", en: "Remove" })} onClick={() => removePhoto(p.url)} className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-charcoal/80 text-on-dark">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  {d.photos.length < planLimits.maxPhotos && (
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
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">{d.title}</h2>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  {summary.map(([k, v]) => (
                    <div key={k} className="rounded-md bg-muted/70 p-3">
                      <dt className="label-stamp text-[0.68rem] text-muted-foreground">{k}</dt>
                      <dd className="mt-0.5 font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Visibility Boost options */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                      <BadgeCheck className="size-4 text-rust" />
                      {t({ ar: "خيارات الترويج والظهور (اختياري)", fr: "Options de visibilité & Boost (facultatif)", en: "Visibility & Boost options (optional)" })}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t({ ar: "استعمل رصيدك من النقاط لجلب مشاهدات أكثر فور قبول الإعلان.", fr: "Utilisez vos jetons pour maximiser vos contacts dès la validation.", en: "Use tokens to maximize views upon approval." })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    <Coins className="size-3.5 text-brass" />
                    <span>{t({ ar: "رصيدك:", fr: "Votre solde :", en: "Your balance:" })}</span>
                    <strong className="text-rust">{num(currentTokens)} {t({ ar: "نقطة", fr: "jetons", en: "tokens" })}</strong>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 p-3 transition hover:bg-muted/40 has-[[data-state=checked]]:border-rust has-[[data-state=checked]]:bg-rust/5">
                    <Checkbox
                      checked={d.urgent}
                      onCheckedChange={(c) => set("urgent", Boolean(c))}
                      className="mt-0.5"
                    />
                    <div className="flex-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-semibold text-foreground">
                          <Flame className="size-4 text-rust" />
                          {t({ ar: "إعلان مستعجل", fr: "Annonce urgente", en: "Urgent listing" })}
                        </span>
                        <span className="rounded bg-brass/20 px-2 py-0.5 text-xs font-bold text-brass-foreground">+3 {t({ ar: "نقاط", fr: "jetons", en: "tokens" })}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t({ ar: "علامة «مستعجل» تبان على البطاقة للفت انتباه المشترين.", fr: "Badge « Urgent » visible sur la carte et la fiche pour attirer l'attention.", en: "Urgent badge visible to catch buyers' attention." })}
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 p-3 transition hover:bg-muted/40 has-[[data-state=checked]]:border-rust has-[[data-state=checked]]:bg-rust/5">
                    <Checkbox
                      checked={d.featured}
                      onCheckedChange={(c) => set("featured", Boolean(c))}
                      className="mt-0.5"
                    />
                    <div className="flex-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-semibold text-foreground">
                          <Home className="size-4 text-brass" />
                          {t({ ar: "في الواجهة — الصفحة الرئيسية", fr: "À la une — Page d'accueil", en: "Featured — Home page" })}
                        </span>
                        <span className="rounded bg-brass/20 px-2 py-0.5 text-xs font-bold text-brass-foreground">+15 {t({ ar: "نقطة", fr: "jetons", en: "tokens" })}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t({ ar: "يظهر في اختيارات الصفحة الرئيسية لمدّة 3 أيام.", fr: "Affichage dans la sélection en vedette de la page d'accueil pendant 3 jours.", en: "Shown on homepage featured section for 3 days." })}
                      </p>
                    </div>
                  </label>
                </div>

                {boostCost > 0 && !hasEnoughTokens && (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    <span>
                      {t({
                        ar: `يلزمك ${boostCost} نقطة (رصيدك الحالي: ${currentTokens}). يرجى شراء نقاط أو إلغاء الخيار.`,
                        fr: `Coût : ${boostCost} jetons (votre solde : ${currentTokens}). Achetez des jetons ou décochez les options.`,
                        en: `Cost: ${boostCost} tokens (balance: ${currentTokens}). Please buy tokens or uncheck.`,
                      })}
                    </span>
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link to="/services" target="_blank">
                        {t({ ar: "شراء نقاط", fr: "Acheter des jetons", en: "Buy tokens" })}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {t({ ar: "فريقنا يراجع الإعلان قبل ما يتنشر.", fr: "Votre annonce sera vérifiée par notre équipe avant publication.", en: "Our team will review your listing before it goes live." })}
              </p>
            </div>
          )}

          <div className="mt-8 flex justify-between gap-3 border-t border-border pt-6">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
              <ChevronLeft className="rtl:rotate-180" /> {t({ ar: "السابق", fr: "Précédent", en: "Back" })}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="default" onClick={next}>{t({ ar: "التالي", fr: "Suivant", en: "Next" })} <ChevronRight className="rtl:rotate-180" /></Button>
            ) : (
              <Button variant="rust" disabled={busy || (boostCost > 0 && !hasEnoughTokens)} onClick={() => void publish()}>
                {busy ? <Loader2 className="animate-spin" /> : <Check />}
                {busy ? t({ ar: "قاعد يتبعث…", fr: "Envoi en cours…", en: "Sending…" }) : t({ ar: "انشر الإعلان", fr: "Publier l'annonce", en: "Publish listing" })}
              </Button>
            )}
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t({ ar: "تحب إعلانك يبان أكثر؟", fr: "Besoin de plus de visibilité ?", en: "Need more visibility?" })}{" "}
          <Link to="/services" className="text-rust hover:underline">{t({ ar: "اكتشف خدمات الترويج", fr: "Découvrez les boosts", en: "Discover boosts" })}</Link>
        </p>
        </>
      )}
      </div>

      <SubscribePlanDialog
        plan={subscribingPlan}
        open={!!subscribingPlan}
        onClose={() => setSubscribingPlan(null)}
      />
    </>
  );
}
