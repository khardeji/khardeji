import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  HandCoins,
  Mail,
  Phone,
  User,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Loading } from "@/components/admin/shared";
import { AccountNav } from "@/components/site/AccountNav";
import { PageHeader } from "@/components/site/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/hooks/use-i18n";
import { pageMeta } from "@/lib/i18n";
import { getIncomingOffers, getOutgoingOffers, respondToOffer } from "@/lib/marketplace.functions";
import { UNIT_LABEL } from "@/lib/quantity";

export const Route = createFileRoute("/_authenticated/mes-offres")({
  head: ({ match }) => ({
    meta: [
      ...pageMeta(match.context.locale, {
        title: { ar: "العروض | خردجي", fr: "Offres de prix | Khardeji", en: "Price offers | Khardeji" },
        description: {
          ar: "تسيير العروض الواردة والصادرة في خردجي.",
          fr: "Gérez vos offres de prix reçues et envoyées sur Khardeji.",
          en: "Manage incoming and submitted price offers on Khardeji.",
        },
        card: "summary",
      }),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const { t, dt, date } = useI18n();
  const qc = useQueryClient();

  const fetchIncoming = useServerFn(getIncomingOffers);
  const fetchOutgoing = useServerFn(getOutgoingOffers);
  const sendResponse = useServerFn(respondToOffer);

  const incomingQ = useQuery({ queryKey: ["me", "offers", "incoming"], queryFn: () => fetchIncoming() });
  const outgoingQ = useQuery({ queryKey: ["me", "offers", "outgoing"], queryFn: () => fetchOutgoing() });

  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const incoming = incomingQ.data ?? [];
  const outgoing = outgoingQ.data ?? [];
  const pendingIncoming = incoming.filter((o) => o.status === "pending").length;

  async function handleResponse(offerId: string, action: "accepted" | "rejected") {
    setBusyId(offerId);
    try {
      const res = await sendResponse({ data: { offerId, action } });
      if (res.ok) {
        toast.success(
          action === "accepted"
            ? t({ ar: "تم قبول العرض بنجاح", fr: "Offre acceptée avec succès", en: "Offer accepted successfully" })
            : t({ ar: "تم رفض العرض", fr: "Offre refusée", en: "Offer rejected" }),
        );
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["me", "offers"] }),
          qc.invalidateQueries({ queryKey: ["me", "notifications"] }),
        ]);
        if (selectedOffer?.id === offerId) {
          setSelectedOffer((prev: any) => (prev ? { ...prev, status: action } : null));
        }
      } else {
        toast.error(res.message || t({ ar: "فشلت العملية", fr: "Une erreur est survenue", en: "Action failed" }));
      }
    } catch {
      toast.error(t({ ar: "فشلت العملية", fr: "Une erreur est survenue", en: "Action failed" }));
    } finally {
      setBusyId(null);
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge variant="olive">{t({ ar: "مقبول", fr: "Acceptée", en: "Accepted" })}</Badge>;
      case "rejected":
        return <Badge variant="destructive">{t({ ar: "مرفوض", fr: "Refusée", en: "Rejected" })}</Badge>;
      case "expired":
        return <Badge variant="outline">{t({ ar: "منتهي", fr: "Expirée", en: "Expired" })}</Badge>;
      default:
        return <Badge variant="brass">{t({ ar: "في الانتظار", fr: "En attente", en: "Pending" })}</Badge>;
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t({ ar: "حسابي", fr: "Mon compte", en: "My account" })}
        title={t({ ar: "عروض التفاوض", fr: "Offres de négociation", en: "Price offers" })}
        intro={t({
          ar: "تابع وقبل عروض المشترين، وراقب حالة العروض اللي قدّمتها.",
          fr: "Consultez et répondez aux propositions des acheteurs et suivez vos offres envoyées.",
          en: "Review and respond to buyer proposals and track your submitted offers.",
        })}
      />
      <AccountNav current="offres" />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="incoming" className="relative">
              {t({ ar: "العروض الواردة", fr: "Offres reçues", en: "Incoming offers" })}
              {pendingIncoming > 0 && (
                <span className="ms-2 rounded-full bg-rust px-1.5 py-0.5 text-[0.7rem] font-bold text-rust-foreground">
                  {pendingIncoming}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing">
              {t({ ar: "عروضي المرسلة", fr: "Mes offres envoyées", en: "Sent offers" })}
            </TabsTrigger>
          </TabsList>

          {/* INCOMING OFFERS (SELLER) */}
          <TabsContent value="incoming">
            {incomingQ.isPending ? (
              <Loading />
            ) : incoming.length === 0 ? (
              <div className="surface-card flex flex-col items-center p-12 text-center">
                <HandCoins className="size-12 text-brass" />
                <h3 className="mt-3 font-display text-xl font-medium">
                  {t({ ar: "لا توجد عروض واردة حالياً", fr: "Aucune offre reçue", en: "No incoming offers" })}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t({
                    ar: "عندما يقترح أحد المشترين سعراً على إعلاناتك، ستظهر تفاصيل العرض هنا.",
                    fr: "Lorsque des acheteurs font des offres sur vos annonces négociables, elles apparaîtront ici.",
                    en: "When buyers make offers on your negotiable listings, they will show up here.",
                  })}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {incoming.map((offer) => {
                  const unitLabel = UNIT_LABEL[offer.unit as keyof typeof UNIT_LABEL]?.short
                    ? t(UNIT_LABEL[offer.unit as keyof typeof UNIT_LABEL].short)
                    : offer.unit;
                  const isPending = offer.status === "pending";

                  return (
                    <article
                      key={offer.id}
                      className="surface-card overflow-hidden p-5 transition-shadow hover:shadow-md"
                    >
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <img
                          src={offer.listingImage}
                          alt=""
                          className="h-28 w-full shrink-0 rounded-lg object-cover sm:h-24 sm:w-28"
                          loading="lazy"
                        />

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {statusBadge(offer.status)}
                              <span className="text-xs text-muted-foreground">
                                <Clock className="inline size-3 me-1" />
                                {date(offer.createdAt)}
                              </span>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                              <Link to="/annonces/$id" params={{ id: offer.listingId }}>
                                <ExternalLink className="me-1 size-3" />
                                {t({ ar: "شوف الإعلان", fr: "Voir l'annonce", en: "View listing" })}
                              </Link>
                            </Button>
                          </div>

                          <h3 className="truncate font-display text-lg font-semibold">{t(offer.listingTitle)}</h3>

                          <div className="grid gap-2 text-sm sm:grid-cols-2">
                            <div className="rounded-lg bg-muted/50 p-2.5">
                              <p className="text-xs text-muted-foreground">
                                {t({ ar: "السعر الأصلي", fr: "Prix initial", en: "Original price" })}
                              </p>
                              <p className="font-semibold text-foreground">
                                {dt(offer.originalPrice)} / {unitLabel}
                              </p>
                            </div>

                            <div className="rounded-lg bg-rust/10 p-2.5">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-rust">
                                  {t({ ar: "العرض المقترح", fr: "Prix proposé", en: "Offered price" })}
                                </p>
                                <span className="inline-flex items-center text-xs font-semibold text-rust">
                                  <ArrowDownRight className="size-3.5 me-0.5" />
                                  {offer.difference} DT ({offer.percentage}%)
                                </span>
                              </div>
                              <p className="font-display text-xl font-bold text-rust">
                                {dt(offer.offeredPrice)} / {unitLabel}
                              </p>
                            </div>
                          </div>

                          {/* Buyer info snippet */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <User className="size-3.5 text-brass" />
                              <span className="font-medium text-foreground">{offer.buyer.name}</span>
                              <span className="capitalize">({offer.buyer.accountType})</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setSelectedOffer(offer)}
                              >
                                {t({ ar: "التفاصيل والاتصال", fr: "Détails & contact", en: "Details & contact" })}
                              </Button>

                              {isPending && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                    disabled={busyId === offer.id}
                                    onClick={() => handleResponse(offer.id, "rejected")}
                                  >
                                    <XCircle className="size-3.5 me-1" />
                                    {t({ ar: "رفض", fr: "Refuser", en: "Reject" })}
                                  </Button>
                                  <Button
                                    variant="rust"
                                    size="sm"
                                    className="h-8 text-xs font-semibold"
                                    disabled={busyId === offer.id}
                                    onClick={() => handleResponse(offer.id, "accepted")}
                                  >
                                    <CheckCircle2 className="size-3.5 me-1" />
                                    {t({ ar: "قبول العرض", fr: "Accepter", en: "Accept" })}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* OUTGOING OFFERS (BUYER) */}
          <TabsContent value="outgoing">
            {outgoingQ.isPending ? (
              <Loading />
            ) : outgoing.length === 0 ? (
              <div className="surface-card flex flex-col items-center p-12 text-center">
                <HandCoins className="size-12 text-muted-foreground" />
                <h3 className="mt-3 font-display text-xl font-medium">
                  {t({ ar: "لم تقدم أي عرض بعد", fr: "Aucune offre envoyée", en: "No offers sent yet" })}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t({
                    ar: "عندما تتفاوض على أي إعلان قابل للنقاش، يمكنك متابعة قرار البائع هنا.",
                    fr: "Lorsque vous proposez un prix sur une annonce négociable, suivez la réponse du vendeur ici.",
                    en: "When you negotiate on a listing, track the seller's response here.",
                  })}
                </p>
                <Button asChild variant="rust" className="mt-5">
                  <Link to="/annonces">{t({ ar: "تصفح الإعلانات", fr: "Voir les annonces", en: "Browse listings" })}</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {outgoing.map((offer) => {
                  return (
                    <article key={offer.id} className="surface-card flex flex-col justify-between p-5">
                      <div className="flex gap-4">
                        <img
                          src={offer.listingImage}
                          alt=""
                          className="size-20 shrink-0 rounded-lg object-cover"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            {statusBadge(offer.status)}
                            <span className="text-xs text-muted-foreground">{date(offer.createdAt)}</span>
                          </div>
                          <h4 className="mt-1 truncate font-display font-semibold">{t(offer.listingTitle)}</h4>
                          <p className="text-xs text-muted-foreground">
                            {t({ ar: "البائع:", fr: "Vendeur :", en: "Seller:" })} {offer.seller.name}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/60 p-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">{t({ ar: "الأصلي", fr: "Initial", en: "Original" })}</p>
                          <p className="font-semibold text-muted-foreground line-through">{dt(offer.originalPrice)}</p>
                        </div>
                        <div className="text-end">
                          <p className="text-xs font-semibold text-rust">{t({ ar: "عرضك", fr: "Votre offre", en: "Your offer" })}</p>
                          <p className="font-display text-lg font-bold text-rust">{dt(offer.offeredPrice)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                          <Link to="/annonces/$id" params={{ id: offer.listingId }}>
                            <ExternalLink className="me-1 size-3" />
                            {t({ ar: "تفاصيل الإعلان", fr: "Fiche annonce", en: "Listing page" })}
                          </Link>
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* DETAILS & BUYER PROFILE MODAL */}
        <Dialog open={!!selectedOffer} onOpenChange={(o) => !o && setSelectedOffer(null)}>
          {selectedOffer && (
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t({ ar: "تفاصيل العرض والمشتري", fr: "Détails de l'offre & profil", en: "Offer details & buyer" })}</DialogTitle>
                <DialogDescription>
                  {t(selectedOffer.listingTitle)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Offer Numbers */}
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">{t({ ar: "السعر الأصلي", fr: "Prix initial", en: "Initial price" })}</span>
                    <p className="font-medium text-foreground">{dt(selectedOffer.originalPrice)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">{t({ ar: "السعر المقترح", fr: "Prix proposé", en: "Offered price" })}</span>
                    <p className="font-display text-xl font-bold text-rust">{dt(selectedOffer.offeredPrice)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">{t({ ar: "الفارق", fr: "Différence", en: "Difference" })}</span>
                    <p className="font-semibold text-rust">-{selectedOffer.difference} DT (-{selectedOffer.percentage}%)</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">{t({ ar: "الحالة", fr: "Statut", en: "Status" })}</span>
                    <div>{statusBadge(selectedOffer.status)}</div>
                  </div>
                </div>

                {selectedOffer.notes && (
                  <div className="rounded-lg border border-border p-3 text-sm">
                    <p className="text-xs font-semibold text-muted-foreground">{t({ ar: "ملاحظات المشتري", fr: "Message de l'acheteur", en: "Buyer note" })}</p>
                    <p className="mt-1 text-foreground">{selectedOffer.notes}</p>
                  </div>
                )}

                {/* Buyer Profile & Contact */}
                <div className="rounded-lg border border-border p-4">
                  <h4 className="font-display text-sm font-semibold">{t({ ar: "معلومات المشتري", fr: "Profil de l'acheteur", en: "Buyer information" })}</h4>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t({ ar: "الاسم", fr: "Nom complet", en: "Full name" })}</dt>
                      <dd className="font-semibold">{selectedOffer.buyer.name}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t({ ar: "نوع الحساب", fr: "Type de compte", en: "Account type" })}</dt>
                      <dd className="capitalize">{selectedOffer.buyer.accountType}</dd>
                    </div>
                    {selectedOffer.buyer.phone && (
                      <div className="flex items-center justify-between border-t border-border pt-2">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="size-3.5 text-brass" />
                          {t({ ar: "الهاتف", fr: "Téléphone", en: "Phone" })}
                        </dt>
                        <dd>
                          <a
                            href={`tel:${selectedOffer.buyer.phone}`}
                            className="font-semibold text-rust underline hover:text-rust/80"
                            dir="ltr"
                          >
                            {selectedOffer.buyer.phone}
                          </a>
                        </dd>
                      </div>
                    )}
                    {selectedOffer.buyer.email && (
                      <div className="flex items-center justify-between border-t border-border pt-2">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="size-3.5 text-brass" />
                          {t({ ar: "البريد الإلكتروني", fr: "Email", en: "Email" })}
                        </dt>
                        <dd>
                          <a
                            href={`mailto:${selectedOffer.buyer.email}`}
                            className="text-xs font-medium text-foreground underline"
                          >
                            {selectedOffer.buyer.email}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                {selectedOffer.status === "pending" && (
                  <div className="flex w-full gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-destructive"
                      onClick={() => handleResponse(selectedOffer.id, "rejected")}
                    >
                      <XCircle className="size-4 me-1" />
                      {t({ ar: "رفض العرض", fr: "Refuser l'offre", en: "Reject" })}
                    </Button>
                    <Button
                      variant="rust"
                      className="flex-1 font-semibold"
                      onClick={() => handleResponse(selectedOffer.id, "accepted")}
                    >
                      <CheckCircle2 className="size-4 me-1" />
                      {t({ ar: "قبول العرض", fr: "Accepter l'offre", en: "Accept" })}
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </>
  );
}

