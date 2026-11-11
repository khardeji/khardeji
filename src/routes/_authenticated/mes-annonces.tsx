import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, CheckCircle2, Edit3, ExternalLink, Flame, Gauge, Plus, Rocket, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { STATUS_BADGE } from "@/components/admin/Listings";
import { A, Confirm, Loading } from "@/components/admin/shared";
import { BoostDialog } from "@/components/site/BoostDialog";
import { EditListingDialog } from "@/components/site/EditListingDialog";
import { PageHeader } from "@/components/site/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { governorateLabel, LISTING_STATUS_LABEL, SALE_TYPE_LABEL, type Listing, type ListingStatus } from "@/data/catalog";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { pageMeta, type Msg } from "@/lib/i18n";
import { getEffectivePlan, PLAN_CONFIG } from "@/lib/listing-rules";
import { deleteMyListing, getMyListings, markListingSold } from "@/lib/listings.functions";
import { getMyOverview } from "@/lib/services.functions";
import { UNIT_LABEL } from "@/lib/quantity";

export const Route = createFileRoute("/_authenticated/mes-annonces")({
  ssr: false,
  head: ({ match }) => ({
    meta: [
      ...pageMeta(match.context.locale, {
        title: { ar: "إعلاناتي | خردجي", fr: "Mes annonces | Khardeji", en: "My listings | Khardeji" },
        description: {
          ar: "تابع حالة الإعلانات متاعك في خردجي: في انتظار المراجعة، منشورة ولا مرفوضة.",
          fr: "Suivez l'état de vos annonces Khardeji : en attente, en ligne ou refusées.",
          en: "Track your Khardeji listings: awaiting review, live or rejected.",
        },
        card: "summary",
      }),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyListings,
});

const STATUS_HELP: Record<ListingStatus, Msg> = {
  pending: { ar: "فريقنا باش يراجعو قريب.", fr: "Notre équipe va la vérifier sous peu.", en: "Our team will review it shortly." },
  approved: { ar: "الإعلان ظاهر للناس الكل.", fr: "Visible par tous les visiteurs.", en: "Visible to all visitors." },
  rejected: { ar: "الإعلان ما تقبلش.", fr: "L'annonce n'a pas été acceptée.", en: "The listing was not accepted." },
  hidden: { ar: "الإعلان مخفي من الإدارة.", fr: "L'annonce a été masquée par l'administration.", en: "The listing was hidden by the administrators." },
  sold: { ar: "تباع — ما عادش يبان.", fr: "Vendue — n'apparaît plus.", en: "Sold — no longer shown." },
};

function MyListings() {
  const { t, dt, date } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const fetchMine = useServerFn(getMyListings);
  const fetchOverview = useServerFn(getMyOverview);
  const remove = useServerFn(deleteMyListing);
  const markSold = useServerFn(markListingSold);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["me", "listings"], queryFn: () => fetchMine(), enabled: !!user, retry: false });
  const overviewQuery = useQuery({ queryKey: ["me", "overview"], queryFn: () => fetchOverview(), enabled: !!user });
  const effectivePlan = getEffectivePlan(overviewQuery.data?.subscriptionPlan, overviewQuery.data?.subscriptionExpiresAt);
  const planLimits = PLAN_CONFIG[effectivePlan] ?? PLAN_CONFIG.basique;
  const activeCount = (overviewQuery.data?.listingsCount.approved ?? 0) + (overviewQuery.data?.listingsCount.pending ?? 0);
  const isLimitReached = !overviewQuery.isLoading && activeCount >= planLimits.maxListings;

  const [boostListingId, setBoostListingId] = useState<string | undefined>();
  const [boostOpen, setBoostOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  async function handleMarkSold(id: string) {
    const res = await markSold({ data: { id } }).catch(() => ({ ok: false as const }));
    if (res.ok) {
      toast.success(
        t({
          ar: "تم تحديد الإعلان كمباع! لم يعد يظهر على الموقع.",
          fr: "Annonce marquée comme vendue ! Elle n'apparaît plus sur le site public.",
          en: "Listing marked as sold! It is no longer visible on the site.",
        })
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["me", "listings"] }),
        qc.invalidateQueries({ queryKey: ["me", "overview"] }),
        qc.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
    } else {
      toast.error(t({ ar: "فشل تحديث حالة الإعلان.", fr: "Échec de l'opération.", en: "Failed to mark as sold." }));
    }
  }

  async function del(id: string) {
    const res = await remove({ data: { id } }).catch(() => ({ ok: false as const }));
    if (res.ok) {
      toast.success(t({ ar: "الإعلان تفسخ.", fr: "Annonce supprimée.", en: "Listing deleted." }));
      await Promise.all([qc.invalidateQueries({ queryKey: ["me", "listings"] }), qc.invalidateQueries({ queryKey: ["catalog"] })]);
    } else toast.error(t(A.failed));
  }

  return (
    <>
      <PageHeader
        eyebrow={t({ ar: "حسابي", fr: "Mon compte", en: "My account" })}
        title={t({ ar: "إعلاناتي", fr: "Mes annonces", en: "My listings" })}
        intro={t({ ar: "كل إعلان جديد يتراجع من فريقنا قبل ما يتنشر.", fr: "Chaque nouvelle annonce est vérifiée par notre équipe avant d'être mise en ligne.", en: "Every new listing is reviewed by our team before it goes live." })}
      />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-wrap justify-between items-center gap-3">
          <Button asChild variant="outline">
            <Link to="/tableau-de-bord">
              <Gauge className="size-4" /> {t({ ar: "لوحة التحكم", fr: "Tableau de bord membre", en: "Dashboard" })}
            </Link>
          </Button>
          <Button asChild variant={isLimitReached ? "outline" : "rust"}><Link to="/publier"><Plus /> {t({ ar: "انشر إعلان", fr: "Publier une annonce", en: "Post a listing" })}</Link></Button>
        </div>

        {isLimitReached && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-rust/30 bg-rust/10 p-4 text-sm text-foreground">
            <div>
              <p className="font-semibold text-rust">
                {t({
                  ar: `وصلت للحدّ الأقصى للإعلانات في باقتك (${activeCount} / ${planLimits.maxListings})`,
                  fr: `Limite d'annonces atteinte (${activeCount} / ${planLimits.maxListings}) pour votre forfait ${t(planLimits.name)}`,
                  en: `Listing limit reached (${activeCount} / ${planLimits.maxListings}) for your plan`,
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t({
                  ar: "باش تنشر إعلانات جديدة، رقّي حسابك لـ Pro (50 إعلان و40 نقطة) ولا Entreprise (غير محدود).",
                  fr: "Passez au forfait Pro Ferrailleur (50 annonces, 40 jetons offerts chaque mois) ou Entreprise (illimité, 150 jetons) pour publier plus.",
                  en: "Upgrade to Pro (50 listings, 40 tokens/mo) or Enterprise (unlimited) to post more.",
                })}
              </p>
            </div>
            <Button asChild size="sm" variant="rust" className="shrink-0 text-xs">
              <Link to="/services">
                {t({ ar: "ترقية الباقة", fr: "Passer en Pro", en: "Upgrade" })}
              </Link>
            </Button>
          </div>
        )}
        {!q.data ? (
          <Loading error={q.isError} />
        ) : q.data.length === 0 ? (
          <div className="surface-card p-10 text-center">
            <p className="text-lg font-medium">{t({ ar: "ما عندكش حتى إعلان للتوّ.", fr: "Vous n'avez pas encore d'annonce.", en: "You have no listings yet." })}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t({ ar: "انشر أوّل إعلان متاعك في أربع مراحل.", fr: "Publiez votre première annonce en quatre étapes.", en: "Post your first listing in four steps." })}</p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {q.data.map((l) => {
              const st = l.status ?? "pending";
              return (
                <li key={l.id} className="surface-card flex flex-col gap-4 p-4 sm:flex-row">
                  <img src={l.images[0]} alt="" className="h-32 w-full shrink-0 rounded-md object-cover sm:h-24 sm:w-32" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={STATUS_BADGE[st]}>{t(LISTING_STATUS_LABEL[st])}</Badge>
                      <Badge variant="outline">{t(SALE_TYPE_LABEL[l.saleType])}</Badge>
                      {l.urgent && (
                        <Badge variant="destructive" className="bg-rust text-white text-[0.65rem] gap-1 px-1.5 py-0 font-medium">
                          <Flame className="size-3" /> {t({ ar: "مستعجل", fr: "Urgent", en: "Urgent" })}
                        </Badge>
                      )}
                      {l.featured && (
                        <Badge className="bg-brass text-brass-foreground font-semibold text-[0.65rem] gap-1 px-1.5 py-0">
                          <BadgeCheck className="size-3" /> {t({ ar: "في الواجهة", fr: "À la une", en: "Featured" })}
                        </Badge>
                      )}
                      {l.boostedAt && (
                        <Badge variant="outline" className="border-olive text-olive text-[0.65rem] gap-1 px-1.5 py-0">
                          <Rocket className="size-3" /> {t({ ar: "تم ترويجها", fr: "Remontée", en: "Bumped" })}
                        </Badge>
                      )}
                    </div>
                    <h2 className="mt-2 truncate text-lg font-semibold">{t(l.title)}</h2>
                    <p className="text-sm text-muted-foreground">
                      {dt(l.auction?.startPrice ?? l.price)} / {UNIT_LABEL[l.unit as keyof typeof UNIT_LABEL] ? t(UNIT_LABEL[l.unit as keyof typeof UNIT_LABEL].short) : (l.unit || "pièce")} · {t(governorateLabel(l.governorate))}
                      {l.publishedAt && ` · ${date(l.publishedAt)}`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{t(STATUS_HELP[st])}</p>
                    {l.moderationNote && (
                      <p className="mt-2 rounded-md bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
                        {t({ ar: "سبب:", fr: "Motif :", en: "Reason:" })} {l.moderationNote}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:flex-col">
                    {st === "approved" && (
                      <>
                        <Button
                          size="sm"
                          variant="rust"
                          className="gap-1.5"
                          onClick={() => {
                            setBoostListingId(l.id);
                            setBoostOpen(true);
                          }}
                        >
                          <Rocket className="size-3.5" /> {t({ ar: "ترويج", fr: "Booster", en: "Boost" })}
                        </Button>
                        <Confirm
                          title={{ ar: "تحديد كمباع ؟", fr: "Marquer comme vendue ?", en: "Mark as sold?" }}
                          message={{
                            ar: "هل تم بيع هذا المنتوج؟ لن يظهر الإعلان بعد ذلك على الموقع العام.",
                            fr: "Ce produit a-t-il été vendu ? L'annonce n'apparaîtra plus sur le site public.",
                            en: "Has this product been sold? It will no longer appear on the public site.",
                          }}
                          confirmLabel={t({ ar: "تأكيد البيع", fr: "Confirmer la vente", en: "Confirm sold" })}
                          variant="rust"
                          onConfirm={() => void handleMarkSold(l.id)}
                          trigger={
                            <Button size="sm" variant="outline" className="gap-1 text-olive border-olive/30 hover:bg-olive/10">
                              <CheckCircle2 className="size-3.5" /> {t({ ar: "تم البيع", fr: "Vendue", en: "Sold" })}
                            </Button>
                          }
                        />
                        <Button asChild size="sm" variant="outline">
                          <Link to="/annonces/$id" params={{ id: l.id }}><ExternalLink /> {t({ ar: "شوف", fr: "Voir", en: "View" })}</Link>
                        </Button>
                      </>
                    )}
                    {st !== "sold" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => setEditingListing(l)}
                      >
                        <Edit3 className="size-3.5" /> {t({ ar: "تعديل", fr: "Modifier", en: "Edit" })}
                      </Button>
                    )}
                    <Confirm
                      onConfirm={() => void del(l.id)}
                      trigger={<Button size="sm" variant="ghost" className="text-destructive"><Trash2 /> {t(A.delete)}</Button>}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BoostDialog
        initialListingId={boostListingId}
        open={boostOpen}
        onClose={() => setBoostOpen(false)}
      />

      <EditListingDialog
        listing={editingListing}
        open={!!editingListing}
        onClose={() => setEditingListing(null)}
        onSuccess={() => void qc.invalidateQueries({ queryKey: ["me", "listings"] })}
      />
    </>
  );
}
