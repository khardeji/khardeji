import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { STATUS_BADGE } from "@/components/admin/Listings";
import { A, Confirm, Loading } from "@/components/admin/shared";
import { PageHeader } from "@/components/site/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { governorateLabel, LISTING_STATUS_LABEL, SALE_TYPE_LABEL, type ListingStatus } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { pageMeta, type Msg } from "@/lib/i18n";
import { deleteMyListing, getMyListings } from "@/lib/listings.functions";
import { UNIT_LABEL } from "@/lib/quantity";

export const Route = createFileRoute("/_authenticated/mes-annonces")({
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
  const fetchMine = useServerFn(getMyListings);
  const remove = useServerFn(deleteMyListing);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["me", "listings"], queryFn: () => fetchMine() });

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
        <div className="mb-6 flex justify-end">
          <Button asChild variant="rust"><Link to="/publier"><Plus /> {t({ ar: "انشر إعلان", fr: "Publier une annonce", en: "Post a listing" })}</Link></Button>
        </div>
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
                    </div>
                    <h2 className="mt-2 truncate text-lg font-semibold">{t(l.title)}</h2>
                    <p className="text-sm text-muted-foreground">
                      {dt(l.auction?.startPrice ?? l.price)} / {t(UNIT_LABEL[l.unit].short)} · {t(governorateLabel(l.governorate))}
                      {l.publishedAt && ` · ${date(l.publishedAt)}`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{t(STATUS_HELP[st])}</p>
                    {l.moderationNote && (
                      <p className="mt-2 rounded-md bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
                        {t({ ar: "سبب:", fr: "Motif :", en: "Reason:" })} {l.moderationNote}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 sm:flex-col">
                    {st === "approved" && (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/annonces/$id" params={{ id: l.id }}><ExternalLink /> {t({ ar: "شوف", fr: "Voir", en: "View" })}</Link>
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
    </>
  );
}
