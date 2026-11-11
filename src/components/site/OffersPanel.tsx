import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gavel,
  HandCoins,
  Mail,
  Phone,
  User,
  Users,
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
import {
  getIncomingOffers,
  getOutgoingOffers,
  getSellerBiddingRequests,
  respondToOffer,
} from "@/lib/marketplace.functions";
import { UNIT_LABEL } from "@/lib/quantity";

export function OffersPanel() {
  const { t, dt, date } = useI18n();
  const qc = useQueryClient();

  const fetchIncoming = useServerFn(getIncomingOffers);
  const fetchOutgoing = useServerFn(getOutgoingOffers);
  const fetchBids = useServerFn(getSellerBiddingRequests);
  const sendResponse = useServerFn(respondToOffer);

  const incomingQ = useQuery({ queryKey: ["me", "offers", "incoming"], queryFn: () => fetchIncoming() });
  const outgoingQ = useQuery({ queryKey: ["me", "offers", "outgoing"], queryFn: () => fetchOutgoing() });
  const bidsQ = useQuery({ queryKey: ["me", "offers", "bids"], queryFn: () => fetchBids() });

  const [activeTab, setActiveTab] = useState<"incoming" | "bids" | "outgoing">("incoming");
  const [incomingStatusFilter, setIncomingStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [outgoingStatusFilter, setOutgoingStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const incoming = incomingQ.data ?? [];
  const outgoing = outgoingQ.data ?? [];
  const auctionItems = bidsQ.data ?? [];

  const pendingIncomingCount = incoming.filter((o) => o.status === "pending").length;
  const totalBidsCount = auctionItems.reduce((acc: number, item: any) => acc + (item.totalBids || 0), 0);

  // Filtered incoming offers
  const filteredIncoming = incoming.filter((o) => {
    if (incomingStatusFilter === "all") return true;
    return o.status === incomingStatusFilter;
  });

  // Filtered outgoing offers
  const filteredOutgoing = outgoing.filter((o) => {
    if (outgoingStatusFilter === "all") return true;
    return o.status === outgoingStatusFilter;
  });

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
            {t({ ar: "عروض التفاوض والمزايدات", fr: "Offres de négociation & Enchères", en: "Price offers & Bids" })}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t({
              ar: "تابع وقبل عروض المشترين، راقب المزايدات على إعلاناتك، وتابع عروضك المرسلة.",
              fr: "Consultez et répondez aux propositions des acheteurs, suivez les enchères et vérifiez vos offres.",
              en: "Review and respond to buyer proposals, track auction bids, and check your submitted offers.",
            })}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="mb-6 grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="incoming" className="relative text-xs sm:text-sm">
            {t({ ar: "العروض الواردة", fr: "Offres reçues", en: "Incoming offers" })}
            {pendingIncomingCount > 0 && (
              <span className="ms-2 rounded-full bg-rust px-1.5 py-0.5 text-[0.7rem] font-bold text-rust-foreground">
                {pendingIncomingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="bids" className="relative text-xs sm:text-sm">
            {t({ ar: "المزايدات المستلمة", fr: "Enchères reçues", en: "Auction bids" })}
            {totalBidsCount > 0 && (
              <span className="ms-2 rounded-full bg-brass px-1.5 py-0.5 text-[0.7rem] font-bold text-brass-foreground">
                {totalBidsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="text-xs sm:text-sm">
            {t({ ar: "عروضي المرسلة", fr: "Mes offres", en: "Sent offers" })}
          </TabsTrigger>
        </TabsList>

        {/* 1. INCOMING OFFERS (SELLER) */}
        <TabsContent value="incoming">
          {/* Status Filter Sub-Bar */}
          <div className="mb-5 flex flex-wrap gap-2 text-xs">
            <Button
              type="button"
              variant={incomingStatusFilter === "all" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setIncomingStatusFilter("all")}
            >
              {t({ ar: "الكل", fr: "Toutes", en: "All" })} ({incoming.length})
            </Button>
            <Button
              type="button"
              variant={incomingStatusFilter === "pending" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setIncomingStatusFilter("pending")}
            >
              {t({ ar: "في الانتظار", fr: "En attente", en: "Pending" })} ({incoming.filter((o) => o.status === "pending").length})
            </Button>
            <Button
              type="button"
              variant={incomingStatusFilter === "accepted" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setIncomingStatusFilter("accepted")}
            >
              <CheckCircle2 className="size-3.5 me-1 text-olive" />
              {t({ ar: "المقبولة", fr: "Acceptées", en: "Accepted" })} ({incoming.filter((o) => o.status === "accepted").length})
            </Button>
            <Button
              type="button"
              variant={incomingStatusFilter === "rejected" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setIncomingStatusFilter("rejected")}
            >
              {t({ ar: "المرفوضة", fr: "Refusées", en: "Rejected" })} ({incoming.filter((o) => o.status === "rejected").length})
            </Button>
          </div>

          {incomingQ.isPending ? (
            <div className="surface-card p-12"><Loading /></div>
          ) : filteredIncoming.length === 0 ? (
            <div className="surface-card flex flex-col items-center p-12 text-center rounded-2xl border border-dashed border-border">
              <HandCoins className="size-12 text-brass" />
              <h3 className="mt-3 font-display text-xl font-medium">
                {t({ ar: "لا توجد عروض في هذا القسم", fr: "Aucune offre dans cette section", en: "No offers in this section" })}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t({
                  ar: "عندما يقترح أحد المشترين سعراً على إعلاناتك، ستظهر تفاصيل العرض هنا بشكل دائم.",
                  fr: "Lorsque des acheteurs font des offres sur vos annonces, elles apparaîtront ici de façon permanente.",
                  en: "When buyers make offers on your listings, they will appear here permanently.",
                })}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIncoming.map((offer) => {
                const unitLabel = UNIT_LABEL[offer.unit as keyof typeof UNIT_LABEL]?.short
                  ? t(UNIT_LABEL[offer.unit as keyof typeof UNIT_LABEL].short)
                  : offer.unit;
                const isPending = offer.status === "pending";
                const isAccepted = offer.status === "accepted";
                const buyerName = offer.buyer?.name || (offer as any).buyerName || "Acheteur";
                const buyerPhone = offer.buyer?.phone || "";

                return (
                  <article
                    key={offer.id}
                    className={`surface-card overflow-hidden p-5 transition-shadow hover:shadow-md ${isAccepted ? "border-olive/50 bg-olive/5" : ""}`}
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
                              <span className="font-medium text-foreground">{buyerName}</span>
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
                              <span className="ms-1.5 rounded bg-rust/10 px-1.5 py-0.5 text-xs font-semibold text-rust">
                                -{offer.difference} DT ({offer.percentage}%)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Buyer preview & contact */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-xs">
                          <div className="flex items-center gap-1.5 text-foreground">
                            <User className="size-3.5 text-muted-foreground" />
                            <span className="font-medium">{buyerName}</span>
                            {buyerPhone && (
                              <a
                                href={`tel:${buyerPhone}`}
                                className="ms-2 font-semibold text-rust hover:underline"
                                dir="ltr"
                              >
                                <Phone className="inline size-3 me-1" />
                                {buyerPhone}
                              </a>
                            )}
                          </div>

                          {offer.notes && (
                            <p className="w-full text-xs text-muted-foreground italic sm:w-auto">
                              « {offer.notes} »
                            </p>
                          )}
                        </div>
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
                            variant="rust"
                            size="sm"
                            disabled={busyId === offer.id}
                            onClick={() => handleResponse(offer.id, "accepted")}
                            className="gap-1.5 bg-olive hover:bg-olive/90"
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

        {/* 2. AUCTION BIDS RECEIVED (SELLER) */}
        <TabsContent value="bids">
          {bidsQ.isPending ? (
            <div className="surface-card p-12"><Loading /></div>
          ) : auctionItems.length === 0 ? (
            <div className="surface-card flex flex-col items-center p-12 text-center rounded-2xl border border-dashed border-border">
              <Gavel className="size-12 text-brass" />
              <h3 className="mt-3 font-display text-xl font-medium">
                {t({ ar: "لا توجد مزايدات على إعلاناتك حالياً", fr: "Aucune enchère reçue pour le moment", en: "No auction bids received yet" })}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t({
                  ar: "عندما تضع إعلاناً من نوع مزاد ويقوم المشترون بالمزايدة، ستظهر قائمة المزايدين ومعلومات الاتصال بهم هنا.",
                  fr: "Lorsque vous publiez une annonce aux enchères et que des acheteurs surenchérissent, l'historique complet et leurs coordonnées s'affichent ici.",
                  en: "When buyers place bids on your auction listings, the full bidding history and contact details will appear here.",
                })}
              </p>
              <Button asChild variant="rust" className="mt-4">
                <Link to="/publier">{t({ ar: "نشر إعلان مزاد", fr: "Créer une enchère", en: "Create an auction" })}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {auctionItems.map((item: any) => (
                <article key={item.id} className="surface-card overflow-hidden p-5">
                  <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
                    <img
                      src={item.image}
                      alt=""
                      className="h-24 w-full shrink-0 rounded-lg object-cover sm:w-28"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate font-display text-lg font-semibold">{t(item.title)}</h3>
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                          <Link to="/annonces/$id" params={{ id: item.id }}>
                            <ExternalLink className="me-1 size-3" />
                            {t({ ar: "صفحة المزاد", fr: "Fiche enchère", en: "Auction page" })}
                          </Link>
                        </Button>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground">{t({ ar: "سعر الانطلاق:", fr: "Prix de départ :", en: "Start price:" })}</span>{" "}
                          <span className="font-medium">{dt(item.startPrice)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">{t({ ar: "الزيادة:", fr: "Pas :", en: "Increment:" })}</span>{" "}
                          <span className="font-medium">+{dt(item.increment)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">{t({ ar: "أعلى مزايدة حالية:", fr: "Offre la plus haute :", en: "Highest bid:" })}</span>{" "}
                          <span className="font-display text-lg font-bold text-rust">{dt(item.currentHighestBid)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">{t({ ar: "عدد المزايدات:", fr: "Total enchères :", en: "Total bids:" })}</span>{" "}
                          <span className="font-semibold">{item.totalBids}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bidders Table */}
                  <div className="mt-4">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Users className="size-3.5 text-brass" />
                      {t({ ar: "قائمة المزايدين (مرئية لك كبائع)", fr: "Historique des enchérisseurs (visible par le vendeur)", en: "Bidders history (visible to seller)" })}
                    </h4>

                    {item.bids.length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t({ ar: "لا توجد عروض بعد على هذا المزاد.", fr: "Aucune enchère enregistrée.", en: "No bids placed yet." })}
                      </p>
                    ) : (
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-start text-sm">
                          <thead>
                            <tr className="border-b border-border text-xs text-muted-foreground">
                              <th className="pb-2 text-start font-medium">{t({ ar: "المزايد", fr: "Enchérisseur", en: "Bidder" })}</th>
                              <th className="pb-2 text-start font-medium">{t({ ar: "الهاتف", fr: "Téléphone", en: "Phone" })}</th>
                              <th className="pb-2 text-start font-medium">{t({ ar: "البريد الإلكتروني", fr: "Email", en: "Email" })}</th>
                              <th className="pb-2 text-end font-medium">{t({ ar: "المبلغ", fr: "Montant", en: "Amount" })}</th>
                              <th className="pb-2 text-end font-medium">{t({ ar: "التاريخ", fr: "Date", en: "Date" })}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {item.bids.map((b: any, idx: number) => (
                              <tr key={idx} className={idx === 0 ? "bg-rust/5 font-semibold" : ""}>
                                <td className="py-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="grid size-6 place-items-center rounded-full bg-charcoal text-xs font-bold text-brass">
                                      {b.bidder}
                                    </span>
                                    <span>{b.bidderName}</span>
                                    {idx === 0 && (
                                      <Badge variant="rust" className="text-[0.65rem] px-1 py-0">
                                        {t({ ar: "الأعلى", fr: "Le plus offrant", en: "Highest" })}
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5">
                                  {b.bidderPhone ? (
                                    <a href={`tel:${b.bidderPhone}`} className="text-rust hover:underline" dir="ltr">
                                      {b.bidderPhone}
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-xs">
                                  {b.bidderEmail ? (
                                    <a href={`mailto:${b.bidderEmail}`} className="text-muted-foreground hover:underline">
                                      {b.bidderEmail}
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-end font-display font-bold text-rust">
                                  {dt(b.amount)}
                                </td>
                                <td className="py-2.5 text-end text-xs text-muted-foreground">
                                  {b.createdAt ? date(b.createdAt) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 3. OUTGOING OFFERS (BUYER) */}
        <TabsContent value="outgoing">
          {/* Status Filter Sub-Bar */}
          <div className="mb-5 flex flex-wrap gap-2 text-xs">
            <Button
              type="button"
              variant={outgoingStatusFilter === "all" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setOutgoingStatusFilter("all")}
            >
              {t({ ar: "الكل", fr: "Toutes", en: "All" })} ({outgoing.length})
            </Button>
            <Button
              type="button"
              variant={outgoingStatusFilter === "pending" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setOutgoingStatusFilter("pending")}
            >
              {t({ ar: "في الانتظار", fr: "En attente", en: "Pending" })} ({outgoing.filter((o) => o.status === "pending").length})
            </Button>
            <Button
              type="button"
              variant={outgoingStatusFilter === "accepted" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setOutgoingStatusFilter("accepted")}
            >
              <CheckCircle2 className="size-3.5 me-1 text-olive" />
              {t({ ar: "المقبولة", fr: "Acceptées", en: "Accepted" })} ({outgoing.filter((o) => o.status === "accepted").length})
            </Button>
            <Button
              type="button"
              variant={outgoingStatusFilter === "rejected" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setOutgoingStatusFilter("rejected")}
            >
              {t({ ar: "المرفوضة", fr: "Refusées", en: "Rejected" })} ({outgoing.filter((o) => o.status === "rejected").length})
            </Button>
          </div>

          {outgoingQ.isPending ? (
            <div className="surface-card p-12"><Loading /></div>
          ) : filteredOutgoing.length === 0 ? (
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
              {filteredOutgoing.map((offer) => {
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
                          <div>
                            <span className="text-xs text-muted-foreground">{t({ ar: "السعر الأصلي", fr: "Prix initial", en: "Original price" })}: </span>
                            <span className="line-through">{dt(offer.originalPrice)}</span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">{t({ ar: "عرضك", fr: "Votre offre", en: "Your offer" })}: </span>
                            <span className="font-display text-lg font-bold text-rust">{dt(offer.offeredPrice)}</span> / {unitLabel}
                          </div>
                        </div>

                        {offer.notes && (
                          <p className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground italic">
                            « {offer.notes} »
                          </p>
                        )}
                      </div>
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
                    <dd className="font-semibold">{selectedOffer.buyer?.name || selectedOffer.buyerName || "Acheteur"}</dd>
                  </div>
                  {selectedOffer.buyer?.accountType && (
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t({ ar: "نوع الحساب", fr: "Type de compte", en: "Account type" })}</dt>
                      <dd className="capitalize">{selectedOffer.buyer.accountType}</dd>
                    </div>
                  )}
                  {selectedOffer.buyer?.phone && (
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
                  {selectedOffer.buyer?.email && (
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
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleResponse(selectedOffer.id, "rejected")}
                  >
                    <XCircle className="size-4 me-1" />
                    {t({ ar: "رفض العرض", fr: "Refuser l'offre", en: "Reject" })}
                  </Button>
                  <Button
                    variant="rust"
                    className="flex-1 font-semibold bg-olive hover:bg-olive/90"
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
  );
}
