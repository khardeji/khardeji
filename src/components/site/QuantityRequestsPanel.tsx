import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Store,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/hooks/use-i18n";
import {
  getBuyerQuantityRequests,
  getSellerQuantityRequests,
  respondToQuantityRequest,
} from "@/lib/marketplace.functions";
import { UNIT_LABEL } from "@/lib/quantity";
import { repostMyListing } from "@/lib/listings.functions";
import { resolveImage } from "@/data/catalog";

export function QuantityRequestsPanel() {
  const { t, dt, date, num } = useI18n();
  const qc = useQueryClient();

  const fetchSellerReqs = useServerFn(getSellerQuantityRequests);
  const fetchBuyerReqs = useServerFn(getBuyerQuantityRequests);
  const sendResponse = useServerFn(respondToQuantityRequest);
  const repostListing = useServerFn(repostMyListing);

  const sellerQ = useQuery({ queryKey: ["me", "qty_requests", "seller"], queryFn: () => fetchSellerReqs() });
  const buyerQ = useQuery({ queryKey: ["me", "qty_requests", "buyer"], queryFn: () => fetchBuyerReqs() });

  const [activeTab, setActiveTab] = useState<"seller" | "buyer">("seller");
  const [sellerStatusFilter, setSellerStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [buyerStatusFilter, setBuyerStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const sellerReqs = sellerQ.data ?? [];
  const buyerReqs = buyerQ.data ?? [];
  const pendingCount = sellerReqs.filter((r) => r.status === "pending").length;

  const filteredSellerReqs = sellerReqs.filter((r) => {
    if (sellerStatusFilter === "all") return true;
    return r.status === sellerStatusFilter;
  });

  const filteredBuyerReqs = buyerReqs.filter((r) => {
    if (buyerStatusFilter === "all") return true;
    return r.status === buyerStatusFilter;
  });

  async function handleResponse(requestId: string, action: "accepted" | "rejected" | "cancel_acceptance") {
    setBusyId(requestId);
    try {
      const res = await sendResponse({ data: { requestId, action } });
      if (res.ok) {
        if (action === "cancel_acceptance") {
          toast.success(
            t({
              ar: `تم إلغاء القبول وإعادة المنتج للمتجر (المتبقي: ${res.remainingStock})`,
              fr: `Acceptation annulée ! Produit remis en vente (restant : ${res.remainingStock})`,
              en: `Acceptance cancelled! Product reposted to store (remaining: ${res.remainingStock})`,
            }),
          );
        } else {
          toast.success(
            action === "accepted"
              ? t({
                  ar: `تم قبول الطلب وتحديث المخزون (المتبقي: ${res.remainingStock})`,
                  fr: `Commande acceptée ! Stock mis à jour (restant : ${res.remainingStock})`,
                  en: `Request accepted! Inventory updated (remaining: ${res.remainingStock})`,
                })
              : t({ ar: "تم رفض الطلب", fr: "Demande refusée", en: "Request declined" }),
          );
        }
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["me", "qty_requests"] }),
          qc.invalidateQueries({ queryKey: ["catalog"] }),
          qc.invalidateQueries({ queryKey: ["me", "listings"] }),
          qc.invalidateQueries({ queryKey: ["me", "notifications"] }),
        ]);
        const newStatus = action === "cancel_acceptance" ? "cancelled" : action;
        if (selectedReq?.id === requestId) {
          setSelectedReq((prev: any) =>
            prev
              ? {
                  ...prev,
                  status: newStatus,
                  availableStock: res.remainingStock ?? prev.availableStock,
                }
              : null,
          );
        }
        setCancelConfirmId(null);
      } else {
        toast.error(res.message || t({ ar: "فشلت العملية", fr: "Action impossible", en: "Action failed" }));
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
      case "cancelled":
        return <Badge variant="outline">{t({ ar: "ملغى", fr: "Annulée", en: "Cancelled" })}</Badge>;
      default:
        return <Badge variant="brass">{t({ ar: "في الانتظار", fr: "En attente", en: "Pending" })}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="size-5 text-rust" />
            {t({ ar: "طلبات الكميات والبيع بالجملة", fr: "Demandes de quantité & Gros", en: "Quantity orders" })}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t({
              ar: "متابعة طلبات شراء الكميات من المشترين مع تحديث فوري للمخزون ومنع البيع الزائد.",
              fr: "Gérez les commandes de vos acheteurs, validez les quantités et suivez vos stocks sans risque de survente.",
              en: "Manage buyer quantity orders, validate amounts, and track inventory without overselling.",
            })}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="seller" className="relative">
            {t({ ar: "الطلبات الواردة", fr: "Demandes reçues", en: "Incoming requests" })}
            {pendingCount > 0 && (
              <span className="ms-2 rounded-full bg-rust px-1.5 py-0.5 text-[0.7rem] font-bold text-rust-foreground">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="buyer">
            {t({ ar: "طلباتي المرسلة", fr: "Mes demandes envoyées", en: "My sent orders" })}
          </TabsTrigger>
        </TabsList>

        {/* ── SELLER: INCOMING QUANTITY REQUESTS ── */}
        <TabsContent value="seller">
          {/* Status Filter Sub-Bar */}
          <div className="mb-5 flex flex-wrap gap-2 text-xs">
            <Button
              type="button"
              variant={sellerStatusFilter === "all" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setSellerStatusFilter("all")}
            >
              {t({ ar: "الكل", fr: "Toutes", en: "All" })} ({sellerReqs.length})
            </Button>
            <Button
              type="button"
              variant={sellerStatusFilter === "pending" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setSellerStatusFilter("pending")}
            >
              {t({ ar: "في الانتظار", fr: "En attente", en: "Pending" })} ({sellerReqs.filter((r) => r.status === "pending").length})
            </Button>
            <Button
              type="button"
              variant={sellerStatusFilter === "accepted" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setSellerStatusFilter("accepted")}
            >
              <CheckCircle2 className="size-3.5 me-1 text-olive" />
              {t({ ar: "المقبولة", fr: "Acceptées", en: "Accepted" })} ({sellerReqs.filter((r) => r.status === "accepted").length})
            </Button>
            <Button
              type="button"
              variant={sellerStatusFilter === "rejected" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setSellerStatusFilter("rejected")}
            >
              {t({ ar: "المرفوضة", fr: "Refusées", en: "Rejected" })} ({sellerReqs.filter((r) => r.status === "rejected").length})
            </Button>
          </div>

          {sellerQ.isPending ? (
            <Loading />
          ) : filteredSellerReqs.length === 0 ? (
            <div className="surface-card flex flex-col items-center p-12 text-center">
              <Package className="size-12 text-brass" />
              <h3 className="mt-3 font-display text-xl font-medium">
                {t({ ar: "لا توجد طلبات في هذا القسم", fr: "Aucune commande dans cette section", en: "No requests in this section" })}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t({
                  ar: "عندما يطلب المشترون كميات معينة من بضاعتك ستظهر تفاصيل كل طلب هنا بشكل دائم.",
                  fr: "Lorsque des acheteurs commandent des quantités sur vos annonces, elles apparaîtront ici de façon permanente.",
                  en: "When buyers order specific quantities on your listings, they will show up here permanently.",
                })}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSellerReqs.map((req) => {
                const unitLabel = UNIT_LABEL[req.unit as keyof typeof UNIT_LABEL]?.short
                  ? t(UNIT_LABEL[req.unit as keyof typeof UNIT_LABEL].short)
                  : req.unit;
                const isPending = req.status === "pending";
                const isAccepted = req.status === "accepted";
                const canFulfill = req.availableStock >= req.requestedQuantity;
                const imgSrc = resolveImage(req.listingImage || "listing-recup");

                return (
                  <article
                    key={req.id}
                    className={`surface-card overflow-hidden transition-shadow hover:shadow-md ${isAccepted ? "border-olive/40 bg-olive/5" : ""}`}
                  >
                    <div className="flex flex-col gap-0 sm:flex-row">
                      {/* Product image — full-height sidebar on desktop */}
                      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-muted sm:h-auto sm:w-36">
                        <img
                          src={imgSrc}
                          alt={t(req.listingTitle)}
                          className="size-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = resolveImage("listing-recup");
                          }}
                        />
                        {/* Status overlay badge on image */}
                        <div className="absolute top-2 start-2">
                          {statusBadge(req.status)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 space-y-3 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="font-display text-base font-semibold leading-tight">{t(req.listingTitle)}</h3>
                            <span className="text-xs text-muted-foreground">
                              <Clock className="inline size-3 me-1" />
                              {date(req.createdAt)}
                            </span>
                          </div>
                          <Button asChild variant="ghost" size="sm" className="h-7 text-xs shrink-0">
                            <Link to="/annonces/$id" params={{ id: req.listingId }}>
                              <ExternalLink className="me-1 size-3" />
                              {t({ ar: "شوف الإعلان", fr: "Voir l'annonce", en: "View listing" })}
                            </Link>
                          </Button>
                        </div>

                        {/* Quantities & Totals */}
                        <div className="grid gap-2 text-sm grid-cols-3">
                          <div className="rounded-lg bg-muted/60 p-2.5">
                            <p className="text-xs text-muted-foreground">
                              {t({ ar: "الكمية المطلوبة", fr: "Quantité demandée", en: "Requested qty" })}
                            </p>
                            <p className="font-display text-base font-bold text-rust">
                              {num(req.requestedQuantity)} {unitLabel}
                            </p>
                          </div>

                          <div className="rounded-lg bg-muted/60 p-2.5">
                            <p className="text-xs text-muted-foreground">
                              {t({ ar: "المخزون المتوفر", fr: "Stock disponible", en: "Available" })}
                            </p>
                            <p className="font-display text-base font-semibold text-foreground">
                              {num(req.availableStock)} {unitLabel}
                            </p>
                          </div>

                          <div className="rounded-lg bg-muted/60 p-2.5">
                            <p className="text-xs text-muted-foreground">
                              {t({ ar: "المبلغ الإجمالي", fr: "Montant total", en: "Total value" })}
                            </p>
                            <p className="font-display text-base font-semibold text-brass">
                              {dt(req.totalValue)}
                            </p>
                          </div>
                        </div>

                        {!canFulfill && isPending && (
                          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                            <AlertTriangle className="size-4 shrink-0" />
                            <span>
                              {t({
                                ar: "تنبيه: الكمية المطلوبة تفوق المخزون المتوفر حالياً.",
                                fr: "Attention : la quantité demandée dépasse le stock actuel.",
                                en: "Warning: Requested amount exceeds currently available stock.",
                              })}
                            </span>
                          </div>
                        )}

                        {/* Buyer info & action buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="size-3.5 text-brass" />
                            <span className="font-medium text-foreground">{req.buyer.name}</span>
                            {req.buyer.phone && (
                              <a
                                href={`tel:${req.buyer.phone}`}
                                className="flex items-center gap-1 text-rust hover:underline"
                                dir="ltr"
                              >
                                <Phone className="size-3" />
                                {req.buyer.phone}
                              </a>
                            )}
                            {req.deliveryLocation && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                · <MapPin className="size-3" /> {req.deliveryLocation}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Details button always visible */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => setSelectedReq(req)}
                            >
                              {t({ ar: "التفاصيل والاتصال", fr: "Détails & contact", en: "Details & contact" })}
                            </Button>

                            {/* Pending: Reject + Accept */}
                            {isPending && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                  disabled={busyId === req.id}
                                  onClick={() => handleResponse(req.id, "rejected")}
                                >
                                  <XCircle className="size-3.5 me-1" />
                                  {t({ ar: "رفض", fr: "Refuser", en: "Reject" })}
                                </Button>
                                <Button
                                  variant="rust"
                                  size="sm"
                                  className="h-8 text-xs font-semibold"
                                  disabled={busyId === req.id || !canFulfill}
                                  onClick={() => handleResponse(req.id, "accepted")}
                                >
                                  <CheckCircle2 className="size-3.5 me-1" />
                                  {t({ ar: "تأكيد الطلب وانقاص المخزون", fr: "Accepter & déduire le stock", en: "Accept & deduct stock" })}
                                </Button>
                              </>
                            )}

                            {/* Accepted: undo, or republish as a new post once the listing is sold out */}
                            {isAccepted && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                                  disabled={busyId === req.id}
                                  onClick={() => setCancelConfirmId(req.id)}
                                >
                                  <RefreshCw className="size-3.5 me-1" />
                                  {t({ ar: "إلغاء القبول وإعادة النشر", fr: "Annuler & remettre en vente", en: "Cancel & repost" })}
                                </Button>
                                {(req.listingStatus === "sold" || Number(req.availableStock) <= 0) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs border-olive text-olive"
                                    disabled={busyId === req.id}
                                    onClick={async () => {
                                      setBusyId(req.id);
                                      try {
                                        const res = await repostListing({
                                          data: { id: req.listingId, stock: Number(req.requestedQuantity) || undefined },
                                        });
                                        if (res.ok) {
                                          toast.success(
                                            t({
                                              ar: "أُعيد نشر الإعلان كإعلان جديد في حسابك.",
                                              fr: "Annonce republiée : elle compte comme une nouvelle annonce sur votre compte.",
                                              en: "Listing reposted. It counts as a new post on your account.",
                                            }),
                                          );
                                          await qc.invalidateQueries({ queryKey: ["me", "listings"] });
                                        } else {
                                          toast.error(t({ ar: "تعذر إعادة النشر", fr: "Republication impossible", en: "Could not repost" }));
                                        }
                                      } catch {
                                        toast.error(t({ ar: "تعذر إعادة النشر", fr: "Republication impossible", en: "Could not repost" }));
                                      } finally {
                                        setBusyId(null);
                                      }
                                    }}
                                  >
                                    {t({ ar: "إعادة النشر", fr: "Republier", en: "Repost" })}
                                  </Button>
                                )}
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

        {/* ── BUYER: SENT QUANTITY REQUESTS ── */}
        <TabsContent value="buyer">
          {/* Status Filter Sub-Bar */}
          <div className="mb-5 flex flex-wrap gap-2 text-xs">
            <Button
              type="button"
              variant={buyerStatusFilter === "all" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setBuyerStatusFilter("all")}
            >
              {t({ ar: "الكل", fr: "Toutes", en: "All" })} ({buyerReqs.length})
            </Button>
            <Button
              type="button"
              variant={buyerStatusFilter === "pending" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setBuyerStatusFilter("pending")}
            >
              {t({ ar: "في الانتظار", fr: "En attente", en: "Pending" })} ({buyerReqs.filter((r) => r.status === "pending").length})
            </Button>
            <Button
              type="button"
              variant={buyerStatusFilter === "accepted" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setBuyerStatusFilter("accepted")}
            >
              <CheckCircle2 className="size-3.5 me-1 text-olive" />
              {t({ ar: "المقبولة", fr: "Acceptées", en: "Accepted" })} ({buyerReqs.filter((r) => r.status === "accepted").length})
            </Button>
            <Button
              type="button"
              variant={buyerStatusFilter === "rejected" ? "rust" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setBuyerStatusFilter("rejected")}
            >
              {t({ ar: "المرفوضة", fr: "Refusées", en: "Rejected" })} ({buyerReqs.filter((r) => r.status === "rejected").length})
            </Button>
          </div>

          {buyerQ.isPending ? (
            <Loading />
          ) : filteredBuyerReqs.length === 0 ? (
            <div className="surface-card flex flex-col items-center p-12 text-center">
              <Package className="size-12 text-muted-foreground" />
              <h3 className="mt-3 font-display text-xl font-medium">
                {t({ ar: "لا توجد طلبات في هذا القسم", fr: "Aucune commande dans cette section", en: "No orders in this section" })}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t({
                  ar: "عندما تطلب كمية محددة من أي منتوج بسعر ثابت، يمكنك متابعة الرد هنا.",
                  fr: "Lorsque vous commandez une quantité sur une annonce à prix fixe, suivez son statut ici.",
                  en: "When you request a quantity on a fixed-price listing, track its status here.",
                })}
              </p>
              <Button asChild variant="rust" className="mt-5">
                <Link to="/annonces">{t({ ar: "تصفح الإعلانات", fr: "Voir les annonces", en: "Browse listings" })}</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredBuyerReqs.map((req) => {
                const unitLabel = UNIT_LABEL[req.unit as keyof typeof UNIT_LABEL]?.short
                  ? t(UNIT_LABEL[req.unit as keyof typeof UNIT_LABEL].short)
                  : req.unit;
                const imgSrc = resolveImage(req.listingImage || "listing-recup");
                return (
                  <article key={req.id} className={`surface-card overflow-hidden flex flex-col ${req.status === "accepted" ? "border-olive/40 bg-olive/5" : ""}`}>
                    {/* Product image hero */}
                    <div className="relative aspect-video w-full overflow-hidden bg-muted">
                      <img
                        src={imgSrc}
                        alt={t(req.listingTitle)}
                        className="size-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = resolveImage("listing-recup");
                        }}
                      />
                      <div className="absolute top-2 start-2">
                        {statusBadge(req.status)}
                      </div>
                    </div>

                    <div className="flex flex-col flex-1 p-4 gap-3">
                      <div>
                        <h4 className="font-display font-semibold leading-tight">{t(req.listingTitle)}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t({ ar: "البائع:", fr: "Vendeur :", en: "Seller:" })} {req.seller.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <Clock className="inline size-3 me-1" />
                          {date(req.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-muted/60 p-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t({ ar: "الكمية المطلوبة", fr: "Quantité", en: "Quantity" })}
                          </p>
                          <p className="font-semibold text-foreground">
                            {num(req.requestedQuantity)} {unitLabel}
                          </p>
                        </div>
                        <div className="text-end">
                          <p className="text-xs font-semibold text-rust">
                            {t({ ar: "المجموع", fr: "Total estimé", en: "Total" })}
                          </p>
                          <p className="font-display text-lg font-bold text-rust">{dt(req.totalValue)}</p>
                        </div>
                      </div>

                      <div className="mt-auto flex justify-end">
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                          <Link to="/annonces/$id" params={{ id: req.listingId }}>
                            <ExternalLink className="me-1 size-3" />
                            {t({ ar: "تفاصيل الإعلان", fr: "Fiche annonce", en: "Listing page" })}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── FULL DETAILS & BUYER CONTACT MODAL ── */}
      <Dialog open={!!selectedReq} onOpenChange={(o) => !o && setSelectedReq(null)}>
        {selectedReq && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t({ ar: "تفاصيل طلب الكمية", fr: "Détails de la demande", en: "Quantity request details" })}</DialogTitle>
              <DialogDescription>{t(selectedReq.listingTitle)}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Product image in modal */}
              <div className="relative overflow-hidden rounded-xl bg-muted aspect-video w-full">
                <img
                  src={resolveImage(selectedReq.listingImage || "listing-recup")}
                  alt={t(selectedReq.listingTitle)}
                  className="size-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = resolveImage("listing-recup");
                  }}
                />
                <div className="absolute top-3 start-3">
                  {statusBadge(selectedReq.status)}
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="absolute bottom-3 end-3 h-7 text-xs bg-background/90"
                >
                  <Link to="/annonces/$id" params={{ id: selectedReq.listingId }}>
                    <ExternalLink className="me-1 size-3" />
                    {t({ ar: "شوف الإعلان", fr: "Voir l'annonce", en: "View listing" })}
                  </Link>
                </Button>
              </div>

              {/* Quantities summary */}
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">{t({ ar: "الكمية المطلوبة", fr: "Quantité demandée", en: "Requested quantity" })}</span>
                  <p className="font-display text-xl font-bold text-rust">{num(selectedReq.requestedQuantity)} {selectedReq.unit}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">{t({ ar: "سعر الوحدة", fr: "Prix unitaire", en: "Unit price" })}</span>
                  <p className="font-medium text-foreground">{dt(selectedReq.unitPrice)} / {selectedReq.unit}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">{t({ ar: "المخزون المتوفر حالياً", fr: "Stock disponible", en: "Available stock" })}</span>
                  <p className="font-semibold text-foreground">{num(selectedReq.availableStock)} {selectedReq.unit}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">{t({ ar: "القيمة الإجمالية", fr: "Valeur totale", en: "Total value" })}</span>
                  <p className="font-display text-xl font-bold text-brass">{dt(selectedReq.totalValue)}</p>
                </div>
              </div>

              {/* Delivery location */}
              {selectedReq.deliveryLocation && (
                <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                  <MapPin className="size-4 text-brass shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">{t({ ar: "مكان التسليم المقترح", fr: "Lieu de livraison souhaité", en: "Delivery location" })}</span>
                    <p className="font-medium text-foreground">{selectedReq.deliveryLocation}</p>
                  </div>
                </div>
              )}

              {/* Buyer notes */}
              {selectedReq.notes && (
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p className="text-xs font-semibold text-muted-foreground">{t({ ar: "ملاحظات إضافية من المشتري", fr: "Notes de l'acheteur", en: "Buyer notes" })}</p>
                  <p className="mt-1 text-foreground">{selectedReq.notes}</p>
                </div>
              )}

              {/* Buyer Profile & Contact */}
              <div className="rounded-lg border border-border p-4">
                <h4 className="font-display text-sm font-semibold flex items-center gap-2">
                  <User className="size-4 text-brass" />
                  {t({ ar: "معلومات المشتري", fr: "Profil de l'acheteur", en: "Buyer information" })}
                </h4>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">{t({ ar: "الاسم", fr: "Nom complet", en: "Full name" })}</dt>
                    <dd className="font-semibold">{selectedReq.buyer.name}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">{t({ ar: "نوع الحساب", fr: "Type de compte", en: "Account type" })}</dt>
                    <dd className="capitalize">{selectedReq.buyer.accountType}</dd>
                  </div>
                  {selectedReq.buyer.memberSince && (
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t({ ar: "عضو منذ", fr: "Membre depuis", en: "Member since" })}</dt>
                      <dd className="text-xs text-muted-foreground">{date(selectedReq.buyer.memberSince)}</dd>
                    </div>
                  )}
                  {selectedReq.buyer.phone && (
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <dt className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="size-3.5 text-brass" />
                        {t({ ar: "الهاتف", fr: "Téléphone", en: "Phone" })}
                      </dt>
                      <dd>
                        <a
                          href={`tel:${selectedReq.buyer.phone}`}
                          className="font-semibold text-rust underline hover:text-rust/80"
                          dir="ltr"
                        >
                          {selectedReq.buyer.phone}
                        </a>
                      </dd>
                    </div>
                  )}
                  {selectedReq.buyer.email && (
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <dt className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="size-3.5 text-brass" />
                        {t({ ar: "البريد الإلكتروني", fr: "Email", en: "Email" })}
                      </dt>
                      <dd>
                        <a
                          href={`mailto:${selectedReq.buyer.email}`}
                          className="text-xs font-medium text-foreground underline"
                        >
                          {selectedReq.buyer.email}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              {/* Pending: reject & accept */}
              {selectedReq.status === "pending" && (
                <div className="flex w-full gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive"
                    disabled={busyId === selectedReq.id}
                    onClick={() => handleResponse(selectedReq.id, "rejected")}
                  >
                    <XCircle className="size-4 me-1" />
                    {t({ ar: "رفض الطلب", fr: "Refuser", en: "Reject" })}
                  </Button>
                  <Button
                    variant="rust"
                    className="flex-1 font-semibold"
                    disabled={busyId === selectedReq.id || selectedReq.availableStock < selectedReq.requestedQuantity}
                    onClick={() => handleResponse(selectedReq.id, "accepted")}
                  >
                    <CheckCircle2 className="size-4 me-1" />
                    {t({ ar: "قبول وتحديث المخزون", fr: "Accepter & déduire", en: "Accept & deduct" })}
                  </Button>
                </div>
              )}

              {/* Accepted: cancel acceptance & repost */}
              {selectedReq.status === "accepted" && (
                <div className="flex w-full gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                    disabled={busyId === selectedReq.id}
                    onClick={() => {
                      setSelectedReq(null);
                      setCancelConfirmId(selectedReq.id);
                    }}
                  >
                    <RefreshCw className="size-4 me-1" />
                    {t({ ar: "إلغاء القبول وإعادة المنتج للمتجر", fr: "Annuler l'acceptation & remettre en vente", en: "Cancel acceptance & repost" })}
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ── CANCEL ACCEPTANCE CONFIRMATION ── */}
      <AlertDialog open={!!cancelConfirmId} onOpenChange={(o) => !o && setCancelConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Store className="size-5 text-orange-500" />
              {t({ ar: "إلغاء القبول وإعادة النشر", fr: "Annuler l'acceptation & remettre en vente", en: "Cancel acceptance & repost" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t({
                ar: "سيتم إلغاء قبول هذا الطلب، وستُعاد الكمية المطلوبة إلى المخزون، وسيُعاد المنتج للبيع في المتجر. سيتلقى المشتري إشعاراً بالإلغاء.",
                fr: "L'acceptation sera annulée, la quantité sera restituée au stock, et le produit sera remis en vente dans la boutique. L'acheteur recevra une notification d'annulation.",
                en: "The acceptance will be cancelled, the quantity will be restored to stock, and the product will be reposted for sale in the store. The buyer will receive a cancellation notification.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId === cancelConfirmId}>
              {t({ ar: "تراجع", fr: "Annuler", en: "Go back" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={busyId === cancelConfirmId}
              onClick={() => cancelConfirmId && handleResponse(cancelConfirmId, "cancel_acceptance")}
            >
              <RefreshCw className="size-4 me-1" />
              {busyId === cancelConfirmId
                ? t({ ar: "جاري الإلغاء...", fr: "Annulation...", en: "Cancelling..." })
                : t({ ar: "تأكيد الإلغاء وإعادة النشر", fr: "Confirmer & remettre en vente", en: "Confirm & repost" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
