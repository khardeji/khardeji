import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gavel,
  HandCoins,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  User,
  Wallet,
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
import { useI18n } from "@/hooks/use-i18n";
import { getMyPurchases, type UserPurchase } from "@/lib/marketplace.functions";
import { UNIT_LABEL } from "@/lib/quantity";
import { resolveImage } from "@/data/catalog";

export function PurchasesPanel() {
  const { t, dt, date, num, dir } = useI18n();
  const qc = useQueryClient();

  const fetchPurchases = useServerFn(getMyPurchases);
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["me", "purchases"],
    queryFn: () => fetchPurchases(),
  });

  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending" | "declined">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "direct" | "negociation" | "auction">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<UserPurchase | null>(null);

  const purchases = data?.purchases ?? [];
  const summary = data?.summary ?? {
    totalPurchases: 0,
    confirmedPurchases: 0,
    pendingPurchases: 0,
    totalSpent: 0,
  };

  const filteredPurchases = purchases.filter((p) => {
    // 1. Status Filter
    if (statusFilter === "confirmed") {
      if (p.status !== "accepted" && p.status !== "won") return false;
    } else if (statusFilter === "pending") {
      if (p.status !== "pending" && p.status !== "active") return false;
    } else if (statusFilter === "declined") {
      if (p.status !== "rejected" && p.status !== "cancelled" && p.status !== "outbid") return false;
    }

    // 2. Type Filter
    if (typeFilter !== "all" && p.type !== typeFilter) return false;

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = Object.values(p.listingTitle).some((v) => typeof v === "string" && v.toLowerCase().includes(q));
      const sellerMatch = p.seller.name.toLowerCase().includes(q) || p.seller.phone.includes(q);
      const locMatch = (p.deliveryLocation || "").toLowerCase().includes(q);
      if (!titleMatch && !sellerMatch && !locMatch) return false;
    }

    return true;
  });

  function renderStatusBadge(status: UserPurchase["status"]) {
    switch (status) {
      case "accepted":
        return (
          <Badge className="bg-olive/90 text-white font-medium hover:bg-olive gap-1">
            <CheckCircle2 className="size-3" />
            {t({ ar: "تم قبول الشراء", fr: "Achat confirmé", en: "Purchase confirmed" })}
          </Badge>
        );
      case "won":
        return (
          <Badge className="bg-brass text-white font-medium hover:bg-brass/90 gap-1">
            <Gavel className="size-3" />
            {t({ ar: "فوز بالمزاد", fr: "Enchère remportée", en: "Auction won" })}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium gap-1">
            <Clock className="size-3" />
            {t({ ar: "في الانتظار", fr: "En attente du vendeur", en: "Pending seller" })}
          </Badge>
        );
      case "active":
        return (
          <Badge variant="outline" className="border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-medium gap-1">
            <TrendingUp className="size-3" />
            {t({ ar: "عرضك هو الأعلى", fr: "Meilleure offre en cours", en: "Leading bid" })}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="size-3" />
            {t({ ar: "مرفوض", fr: "Commande refusée", en: "Declined" })}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="border-muted-foreground/30 bg-muted/40 text-muted-foreground gap-1">
            <AlertCircle className="size-3" />
            {t({ ar: "ملغى", fr: "Annulée", en: "Cancelled" })}
          </Badge>
        );
      case "outbid":
        return (
          <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground gap-1">
            {t({ ar: "تمت المزايدة عليك", fr: "Surenchéri", en: "Outbid" })}
          </Badge>
        );
      default:
        return null;
    }
  }

  function renderTypeBadge(type: UserPurchase["type"]) {
    switch (type) {
      case "direct":
        return (
          <Badge variant="secondary" className="text-[0.7rem] bg-rust/10 text-rust border border-rust/20">
            <ShoppingCart className="size-3 me-1 inline" />
            {t({ ar: "سعر ثابت", fr: "Prix fixe", en: "Fixed price" })}
          </Badge>
        );
      case "negociation":
        return (
          <Badge variant="secondary" className="text-[0.7rem] bg-brass/10 text-brass border border-brass/20">
            <HandCoins className="size-3 me-1 inline" />
            {t({ ar: "عرض متفاوض عليه", fr: "Offre négociée", en: "Negotiated" })}
          </Badge>
        );
      case "auction":
        return (
          <Badge variant="secondary" className="text-[0.7rem] bg-olive/10 text-olive border border-olive/20">
            <Gavel className="size-3 me-1 inline" />
            {t({ ar: "مزاد علني", fr: "Enchère", en: "Auction" })}
          </Badge>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 1. KPI SUMMARY STATS CARDS ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Confirmed Purchases */}
        <div className="surface-card flex flex-col justify-between p-5 ring-1 ring-border border-s-4 border-s-olive">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-stamp text-xs text-olive">
                {t({ ar: "المشتريات المؤكدة", fr: "Achats confirmés", en: "Confirmed purchases" })}
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">
                {num(summary.confirmedPurchases)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t({ ar: "طلب مقبول أو مزاد فائز", fr: "Commandes validées & gagnées", en: "Accepted & won orders" })}
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-olive/15 text-olive">
              <ShieldCheck className="size-6" />
            </span>
          </div>
        </div>

        {/* Total Spent in DT */}
        <div className="surface-card flex flex-col justify-between p-5 ring-1 ring-border border-s-4 border-s-rust">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-stamp text-xs text-rust">
                {t({ ar: "إجمالي المشتريات", fr: "Total dépensé", en: "Total spent" })}
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-rust">
                {dt(summary.totalSpent)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t({ ar: "على المعاملات المكتملة", fr: "Sur vos achats confirmés", en: "On confirmed orders" })}
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-rust/15 text-rust">
              <Wallet className="size-6" />
            </span>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="surface-card flex flex-col justify-between p-5 ring-1 ring-border border-s-4 border-s-amber-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-stamp text-xs text-amber-600 dark:text-amber-400">
                {t({ ar: "في انتظار البائع", fr: "Commandes en attente", en: "Pending orders" })}
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">
                {num(summary.pendingPurchases)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t({ ar: "في انتظار تأكيد البائعين", fr: "En attente de réponse", en: "Awaiting confirmation" })}
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock className="size-6" />
            </span>
          </div>
        </div>

        {/* Total Orders History */}
        <div className="surface-card flex flex-col justify-between p-5 ring-1 ring-border border-s-4 border-s-brass">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-stamp text-xs text-brass">
                {t({ ar: "سجل الطلبات الكلي", fr: "Historique total", en: "Total orders" })}
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">
                {num(summary.totalPurchases)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t({ ar: "سعر ثابت، تفاوض ومزادات", fr: "Direct, négociations & enchères", en: "Direct, offers & auctions" })}
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-brass/15 text-brass">
              <Receipt className="size-6" />
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. FILTER & SEARCH TOOLBAR ── */}
      <div className="surface-card p-4 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant={statusFilter === "all" ? "rust" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusFilter("all")}
            >
              {t({ ar: "الكل", fr: "Tous", en: "All" })} ({purchases.length})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "confirmed" ? "rust" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusFilter("confirmed")}
            >
              <CheckCircle2 className="size-3.5 me-1 text-olive" />
              {t({ ar: "المشتريات المؤكدة", fr: "Confirmés / Achetés", en: "Confirmed" })} ({summary.confirmedPurchases})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "pending" ? "rust" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusFilter("pending")}
            >
              <Clock className="size-3.5 me-1 text-amber-500" />
              {t({ ar: "في الانتظار", fr: "En attente", en: "Pending" })} ({summary.pendingPurchases})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "declined" ? "rust" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusFilter("declined")}
            >
              {t({ ar: "ملغاة / مرفوضة", fr: "Refusés / Annulés", en: "Cancelled/Declined" })}
            </Button>
          </div>

          {/* Type Filter & Refresh */}
          <div className="flex items-center gap-2">
            <select
              aria-label={t({ ar: "نوع الشراء", fr: "Type d'achat", en: "Purchase type" })}
              className="h-8 rounded-md border border-input bg-card px-2.5 text-xs outline-none focus:border-rust"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
            >
              <option value="all">{t({ ar: "جميع أنواع المعاملات", fr: "Tous les modes de vente", en: "All purchase modes" })}</option>
              <option value="direct">{t({ ar: "سعر ثابت", fr: "Commandes prix fixe", en: "Fixed price orders" })}</option>
              <option value="negociation">{t({ ar: "عروض أسعار متفاوض عليها", fr: "Négociations & offres", en: "Negotiated deals" })}</option>
              <option value="auction">{t({ ar: "مزادات علنية", fr: "Enchères", en: "Auctions" })}</option>
            </select>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => refetch()}
              disabled={isRefetching}
              title={t({ ar: "تحديث", fr: "Actualiser", en: "Refresh" })}
            >
              <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t({
              ar: "ابحث باسم المنتج، اسم البائع، الهاتف، أو مكان التسليم...",
              fr: "Rechercher par article, vendeur, téléphone ou lieu de livraison...",
              en: "Search by item title, seller name, phone, or location...",
            })}
            className="h-9 w-full rounded-md border border-input bg-card ps-9 pe-4 text-xs outline-none focus:border-rust focus:ring-1 focus:ring-rust"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── 3. PURCHASES LIST ── */}
      {isLoading ? (
        <Loading />
      ) : filteredPurchases.length === 0 ? (
        <div className="surface-card flex flex-col items-center p-12 text-center">
          <ShoppingBag className="size-12 text-muted-foreground" />
          <h3 className="mt-3 font-display text-xl font-medium">
            {t({ ar: "لا توجد مشتريات مطابقة", fr: "Aucun achat dans cette section", en: "No purchases found" })}
          </h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {t({
              ar: "عندما تطلب كمية بسعر ثابت، تقدم عرض سعر، أو تفوز بمزاد، ستظهر جميع تفاصيل مشترياتك وفواتيرك هنا.",
              fr: "Lorsque vous commandez une quantité, négociez un prix ou participez à une enchère, retrouvez toutes vos transactions ici.",
              en: "When you place a quantity order, negotiate an offer or bid on auctions, track all your purchases here.",
            })}
          </p>
          <Button asChild variant="rust" className="mt-5">
            <Link to="/annonces">{t({ ar: "تصفح الإعلانات المتاحة", fr: "Explorer les annonces", en: "Explore listings" })}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPurchases.map((p) => {
            const unitLabel = UNIT_LABEL[p.unit as keyof typeof UNIT_LABEL]?.short
              ? t(UNIT_LABEL[p.unit as keyof typeof UNIT_LABEL].short)
              : p.unit;
            const imgSrc = resolveImage(p.listingImage || "listing-recup");
            const isConfirmed = p.status === "accepted" || p.status === "won";

            return (
              <article
                key={p.id}
                className={`surface-card flex flex-col overflow-hidden transition-shadow hover:shadow-md ${
                  isConfirmed ? "border-olive/40 ring-1 ring-olive/20" : ""
                }`}
              >
                {/* Product Image Hero */}
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  <img
                    src={imgSrc}
                    alt={t(p.listingTitle)}
                    className="size-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = resolveImage("listing-recup");
                    }}
                  />
                  <div className="absolute top-2 start-2 flex flex-col gap-1 items-start">
                    {renderStatusBadge(p.status)}
                    {renderTypeBadge(p.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-4 gap-3">
                  <div>
                    <h4 className="font-display font-semibold leading-tight line-clamp-1 hover:text-rust">
                      <Link to="/annonces/$id" params={{ id: p.listingId }}>
                        {t(p.listingTitle)}
                      </Link>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Calendar className="size-3 text-muted-foreground" />
                      {date(p.createdAt)}
                    </p>
                  </div>

                  {/* Pricing and Quantity Box */}
                  <div className="rounded-lg bg-muted/60 p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {t({ ar: "الكمية المطلوبة:", fr: "Quantité :", en: "Quantity:" })}
                      </span>
                      <span className="font-semibold text-foreground">
                        {num(p.quantity)} {unitLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {t({ ar: "سعر الوحدة:", fr: "Prix unitaire :", en: "Unit price:" })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {dt(p.unitPrice)} / {unitLabel}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between border-t border-border pt-1.5 mt-1">
                      <span className="text-xs font-semibold text-foreground">
                        {t({ ar: "المجموع الإجمالي:", fr: "Total :", en: "Total amount:" })}
                      </span>
                      <span className="font-display text-lg font-bold text-rust">
                        {dt(p.totalPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Location if any */}
                  {p.deliveryLocation && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5 text-brass shrink-0" />
                      <span className="truncate">{p.deliveryLocation}</span>
                    </div>
                  )}

                  {/* Seller Contact Card */}
                  <div className="rounded-md border border-border p-2.5 bg-background/50 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <User className="size-3 text-brass" />
                        {t({ ar: "البائع:", fr: "Vendeur :", en: "Seller:" })}
                      </span>
                      <span className="font-semibold text-foreground truncate max-w-[130px]">
                        {p.seller.name}
                      </span>
                    </div>
                    {p.seller.phone && (
                      <div className="mt-1 flex items-center justify-between pt-1 border-t border-border/50">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Phone className="size-3 text-rust" />
                          {t({ ar: "الهاتف:", fr: "Tél :", en: "Phone:" })}
                        </span>
                        <a
                          href={`tel:${p.seller.phone}`}
                          className="font-semibold text-rust underline hover:text-rust/80"
                          dir="ltr"
                        >
                          {p.seller.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-auto pt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="rust"
                      size="sm"
                      className="flex-1 h-8 text-xs gap-1"
                      onClick={() => setSelectedPurchase(p)}
                    >
                      <Receipt className="size-3" />
                      {t({ ar: "تفاصيل الطلب", fr: "Détails & Facture", en: "Order details" })}
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs px-2.5"
                      title={t({ ar: "مشاهدة الإعلان", fr: "Voir l'annonce", en: "View listing" })}
                    >
                      <Link to="/annonces/$id" params={{ id: p.listingId }}>
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── 4. PURCHASE DETAILS & RECEIPT MODAL ── */}
      <Dialog open={!!selectedPurchase} onOpenChange={(o) => !o && setSelectedPurchase(null)}>
        {selectedPurchase && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pe-6">
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="size-5 text-rust" />
                  {t({ ar: "تفاصيل المعاملة والوصل", fr: "Fiche d'achat & Reçu", en: "Purchase receipt" })}
                </DialogTitle>
              </div>
              <DialogDescription>
                {t({ ar: "معرف الطلب:", fr: "Réf. commande :", en: "Order ID:" })} #{selectedPurchase.id.slice(-8)} · {date(selectedPurchase.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Product preview banner */}
              <div className="relative overflow-hidden rounded-xl bg-muted aspect-video w-full">
                <img
                  src={resolveImage(selectedPurchase.listingImage || "listing-recup")}
                  alt={t(selectedPurchase.listingTitle)}
                  className="size-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = resolveImage("listing-recup");
                  }}
                />
                <div className="absolute top-3 start-3 flex flex-col gap-1 items-start">
                  {renderStatusBadge(selectedPurchase.status)}
                  {renderTypeBadge(selectedPurchase.type)}
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="absolute bottom-3 end-3 h-7 text-xs bg-background/90"
                >
                  <Link to="/annonces/$id" params={{ id: selectedPurchase.listingId }}>
                    <ExternalLink className="me-1 size-3" />
                    {t({ ar: "صفحة الإعلان", fr: "Voir l'annonce", en: "View listing" })}
                  </Link>
                </Button>
              </div>

              {/* Status explanation notice */}
              {(selectedPurchase.status === "accepted" || selectedPurchase.status === "won") ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-olive/30 bg-olive/10 p-3 text-xs text-olive dark:text-olive">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">
                      {t({ ar: "تم تأكيد عملية الشراء!", fr: "Achat validé et confirmé !", en: "Purchase confirmed!" })}
                    </p>
                    <p className="mt-0.5 text-muted-foreground">
                      {t({
                        ar: "قام البائع بتأكيد طلبك وتخصيص الكمية المطلوبة. يمكنك الآن الاتصال به مباشرة لإتمام الاستلام والدفع.",
                        fr: "Le vendeur a confirmé votre achat et déduit la quantité du stock. Vous pouvez le contacter ci-dessous pour finaliser la livraison et le paiement.",
                        en: "The seller confirmed your purchase. You can contact them below to arrange delivery and payment.",
                      })}
                    </p>
                  </div>
                </div>
              ) : selectedPurchase.status === "pending" ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  <Clock className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">
                      {t({ ar: "طلب الشراء في انتظار رد البائع", fr: "En attente de confirmation", en: "Pending seller confirmation" })}
                    </p>
                    <p className="mt-0.5 text-muted-foreground">
                      {t({
                        ar: "تم إرسال الطلب بنجاح إلى البائع. ستتلقى إشعاراً فور مراجعته وقبوله.",
                        fr: "Votre demande a été transmise au vendeur. Vous recevrez une notification dès sa réponse.",
                        en: "Your order was sent to the seller. You will be notified once they respond.",
                      })}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Breakdown Table */}
              <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
                <h4 className="font-display font-semibold text-sm">
                  {t(selectedPurchase.listingTitle)}
                </h4>

                <div className="border-t border-border pt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t({ ar: "الكمية المشتراة", fr: "Quantité", en: "Quantity" })}</span>
                    <span className="font-semibold">{num(selectedPurchase.quantity)} {selectedPurchase.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t({ ar: "سعر الوحدة", fr: "Prix unitaire", en: "Unit price" })}</span>
                    <span>{dt(selectedPurchase.unitPrice)} / {selectedPurchase.unit}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
                    <span className="text-foreground">{t({ ar: "المبلغ الإجمالي", fr: "Total à régler", en: "Total amount" })}</span>
                    <span className="font-display text-xl font-bold text-rust">{dt(selectedPurchase.totalPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery location & notes if any */}
              {(selectedPurchase.deliveryLocation || selectedPurchase.notes) && (
                <div className="rounded-lg bg-muted/60 p-3 space-y-2 text-xs">
                  {selectedPurchase.deliveryLocation && (
                    <div className="flex items-start gap-2">
                      <MapPin className="size-3.5 text-brass shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-muted-foreground">{t({ ar: "مكان التسليم المطلوب:", fr: "Lieu de livraison :", en: "Delivery location:" })}</span>
                        <p className="font-medium text-foreground">{selectedPurchase.deliveryLocation}</p>
                      </div>
                    </div>
                  )}
                  {selectedPurchase.notes && (
                    <div className="pt-1 border-t border-border/50">
                      <span className="font-semibold text-muted-foreground">{t({ ar: "ملاحظات إضافية:", fr: "Notes :", en: "Notes:" })}</span>
                      <p className="mt-0.5 text-foreground">{selectedPurchase.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Seller Contact Card */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-sm font-semibold flex items-center gap-2">
                    <User className="size-4 text-brass" />
                    {t({ ar: "معلومات البائع", fr: "Coordonnées du vendeur", en: "Seller contact info" })}
                  </h4>
                  <Badge variant="outline" className="capitalize text-xs">
                    {selectedPurchase.seller.accountType || "Particulier"}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t({ ar: "الاسم", fr: "Nom", en: "Name" })}</span>
                    <span className="font-medium">{selectedPurchase.seller.name}</span>
                  </div>

                  {selectedPurchase.seller.phone && (
                    <div className="flex items-center justify-between border-t border-border/60 pt-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="size-3.5 text-rust" />
                        {t({ ar: "رقم الهاتف", fr: "Téléphone", en: "Phone" })}
                      </span>
                      <a
                        href={`tel:${selectedPurchase.seller.phone}`}
                        className="font-semibold text-rust underline"
                        dir="ltr"
                      >
                        {selectedPurchase.seller.phone}
                      </a>
                    </div>
                  )}

                  {selectedPurchase.seller.email && (
                    <div className="flex items-center justify-between border-t border-border/60 pt-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="size-3.5 text-brass" />
                        {t({ ar: "البريد الإلكتروني", fr: "Email", en: "Email" })}
                      </span>
                      <a
                        href={`mailto:${selectedPurchase.seller.email}`}
                        className="text-xs underline text-foreground"
                      >
                        {selectedPurchase.seller.email}
                      </a>
                    </div>
                  )}
                </div>

                {/* Direct Seller Contact Buttons */}
                {selectedPurchase.seller.phone && (
                  <div className="pt-2 flex gap-2">
                    <Button
                      asChild
                      variant="rust"
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                    >
                      <a href={`tel:${selectedPurchase.seller.phone}`}>
                        <Phone className="size-3.5" />
                        {t({ ar: "اتصال بالبائع", fr: "Appeler le vendeur", en: "Call seller" })}
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                    >
                      <a
                        href={`https://wa.me/${selectedPurchase.seller.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle className="size-3.5 text-emerald-600" />
                        WhatsApp
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPurchase(null)}>
                {t({ ar: "إغلاق", fr: "Fermer", en: "Close" })}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
