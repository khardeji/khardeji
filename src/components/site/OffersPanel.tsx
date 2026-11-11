import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
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
import { toast } from "sonner";
import { Loading } from "@/components/admin/shared";
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
import { getIncomingOffers, getOutgoingOffers, respondToOffer } from "@/lib/marketplace.functions";
import { UNIT_LABEL } from "@/lib/quantity";

export function OffersPanel() {
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
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <HandCoins className="size-5 text-rust" />
            {t({ ar: "عروض التفاوض", fr: "Offres de négociation", en: "Price offers" })}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t({
              ar: "تابع وقبل عروض المشترين على إعلاناتك، وراقب العروض اللي قدّمتها.",
              fr: "Consultez et répondez aux propositions des acheteurs et suivez vos offres envoyées.",
              en: "Review and respond to buyer proposals and track your submitted offers.",
            })}
          </p>
        </div>
      </div>

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
            <div className="surface-card p-12"><Loading /></div>
          ) : incoming.length === 0 ? (
            <div className="surface-card flex flex-col items-center p-12 text-center rounded-2xl border border-dashed border-border">
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
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">
                              {t({ ar: "المشتري", fr: "Acheteur", en: "Buyer" })}:{" "}
                              <span className="font-medium text-foreground">{offer.buyerName}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t({ ar: "الكمية", fr: "Quantité", en: "Quantity" })}:{" "}
                              <span className="font-semibold text-foreground">
                                {offer.quantity} {unitLabel}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1 sm:text-end">
                            <div className="text-xs text-muted-foreground">
                              {t({ ar: "السعر الأصلي", fr: "Prix initial", en: "Original price" })}:{" "}
                              <span className="line-through">{dt(offer.originalPrice)}</span>
                            </div>
                            <div className="text-sm font-bold text-rust">
                              {t({ ar: "السعر المقترح", fr: "Offre proposée", en: "Proposed price" })}:{" "}
                              <span className="text-base">{dt(offer.offeredPrice)}</span> / {unitLabel}
                            </div>
                            <div className="text-xs font-semibold text-foreground">
                              {t({ ar: "المجموع المقترح", fr: "Total proposé", en: "Proposed total" })}:{" "}
                              <span className="text-sm font-bold text-rust">{dt(offer.totalAmount)}</span>
                            </div>
                          </div>
                        </div>

                        {offer.notes && (
                          <p className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground italic">
                            « {offer.notes} »
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOffer(offer)}
                        className="text-xs"
                      >
                        {t({ ar: "تفاصيل والاتصال", fr: "Détails & Contact", en: "Details & Contact" })}
                      </Button>

                      {isPending && (
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={busyId === offer.id}
                            onClick={() => handleResponse(offer.id, "rejected")}
                            className="gap-1.5"
                          >
                            <XCircle className="size-4" />
                            {t({ ar: "رفض", fr: "Refuser", en: "Reject" })}
                          </Button>
                          <Button
                            variant="olive"
                            size="sm"
                            disabled={busyId === offer.id}
                            onClick={() => handleResponse(offer.id, "accepted")}
                            className="gap-1.5"
                          >
                            <CheckCircle2 className="size-4" />
                            {t({ ar: "قبول العرض", fr: "Accepter l'offre", en: "Accept offer" })}
                          </Button>
                        </div>
                      )}
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
            <div className="surface-card p-12"><Loading /></div>
          ) : outgoing.length === 0 ? (
            <div className="surface-card flex flex-col items-center p-12 text-center rounded-2xl border border-dashed border-border">
              <ArrowDownRight className="size-12 text-muted-foreground" />
              <h3 className="mt-3 font-display text-xl font-medium">
                {t({ ar: "لم تقدّم أي عروض للتو", fr: "Aucune offre envoyée", en: "No sent offers" })}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t({
                  ar: "تصفّح الإعلانات القابلة للتفاوض وقدّم عروض أسعار للبائعين.",
                  fr: "Parcourez les annonces négociables pour proposer des prix aux vendeurs.",
                  en: "Browse negotiable listings to submit price offers to sellers.",
                })}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {outgoing.map((offer) => {
                const unitLabel = UNIT_LABEL[offer.unit as keyof typeof UNIT_LABEL]?.short
                  ? t(UNIT_LABEL[offer.unit as keyof typeof UNIT_LABEL].short)
                  : offer.unit;

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
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">
                              {t({ ar: "البائع", fr: "Vendeur", en: "Seller" })}:{" "}
                              <span className="font-medium text-foreground">{offer.sellerName}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t({ ar: "الكمية المطلوبة", fr: "Quantité", en: "Quantity" })}:{" "}
                              <span className="font-semibold text-foreground">
                                {offer.quantity} {unitLabel}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1 sm:text-end">
                            <div className="text-xs text-muted-foreground">
                              {t({ ar: "السعر الأصلي", fr: "Prix initial", en: "Original price" })}:{" "}
                              <span className="line-through">{dt(offer.originalPrice)}</span>
                            </div>
                            <div className="text-sm font-bold text-rust">
                              {t({ ar: "عرضك", fr: "Votre offre", en: "Your offer" })}:{" "}
                              <span className="text-base">{dt(offer.offeredPrice)}</span> / {unitLabel}
                            </div>
                            <div className="text-xs font-semibold text-foreground">
                              {t({ ar: "المجموع", fr: "Total proposé", en: "Total offered" })}:{" "}
                              <span className="text-sm font-bold text-rust">{dt(offer.totalAmount)}</span>
                            </div>
                          </div>
                        </div>

                        {offer.notes && (
                          <p className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground italic">
                            « {offer.notes} »
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOffer(offer)}
                        className="text-xs"
                      >
                        {t({ ar: "تفاصيل البائع", fr: "Détails du vendeur", en: "Seller details" })}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {offer.status === "accepted" && t({ ar: "تهانينا! البائع قبل عرضك.", fr: "Offre acceptée ! Contactez le vendeur pour finaliser.", en: "Offer accepted! Contact seller to finalize." })}
                        {offer.status === "rejected" && t({ ar: "البائع لم يقبل هذا السعر.", fr: "Le vendeur a décliné cette proposition.", en: "Seller declined this offer." })}
                        {offer.status === "pending" && t({ ar: "في انتظار رد البائع.", fr: "En attente de la réponse du vendeur.", en: "Awaiting seller response." })}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* DETAIL / CONTACT DIALOG */}
      {selectedOffer && (
        <Dialog open={!!selectedOffer} onOpenChange={(o) => !o && setSelectedOffer(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HandCoins className="size-5 text-rust" />
                {t({ ar: "تفاصيل العرض والتواصل", fr: "Détails de l'offre & Contact", en: "Offer Details & Contact" })}
              </DialogTitle>
              <DialogDescription>
                {t(selectedOffer.listingTitle)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t({ ar: "الحالة", fr: "Statut", en: "Status" })}:</span>
                  <span>{statusBadge(selectedOffer.status)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>{t({ ar: "السعر المقترح", fr: "Offre", en: "Offer" })}:</span>
                  <span className="text-rust font-bold">{dt(selectedOffer.offeredPrice)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>{t({ ar: "المبلغ الإجمالي", fr: "Total", en: "Total" })}:</span>
                  <span className="text-rust font-bold">{dt(selectedOffer.totalAmount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  {t({ ar: "معلومات الطرف الآخر", fr: "Coordonnées de l'interlocuteur", en: "Contact details" })}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-muted-foreground" />
                    <span className="font-medium">{selectedOffer.buyerName || selectedOffer.sellerName}</span>
                  </div>
                  {(selectedOffer.buyerPhone || selectedOffer.sellerPhone) && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-olive" />
                      <a href={`tel:${selectedOffer.buyerPhone || selectedOffer.sellerPhone}`} className="font-mono text-olive hover:underline">
                        {selectedOffer.buyerPhone || selectedOffer.sellerPhone}
                      </a>
                    </div>
                  )}
                  {(selectedOffer.buyerEmail || selectedOffer.sellerEmail) && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-muted-foreground" />
                      <span>{selectedOffer.buyerEmail || selectedOffer.sellerEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedOffer(null)}>
                {t({ ar: "إغلاق", fr: "Fermer", en: "Close" })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

