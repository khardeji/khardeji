import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
  getBuyerQuantityRequests,
  getSellerQuantityRequests,
  respondToQuantityRequest,
} from "@/lib/marketplace.functions";
import { UNIT_LABEL } from "@/lib/quantity";

export const Route = createFileRoute("/_authenticated/mes-demandes")({
  head: ({ match }) => ({
    meta: [
      ...pageMeta(match.context.locale, {
        title: { ar: "طلبات الكميات | خردجي", fr: "Demandes de quantité | Khardeji", en: "Quantity requests | Khardeji" },
        description: {
          ar: "تسيير طلبات شراء الكميات من المشترين ومتابعة المخزون في خردجي.",
          fr: "Gérez les commandes et demandes de quantité de vos acheteurs et suivez vos stocks sur Khardeji.",
          en: "Manage buyer quantity requests and track inventory on Khardeji.",
        },
        card: "summary",
      }),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuantityRequestsPage,
});

function QuantityRequestsPage() {
  const { t, dt, date, num } = useI18n();
  const qc = useQueryClient();

  const fetchSellerReqs = useServerFn(getSellerQuantityRequests);
  const fetchBuyerReqs = useServerFn(getBuyerQuantityRequests);
  const sendResponse = useServerFn(respondToQuantityRequest);

  const sellerQ = useQuery({ queryKey: ["me", "qty_requests", "seller"], queryFn: () => fetchSellerReqs() });
  const buyerQ = useQuery({ queryKey: ["me", "qty_requests", "buyer"], queryFn: () => fetchBuyerReqs() });

  const [activeTab, setActiveTab] = useState<"seller" | "buyer">("seller");
  const [sellerStatusFilter, setSellerStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [buyerStatusFilter, setBuyerStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function handleResponse(requestId: string, action: "accepted" | "rejected") {
    setBusyId(requestId);
    try {
      const res = await sendResponse({ data: { requestId, action } });
      if (res.ok) {
        toast.success(
          action === "accepted"
            ? t({
                ar: `تم قبول الطلب وتحديث المخزون (المتبقي: ${res.remainingStock})`,
                fr: `Commande acceptée ! Stock mis à jour (restant : ${res.remainingStock})`,
                en: `Request accepted! Inventory updated (remaining: ${res.remainingStock})`,
              })
            : t({ ar: "تم رفض الطلب", fr: "Demande refusée", en: "Request declined" }),
        );
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["me", "qty_requests"] }),
          qc.invalidateQueries({ queryKey: ["catalog"] }),
          qc.invalidateQueries({ queryKey: ["me", "listings"] }),
          qc.invalidateQueries({ queryKey: ["me", "notifications"] }),
        ]);
        if (selectedReq?.id === requestId) {
          setSelectedReq((prev: any) =>
            prev ? { ...prev, status: action, availableStock: res.remainingStock ?? prev.availableStock } : null,
          );
        }
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
    <>
      <PageHeader
        eyebrow={t({ ar: "حسابي", fr: "Mon compte", en: "My account" })}
        title={t({ ar: "إدارة طلبات الكميات", fr: "Demandes de quantité", en: "Quantity requests" })}
        intro={t({
          ar: "تسيير ومراقبة طلبات الشراء للكميات المعروضة، مع تحديث فوري للمخزون ومنع البيع الزائد.",
          fr: "Gérez les commandes de vos acheteurs, validez les quantités et suivez vos stocks sans risque de survente.",
          en: "Manage buyer quantity orders, validate amounts, and track inventory without overselling.",
        })}
      />
      <AccountNav current="demandes" />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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

          {/* SELLER INCOMING QUANTITY REQUESTS */}
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
                  const canFulfill = req.availableStock >= req.requestedQuantity;

                  return (
                    <article
                      key={req.id}
                      className="surface-card overflow-hidden p-5 transition-shadow hover:shadow-md"
                    >
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <img
                          src={req.listingImage}
                          alt=""
                          className="h-28 w-full shrink-0 rounded-lg object-cover sm:h-24 sm:w-28"
                          loading="lazy"
                        />

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {statusBadge(req.status)}
                              <span className="text-xs text-muted-foreground">
                                <Clock className="inline size-3 me-1" />
                                {date(req.createdAt)}
                              </span>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                              <Link to="/annonces/$id" params={{ id: req.listingId }}>
                                <ExternalLink className="me-1 size-3" />
                                {t({ ar: "شوف الإعلان", fr: "Voir l'annonce", en: "View listing" })}
                              </Link>
                            </Button>
                          </div>

                          <h3 className="truncate font-display text-lg font-semibold">{t(req.listingTitle)}</h3>

                          {/* Quantities & Totals */}
                          <div className="grid gap-2 text-sm sm:grid-cols-3">
                            <div className="rounded-lg bg-muted/60 p-2.5">
                              <p className="text-xs text-muted-foreground">
                                {t({ ar: "الكمية المطلوبة", fr: "Quantité demandée", en: "Requested quantity" })}
                              </p>
                              <p className="font-display text-lg font-bold text-rust">
                                {num(req.requestedQuantity)} {unitLabel}
                              </p>
                            </div>

                            <div className="rounded-lg bg-muted/60 p-2.5">
                              <p className="text-xs text-muted-foreground">
                                {t({ ar: "المخزون المتوفر", fr: "Stock disponible", en: "Available stock" })}
                              </p>
                              <p className="font-display text-lg font-semibold text-foreground">
                                {num(req.availableStock)} {unitLabel}
                              </p>
                            </div>

                            <div className="rounded-lg bg-muted/60 p-2.5">
                              <p className="text-xs text-muted-foreground">
                                {t({ ar: "المبلغ الإجمالي", fr: "Montant total", en: "Total value" })}
                              </p>
                              <p className="font-display text-lg font-semibold text-brass">
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

                          {/* Buyer & Action Controls */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <User className="size-3.5 text-brass" />
                              <span className="font-medium text-foreground">{req.buyer.name}</span>
                              {req.deliveryLocation && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  · <MapPin className="size-3" /> {req.deliveryLocation}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setSelectedReq(req)}
                              >
                                {t({ ar: "التفاصيل والاتصال", fr: "Détails & contact", en: "Details & contact" })}
                              </Button>

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

          {/* BUYER SENT QUANTITY REQUESTS */}
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
                  return (
                    <article key={req.id} className="surface-card flex flex-col justify-between p-5">
                      <div className="flex gap-4">
                        <img
                          src={req.listingImage}
                          alt=""
                          className="size-20 shrink-0 rounded-lg object-cover"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            {statusBadge(req.status)}
                            <span className="text-xs text-muted-foreground">{date(req.createdAt)}</span>
                          </div>
                          <h4 className="mt-1 truncate font-display font-semibold">{t(req.listingTitle)}</h4>
                          <p className="text-xs text-muted-foreground">
                            {t({ ar: "البائع:", fr: "Vendeur :", en: "Seller:" })} {req.seller.name}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/60 p-3 text-sm">
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

                      <div className="mt-4 flex justify-end">
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                          <Link to="/annonces/$id" params={{ id: req.listingId }}>
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

        {/* FULL DETAILS & BUYER CONTACT MODAL */}
        <Dialog open={!!selectedReq} onOpenChange={(o) => !o && setSelectedReq(null)}>
          {selectedReq && (
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t({ ar: "تفاصيل طلب الكمية", fr: "Détails de la demande", en: "Quantity request details" })}</DialogTitle>
                <DialogDescription>{t(selectedReq.listingTitle)}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
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

                {selectedReq.deliveryLocation && (
                  <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                    <MapPin className="size-4 text-brass shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground">{t({ ar: "مكان التسليم المقترح", fr: "Lieu de livraison souhaité", en: "Delivery location" })}</span>
                      <p className="font-medium text-foreground">{selectedReq.deliveryLocation}</p>
                    </div>
                  </div>
                )}

                {selectedReq.notes && (
                  <div className="rounded-lg border border-border p-3 text-sm">
                    <p className="text-xs font-semibold text-muted-foreground">{t({ ar: "ملاحظات إضافية من المشتري", fr: "Notes de l'acheteur", en: "Buyer notes" })}</p>
                    <p className="mt-1 text-foreground">{selectedReq.notes}</p>
                  </div>
                )}

                {/* Buyer Profile & Contact */}
                <div className="rounded-lg border border-border p-4">
                  <h4 className="font-display text-sm font-semibold">{t({ ar: "معلومات المشتري", fr: "Profil de l'acheteur", en: "Buyer information" })}</h4>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t({ ar: "الاسم", fr: "Nom complet", en: "Full name" })}</dt>
                      <dd className="font-semibold">{selectedReq.buyer.name}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t({ ar: "نوع الحساب", fr: "Type de compte", en: "Account type" })}</dt>
                      <dd className="capitalize">{selectedReq.buyer.accountType}</dd>
                    </div>
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

              <DialogFooter className="gap-2 sm:gap-0">
                {selectedReq.status === "pending" && (
                  <div className="flex w-full gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-destructive"
                      onClick={() => handleResponse(selectedReq.id, "rejected")}
                    >
                      <XCircle className="size-4 me-1" />
                      {t({ ar: "رفض الطلب", fr: "Refuser", en: "Reject" })}
                    </Button>
                    <Button
                      variant="rust"
                      className="flex-1 font-semibold"
                      disabled={selectedReq.availableStock < selectedReq.requestedQuantity}
                      onClick={() => handleResponse(selectedReq.id, "accepted")}
                    >
                      <CheckCircle2 className="size-4 me-1" />
                      {t({ ar: "قبول وتحديث المخزون", fr: "Accepter & déduire", en: "Accept & deduct" })}
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

