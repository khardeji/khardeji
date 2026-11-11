import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Edit3,
  ExternalLink,
  Flame,
  HandCoins,
  Home,
  Layers,
  Mail,
  MessageSquare,
  Package,
  Phone,
  Plus,
  Receipt,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { STATUS_BADGE } from "@/components/admin/Listings";
import { Confirm, Loading } from "@/components/admin/shared";
import { BoostDialog } from "@/components/site/BoostDialog";
import { EditListingDialog } from "@/components/site/EditListingDialog";
import { MessengerChat } from "@/components/site/MessengerChat";
import { OffersPanel } from "@/components/site/OffersPanel";
import { PurchasesPanel } from "@/components/site/PurchasesPanel";
import { QuantityRequestsPanel } from "@/components/site/QuantityRequestsPanel";
import { PageHeader } from "@/components/site/SectionHeading";
import { BuyTokensDialog, SubscribePlanDialog } from "@/components/site/ServiceOrderDialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BOOST_NAMES,
  getBoostTimeRemaining,
  isBoostActive,
  LISTING_STATUS_LABEL,
  SALE_TYPE_LABEL,
  type Listing,
  type ListingStatus,
} from "@/data/catalog";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useRealtimeDashboard } from "@/hooks/use-realtime";
import { pageMeta, type Msg } from "@/lib/i18n";
import { deleteMyListing, getMyListings, markListingSold } from "@/lib/listings.functions";
import { getEffectivePlan, PLAN_CONFIG } from "@/lib/listing-rules";
import { getIncomingOffers, getMyPurchases, getSellerQuantityRequests } from "@/lib/marketplace.functions";
import { UNIT_LABEL } from "@/lib/quantity";
import {
  getMyBoosts,
  getMyMessages,
  getMyOverview,
  getMyRequests,
  markMessageRead,
  type MessageItem,
  type UserBoostItem,
  type UserRequestItem,
} from "@/lib/services.functions";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  validateSearch: (search: Record<string, unknown>): { tab?: "overview" | "listings" | "messages" | "offers" | "requests" | "purchases" | "subscription" } => ({
    tab: (["overview", "listings", "messages", "offers", "requests", "purchases", "subscription"] as const).includes(search.tab as any)
      ? (search.tab as any)
      : undefined,
  }),
  ssr: false,
  head: ({ match }) => ({
    meta: [
      ...pageMeta(match.context.locale, {
        title: { ar: "لوحة التحكم | خردجي", fr: "Tableau de bord | Khardeji", en: "Dashboard | Khardeji" },
        description: {
          ar: "متابعة رصيد النقاط، إعلاناتك، المراسلات وتجديد الباقات في خردجي.",
          fr: "Gérez vos annonces, votre solde de jetons, vos messages et votre forfait Khardeji.",
          en: "Manage your listings, token balance, messages and Khardeji subscription.",
        },
        card: "summary",
      }),
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h2 className="text-xl font-semibold text-foreground">Tableau de bord temporairement indisponible</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {(error as any)?.message || "Une erreur est survenue lors du chargement de vos données."}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button variant="rust" onClick={() => reset()}>Réessayer</Button>
        <Button asChild variant="outline"><Link to="/">Retour à l'accueil</Link></Button>
      </div>
    </div>
  ),
  component: DashboardPage,
});

export function DashboardPage() {
  const { t, dt, date, num, dir } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  // Instant real-time updates for dashboard, messages, offers, token balance
  useRealtimeDashboard();

  const fetchOverview = useServerFn(getMyOverview);
  const fetchListings = useServerFn(getMyListings);
  const fetchMessages = useServerFn(getMyMessages);
  const fetchRequests = useServerFn(getMyRequests);
  const fetchBoosts = useServerFn(getMyBoosts);
  const removeListing = useServerFn(deleteMyListing);
  const markSold = useServerFn(markListingSold);
  const setRead = useServerFn(markMessageRead);
  const fetchIncomingOffers = useServerFn(getIncomingOffers);
  const fetchSellerQtyReqs = useServerFn(getSellerQuantityRequests);
  const fetchPurchases = useServerFn(getMyPurchases);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["me", "overview"],
    queryFn: () => fetchOverview(),
    enabled: !!user,
    retry: false,
  });
  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ["me", "listings"],
    queryFn: () => fetchListings(),
    enabled: !!user,
    retry: false,
  });
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["me", "messages"],
    queryFn: () => fetchMessages(),
    enabled: !!user,
    retry: false,
  });
  const { data: requests } = useQuery({
    queryKey: ["me", "requests"],
    queryFn: () => fetchRequests(),
    enabled: !!user,
    retry: false,
  });
  const { data: boosts } = useQuery({
    queryKey: ["me", "boosts"],
    queryFn: () => fetchBoosts(),
    enabled: !!user,
    retry: false,
  });
  const { data: incomingOffers } = useQuery({
    queryKey: ["me", "offers", "incoming"],
    queryFn: () => fetchIncomingOffers(),
    enabled: !!user,
    retry: false,
  });
  const { data: sellerQtyReqs } = useQuery({
    queryKey: ["me", "qty_requests", "seller"],
    queryFn: () => fetchSellerQtyReqs(),
    enabled: !!user,
    retry: false,
  });
  const { data: purchasesData } = useQuery({
    queryKey: ["me", "purchases"],
    queryFn: () => fetchPurchases(),
    enabled: !!user,
    retry: false,
  });

  const search = Route.useSearch();
  const [activeTab, setActiveTab] = useState<"overview" | "listings" | "messages" | "offers" | "requests" | "purchases" | "subscription">(
    search.tab || "overview"
  );
  const pendingOffersCount = (incomingOffers ?? []).filter((o) => o.status === "pending").length;
  const pendingQtyReqsCount = (sellerQtyReqs ?? []).filter((r) => r.status === "pending").length;
  const confirmedPurchasesCount = purchasesData?.summary.confirmedPurchases ?? 0;
  const [boostListingId, setBoostListingId] = useState<string | undefined>();
  const [boostOpen, setBoostOpen] = useState(false);
  const [buyPackOpen, setBuyPackOpen] = useState(false);
  const [planDialog, setPlanDialog] = useState<{ id: "pro" | "entreprise"; name: Msg; price: number; isRenewal?: boolean } | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  const approvedListings = (listings ?? []).filter((l) => l.status === "approved");

  const handleMarkSold = async (id: string) => {
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
  };

  const handleDeleteListing = async (id: string) => {
    const res = await removeListing({ data: { id } }).catch(() => ({ ok: false as const }));
    if (res.ok) {
      toast.success(t({ ar: "تم حذف الإعلان بنجاح.", fr: "Annonce supprimée avec succès.", en: "Listing deleted." }));
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["me", "listings"] }),
        qc.invalidateQueries({ queryKey: ["me", "overview"] }),
        qc.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
    } else {
      toast.error(t({ ar: "فشل حذف الإعلان.", fr: "Échec de la suppression.", en: "Failed to delete listing." }));
    }
  };

  const handleMarkRead = async (messageId: string) => {
    await setRead({ data: { messageId } });
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["me", "messages"] }),
      qc.invalidateQueries({ queryKey: ["me", "overview"] }),
    ]);
  };

  if (authLoading || (user && (overviewLoading || listingsLoading))) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <Loading />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-muted-foreground">
          {t({
            ar: "الرجاء تسجيل الدخول للوصول إلى لوحة التحكم.",
            fr: "Veuillez vous connecter pour accéder à votre tableau de bord.",
            en: "Please sign in to access your dashboard.",
          })}
        </p>
        <Button asChild variant="rust" className="mt-4">
          <Link to="/connexion" search={{ redirect: "/tableau-de-bord" }}>
            {t({ ar: "تسجيل الدخول", fr: "Se connecter", en: "Sign in" })}
          </Link>
        </Button>
      </div>
    );
  }

  const tokens = overview?.tokensBalance ?? 0;
  const plan = overview?.subscriptionPlan ?? "basique";
  const planExpiry = overview?.subscriptionExpiresAt;
  const isPro = plan === "pro" || plan === "entreprise";
  const effectivePlan = getEffectivePlan(plan, planExpiry);
  const planLimits = PLAN_CONFIG[effectivePlan] ?? PLAN_CONFIG.basique;
  const activeCount = (overview?.listingsCount.approved ?? 0) + (overview?.listingsCount.pending ?? 0);
  const isLimitReached = activeCount >= planLimits.maxListings;

  return (
    <>
      <PageHeader
        eyebrow={t({ ar: "حسابي الشخصي", fr: "Mon compte", en: "My account" })}
        title={t({ ar: "لوحة التحكم والأنشطة", fr: "Tableau de bord membre", en: "Member Dashboard" })}
        intro={t({
          ar: "متابعة رصيد النقاط، إعلاناتك، المراسلات وتجديد باقتك بكل سهولة.",
          fr: "Suivez vos annonces, boostez votre visibilité, consultez vos messages et gérez votre forfait.",
          en: "Manage listings, boosts, messages and your subscription plan in one place.",
        })}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Solde de Jetons */}
          <div className="surface-card flex flex-col justify-between p-5 ring-1 ring-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="label-stamp text-xs text-rust">{t({ ar: "رصيد النقاط", fr: "Solde de jetons", en: "Token balance" })}</p>
                <p className="mt-2 font-display text-4xl font-bold text-foreground">
                  {num(tokens)}{" "}
                  <span className="text-base font-normal text-muted-foreground">{t({ ar: "نقطة", fr: "jetons", en: "tokens" })}</span>
                </p>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-brass/15 text-brass">
                <Coins className="size-6" />
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="rust" className="w-full text-xs" onClick={() => setBuyPackOpen(true)}>
                <Plus className="size-3.5" /> {t({ ar: "شراء نقاط", fr: "Acheter des jetons", en: "Buy tokens" })}
              </Button>
            </div>
          </div>

          {/* 2. Annonces */}
          <div className="surface-card flex flex-col justify-between p-5 ring-1 ring-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="label-stamp text-xs text-olive">{t({ ar: "إعلاناتي", fr: "Mes annonces", en: "My listings" })}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="font-display text-4xl font-bold text-foreground">
                    {num(overview?.listingsCount.total ?? 0)}
                  </p>
                  {planLimits.maxListings < 9999 && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      / {planLimits.maxListings} {t({ ar: "أقصى", fr: "max", en: "max" })}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {overview?.listingsCount.approved ?? 0} {t({ ar: "منشورة", fr: "en ligne", en: "live" })} · {overview?.listingsCount.pending ?? 0} {t({ ar: "قيد المراجعة", fr: "en attente", en: "pending" })}
                </p>
                {isLimitReached && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded bg-rust/15 px-2 py-0.5 text-[0.68rem] font-bold text-rust">
                    {t({ ar: "تم بلوغ الحد الأقصى", fr: "Limite atteinte", en: "Limit reached" })}
                  </span>
                )}
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-olive/15 text-olive">
                <ShoppingBag className="size-6" />
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm" variant={isLimitReached ? "rust" : "outline"} className="w-full text-xs">
                <Link to="/publier">
                  <Plus className="size-3.5" /> {isLimitReached ? t({ ar: "ترقية الباقة", fr: "Passer en Pro", en: "Upgrade" }) : t({ ar: "نشر إعلان", fr: "Publier", en: "Post" })}
                </Link>
              </Button>
            </div>
          </div>

          {/* 3. Messagerie & Contacts */}
          <div className="surface-card flex flex-col justify-between p-5 ring-1 ring-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="label-stamp text-xs text-brass">{t({ ar: "المراسلات والاتصالات", fr: "Messagerie & Contacts", en: "Messages & Leads" })}</p>
                <p className="mt-2 font-display text-4xl font-bold text-foreground">
                  {num(overview?.messagesCount.total ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(overview?.messagesCount.unread ?? 0) > 0 ? (
                    <span className="font-semibold text-rust">
                      {overview?.messagesCount.unread} {t({ ar: "رسائل غير مقروءة", fr: "non lue(s)", en: "unread" })}
                    </span>
                  ) : (
                    t({ ar: "كل الرسائل مقروءة", fr: "Tous lus", en: "All read" })
                  )}
                </p>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-charcoal text-brass">
                <MessageSquare className="size-6" />
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setActiveTab("messages")}>
                <Mail className="size-3.5" /> {t({ ar: "عرض الرسائل", fr: "Voir les messages", en: "View messages" })}
              </Button>
            </div>
          </div>

          {/* 4. Forfait & Abonnement */}
          <div className="surface-card flex flex-col justify-between p-5 ring-1 ring-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="label-stamp text-xs text-rust">{t({ ar: "الباقة الحالية", fr: "Forfait actuel", en: "Current plan" })}</p>
                <p className="mt-2 font-display text-2xl font-bold uppercase text-foreground">
                  {plan}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {planExpiry ? (
                    `${t({ ar: "ينتهي في", fr: "Expire le", en: "Expires" })} ${date(planExpiry)}`
                  ) : (
                    t({ ar: "باقة مجانية دائمة", fr: "Offre gratuite permanente", en: "Free permanent plan" })
                  )}
                </p>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-rust/15 text-rust">
                <ShieldCheck className="size-6" />
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant={isPro ? "outline" : "rust"}
                className="w-full text-xs"
                onClick={() =>
                  setPlanDialog({
                    id: "pro",
                    name: { ar: "محترف خردة", fr: "Pro Ferrailleur", en: "Scrap Pro" },
                    price: 49,
                    isRenewal: isPro,
                  })
                }
              >
                {isPro
                  ? t({ ar: "تجديد الباقة", fr: "Renouveler", en: "Renew" })
                  : t({ ar: "الترقية للمحترفين", fr: "Passer en Pro", en: "Upgrade to Pro" })}
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="mt-10">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} dir={dir}>
            <TabsList className="mb-6 h-auto flex-wrap justify-start gap-1 bg-muted p-1">
              <TabsTrigger value="overview" className="gap-2 px-4 py-2">
                <Rocket className="size-4" />
                {t({ ar: "الترويج السريع", fr: "Boosts & Actions", en: "Boosts & Actions" })}
              </TabsTrigger>
              <TabsTrigger value="listings" className="gap-2 px-4 py-2">
                <ShoppingBag className="size-4" />
                {t({ ar: "إعلاناتي", fr: "Mes annonces", en: "My listings" })} ({listings?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-2 px-4 py-2">
                <MessageSquare className="size-4" />
                {t({ ar: "المراسلات الواردة", fr: "Messages reçus", en: "Messages received" })}
                {(overview?.messagesCount.unread ?? 0) > 0 && (
                  <Badge variant="destructive" className="ms-1 px-1.5 py-0 text-[0.65rem]">
                    {overview?.messagesCount.unread}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="offers" className="gap-2 px-4 py-2">
                <HandCoins className="size-4" />
                {t({ ar: "عروض الأسعار", fr: "Offres & Négociations", en: "Offers & Deals" })}
                {pendingOffersCount > 0 && (
                  <Badge variant="destructive" className="ms-1 px-1.5 py-0 text-[0.65rem]">
                    {pendingOffersCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2 px-4 py-2">
                <Package className="size-4" />
                {t({ ar: "طلبات الكميات", fr: "Demandes de quantité", en: "Quantity requests" })}
                {pendingQtyReqsCount > 0 && (
                  <Badge variant="destructive" className="ms-1 px-1.5 py-0 text-[0.65rem]">
                    {pendingQtyReqsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="purchases" className="gap-2 px-4 py-2">
                <Receipt className="size-4" />
                {t({ ar: "مشترياتي", fr: "Mes achats", en: "My purchases" })}
                {confirmedPurchasesCount > 0 && (
                  <Badge variant="outline" className="ms-1 border-olive bg-olive/10 text-olive px-1.5 py-0 text-[0.65rem]">
                    {confirmedPurchasesCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="subscription" className="gap-2 px-4 py-2">
                <Layers className="size-4" />
                {t({ ar: "الاشتراكات والطلبات", fr: "Forfait & Demandes", en: "Plan & Requests" })}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: QUICK BOOST */}
            <TabsContent value="overview" className="space-y-6">
              <div className="surface-card p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-semibold">
                      <Rocket className="size-5 text-rust" />
                      {t({ ar: "روّج لإعلاناتك وضاعف مبيعاتك", fr: "Booster une annonce pour vendre plus vite", en: "Boost a listing to sell faster" })}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t({
                        ar: "اختر أي إعلان منشور لتطبيقه في أعلى القوائم أو في الصفحة الرئيسية.",
                        fr: "Sélectionnez une annonce active et utilisez vos jetons pour la remonter en tête ou la mettre à la une.",
                        en: "Select a live listing to bump it or feature it on the homepage using tokens.",
                      })}
                    </p>
                  </div>
                  <Button
                    variant="rust"
                    onClick={() => {
                      setBoostListingId(undefined);
                      setBoostOpen(true);
                    }}
                    className="gap-2 shrink-0"
                    disabled={approvedListings.length === 0}
                  >
                    <Rocket className="size-4" />
                    {t({ ar: "اختيار إعلان وترويجه", fr: "Choisir une annonce à booster", en: "Choose listing to boost" })}
                  </Button>
                </div>

                {/* Boost Services Quick Grid */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <span className="grid size-9 place-items-center rounded-lg bg-charcoal text-brass">
                      <Rocket className="size-5" />
                    </span>
                    <h3 className="mt-3 text-base font-semibold">{t({ ar: "طلّع الإعلان للفوق", fr: "Remonter l'annonce", en: "Bump listing" })}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{t({ ar: "يرجع في أول نتائج البحث.", fr: "Repasse en tête des résultats.", en: "Back to top of search." })}</p>
                    <p className="mt-3 text-sm font-bold text-rust">2 {t({ ar: "نقاط", fr: "jetons", en: "tokens" })}</p>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <span className="grid size-9 place-items-center rounded-lg bg-charcoal text-rust">
                      <Flame className="size-5" />
                    </span>
                    <h3 className="mt-3 text-base font-semibold">{t({ ar: "إعلان مستعجل", fr: "Annonce urgente", en: "Urgent listing" })}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{t({ ar: "علامة «مستعجل» ملفتة للانتباه.", fr: "Badge Urgent rouge bien visible.", en: "Eye-catching urgent badge." })}</p>
                    <p className="mt-3 text-sm font-bold text-rust">3 {t({ ar: "نقاط", fr: "jetons", en: "tokens" })}</p>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <span className="grid size-9 place-items-center rounded-lg bg-charcoal text-brass">
                      <BadgeCheck className="size-5 text-olive" />
                    </span>
                    <h3 className="mt-3 text-base font-semibold">{t({ ar: "إعلان مميّز — 7 أيام", fr: "Premium — 7 jours", en: "Premium — 7 days" })}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{t({ ar: "إطار ذهبي وظهور ذو أولوية.", fr: "Cadre doré et priorité d'affichage.", en: "Gold frame and high priority." })}</p>
                    <p className="mt-3 text-sm font-bold text-rust">8 {t({ ar: "نقاط", fr: "jetons", en: "tokens" })}</p>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <span className="grid size-9 place-items-center rounded-lg bg-charcoal text-olive">
                      <Home className="size-5" />
                    </span>
                    <h3 className="mt-3 text-base font-semibold">{t({ ar: "في الواجهة الرئيسية", fr: "À la une accueil", en: "Featured on home" })}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{t({ ar: "في واجهة الموقع لمدّة 3 أيام.", fr: "Sélection d'accueil pendant 3 jours.", en: "On home selection for 3 days." })}</p>
                    <p className="mt-3 text-sm font-bold text-rust">15 {t({ ar: "نقطة", fr: "jetons", en: "tokens" })}</p>
                  </div>
                </div>
              </div>

              {/* Active Listings with direct boost buttons */}
              <div className="surface-card p-6">
                <h3 className="text-lg font-semibold">{t({ ar: "إعلاناتك المنشورة حالياً", fr: "Vos annonces en ligne prêtes à être boostées", en: "Your live listings" })}</h3>
                {approvedListings.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {t({ ar: "ليس لديك إعلانات مقبولة حالياً.", fr: "Aucune annonce en ligne pour le moment.", en: "No live listings currently." })}
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-border">
                    {approvedListings.slice(0, 5).map((l) => {
                      const listingBoosts = (boosts ?? []).filter((b) => b.listingId === l.id);
                      const hasUrgent = l.urgent || listingBoosts.some((b) => b.boostId === "urgent");
                      const hasFeatured = l.featured || listingBoosts.some((b) => b.boostId === "a-la-une" || b.boostId === "premium-7j");
                      const hasBumped = !!l.boostedAt || listingBoosts.some((b) => b.boostId === "remonter");

                      return (
                      <div key={l.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                          {l.images?.[0] ? (
                            <img src={l.images[0]} alt="" className="size-14 rounded-md object-cover" />
                          ) : (
                            <div className="size-14 rounded-md bg-muted grid place-items-center text-muted-foreground"><ShoppingBag className="size-6" /></div>
                          )}
                          <div>
                            <p className="font-semibold text-foreground">{t(l.title)}</p>
                            <p className="text-xs text-muted-foreground">{dt(l.price)} · {t(SALE_TYPE_LABEL[l.saleType])}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {hasUrgent && (
                                <Badge variant="destructive" className="bg-rust text-white text-[0.65rem] gap-1 px-1.5 py-0 font-medium">
                                  <Flame className="size-3" /> {t({ ar: "مستعجل", fr: "Urgent", en: "Urgent" })}
                                </Badge>
                              )}
                              {hasFeatured && (
                                <Badge className="bg-brass text-brass-foreground font-semibold text-[0.65rem] gap-1 px-1.5 py-0">
                                  <BadgeCheck className="size-3" /> {t({ ar: "في الواجهة", fr: "À la une", en: "Featured" })}
                                </Badge>
                              )}
                              {hasBumped && (
                                <Badge variant="outline" className="border-olive text-olive text-[0.65rem] gap-1 px-1.5 py-0">
                                  <Rocket className="size-3" /> {t({ ar: "تم ترويجها", fr: "Remontée", en: "Bumped" })}
                                </Badge>
                              )}
                              {!hasUrgent && !hasFeatured && !hasBumped && (
                                <span className="text-[0.65rem] text-muted-foreground">{t({ ar: "بدون ترويج حالياً", fr: "Aucun boost actif", en: "No active boost" })}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="rust"
                            className="gap-1.5"
                            onClick={() => {
                              setBoostListingId(l.id);
                              setBoostOpen(true);
                            }}
                          >
                            <Rocket className="size-3.5" />
                            {t({ ar: "روّج هذا الإعلان", fr: "Booster cette annonce", en: "Boost this listing" })}
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link to="/annonces/$id" params={{ id: l.id }}>
                              <ExternalLink className="size-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>

              {/* History of Applied Boosts */}
              <div className="surface-card p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Rocket className="size-5 text-rust" />
                  {t({ ar: "سجل الترويج والإعلانات المعززة", fr: "Historique de vos boosts appliqués", en: "Your boost history" })}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t({
                    ar: "قائمة الإعلانات التي قمت بترويجها وطريقة الترويج المطبقة.",
                    fr: "Retrouvez ici toutes vos annonces boostées et la méthode de boost choisie.",
                    en: "List of all boosted listings and their applied boost method.",
                  })}
                </p>

                {!boosts || boosts.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {t({ ar: "لم تقم بترويج أي إعلان بعد.", fr: "Aucun boost appliqué pour le moment.", en: "No boosts applied yet." })}
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-border">
                    {boosts.map((b: UserBoostItem) => {
                      const isUrgent = b.boostId === "urgent";
                      const isFeatured = b.boostId === "a-la-une";
                      const isPremium = b.boostId === "premium-7j";
                      return (
                        <div key={b.id} className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground text-sm">{t(b.listingTitle)}</span>
                              <Badge
                                className={`text-[0.65rem] gap-1 px-1.5 py-0 ${
                                  isUrgent
                                    ? "bg-rust text-white"
                                    : isFeatured || isPremium
                                    ? "bg-brass text-brass-foreground font-semibold"
                                    : "bg-olive text-white"
                                }`}
                              >
                                {isUrgent ? (
                                  <>
                                    <Flame className="size-3" /> {t({ ar: "مستعجل", fr: "Annonce urgente", en: "Urgent" })}
                                  </>
                                ) : isPremium ? (
                                  <>
                                    <BadgeCheck className="size-3" /> {t({ ar: "مميّز — 7 أيام", fr: "Premium — 7 jours", en: "Premium 7d" })}
                                  </>
                                ) : isFeatured ? (
                                  <>
                                    <Home className="size-3" /> {t({ ar: "في الواجهة الرئيسية", fr: "À la une accueil", en: "Featured on home" })}
                                  </>
                                ) : (
                                  <>
                                    <Rocket className="size-3" /> {t({ ar: "طلّع الإعلان للفوق", fr: "Remonter l'annonce", en: "Bump listing" })}
                                  </>
                                )}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {date(b.createdAt)} · {b.cost} {t({ ar: "نقاط", fr: "jetons déduits", en: "tokens deducted" })}
                            </p>
                          </div>
                          <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                            <Link to="/annonces/$id" params={{ id: b.listingId }}>
                              <ExternalLink className="size-3.5 me-1" />
                              {t({ ar: "عرض الإعلان", fr: "Voir l'annonce", en: "View listing" })}
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: MY LISTINGS */}
            <TabsContent value="listings" className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">{t({ ar: "جميع إعلاناتي", fr: "Toutes mes annonces", en: "All my listings" })}</h3>
                <Button asChild variant="rust" size="sm">
                  <Link to="/publier">
                    <Plus className="size-4" /> {t({ ar: "إعلان جديد", fr: "Nouvelle annonce", en: "New listing" })}
                  </Link>
                </Button>
              </div>

              {!listings || listings.length === 0 ? (
                <div className="surface-card p-10 text-center">
                  <p className="text-muted-foreground">{t({ ar: "ما عندك حتى إعلان.", fr: "Vous n'avez pas encore d'annonce.", en: "No listings yet." })}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.map((l) => {
                    const st = l.status ?? "pending";
                    const isBoosted = l.activeBoost && isBoostActive(l.activeBoost);
                    const remaining = isBoosted ? getBoostTimeRemaining(l.activeBoost!.expiresAt) : null;
                    const listingBoosts = (boosts ?? []).filter((b) => b.listingId === l.id);
                    const hasUrgent = l.urgent || listingBoosts.some((b) => b.boostId === "urgent");
                    const hasFeatured = l.featured || listingBoosts.some((b) => b.boostId === "a-la-une" || b.boostId === "premium-7j");
                    const hasBumped = !!l.boostedAt || listingBoosts.some((b) => b.boostId === "remonter");

                    return (
                      <div key={l.id} className="surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                        {l.images?.[0] ? (
                          <img src={l.images[0]} alt="" className="size-20 shrink-0 rounded-md object-cover" />
                        ) : (
                          <div className="size-20 shrink-0 rounded-md bg-muted grid place-items-center text-muted-foreground"><ShoppingBag className="size-8" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={STATUS_BADGE[st]}>{t(LISTING_STATUS_LABEL[st])}</Badge>
                            <Badge variant="outline">{t(SALE_TYPE_LABEL[l.saleType])}</Badge>
                            {isBoosted ? (
                              <Badge className="bg-gradient-to-r from-rust to-brass text-white text-[0.7rem] gap-1.5 px-2 py-0.5 font-semibold shadow-sm">
                                {l.activeBoost!.boostId === "urgent" ? (
                                  <Flame className="size-3.5 fill-white" />
                                ) : l.activeBoost!.boostId === "remonter" ? (
                                  <Rocket className="size-3.5" />
                                ) : (
                                  <BadgeCheck className="size-3.5 fill-white text-brass" />
                                )}
                                <span>{t(BOOST_NAMES[l.activeBoost!.boostId])}</span>
                                <span className="opacity-75">·</span>
                                <span className="font-normal flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {t(remaining!.label)}
                                </span>
                              </Badge>
                            ) : (
                              <>
                                {hasUrgent && (
                                  <Badge variant="destructive" className="bg-rust text-white text-[0.65rem] gap-1 px-1.5 py-0 font-medium">
                                    <Flame className="size-3" /> {t({ ar: "مستعجل", fr: "Urgent", en: "Urgent" })}
                                  </Badge>
                                )}
                                {hasFeatured && (
                                  <Badge className="bg-brass text-brass-foreground font-semibold text-[0.65rem] gap-1 px-1.5 py-0">
                                    <BadgeCheck className="size-3" /> {t({ ar: "في الواجهة", fr: "À la une", en: "Featured" })}
                                  </Badge>
                                )}
                                {hasBumped && (
                                  <Badge variant="outline" className="border-olive text-olive text-[0.65rem] gap-1 px-1.5 py-0">
                                    <Rocket className="size-3" /> {t({ ar: "تم ترويجها", fr: "Remontée", en: "Bumped" })}
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                          <h4 className="mt-1 truncate font-semibold text-foreground">{t(l.title)}</h4>
                          <p className="text-xs text-muted-foreground">
                            {dt(l.price)} / {UNIT_LABEL[l.unit as keyof typeof UNIT_LABEL] ? t(UNIT_LABEL[l.unit as keyof typeof UNIT_LABEL].short) : (l.unit || "pièce")}
                          </p>
                          {l.moderationNote && (
                            <p className="mt-1 text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded inline-block">
                              {l.moderationNote}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {st === "approved" && (
                            <>
                              {isBoosted ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 border-rust/40 text-rust hover:bg-rust/10 font-semibold text-xs"
                                  onClick={() => {
                                    setBoostListingId(l.id);
                                    setBoostOpen(true);
                                  }}
                                >
                                  <Rocket className="size-3.5 text-rust animate-pulse" />
                                  {t({ ar: "إدارة الترويج", fr: "Gérer le boost", en: "Manage boost" })}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="rust"
                                  className="gap-1.5"
                                  onClick={() => {
                                    setBoostListingId(l.id);
                                    setBoostOpen(true);
                                  }}
                                >
                                  <Rocket className="size-3.5" />
                                  {t({ ar: "ترويج", fr: "Booster", en: "Boost" })}
                                </Button>
                              )}
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

                          {st === "approved" && (
                            <Button asChild size="sm" variant="outline">
                              <Link to="/annonces/$id" params={{ id: l.id }}>
                                <ExternalLink className="size-3.5" /> {t({ ar: "عرض", fr: "Voir", en: "View" })}
                              </Link>
                            </Button>
                          )}

                          <Confirm
                            onConfirm={() => void handleDeleteListing(l.id)}
                            trigger={
                              <Button size="sm" variant="ghost" className="text-destructive">
                                <Trash2 className="size-3.5" />
                              </Button>
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* TAB 3: MESSAGES & CONTACTS */}
            <TabsContent value="messages" className="space-y-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {t({ ar: "المحادثات والرسائل المباشرة", fr: "Messagerie & Discussions en direct", en: "Live Messaging & Chat" })}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t({
                      ar: "تبادل الرسائل مع المشترين مثل الماسنجر والرد عليهم مباشرة أو عبر الواتساب.",
                      fr: "Discutez avec vos acheteurs en direct comme sur Messenger et répondez-leur en un clic.",
                      en: "Chat with buyers back and forth like Messenger and reply instantly.",
                    })}
                  </p>
                </div>
              </div>

              {messagesLoading ? (
                <div className="surface-card p-12"><Loading /></div>
              ) : (
                <MessengerChat
                  messages={messages ?? []}
                  onReplySent={() => {
                    void qc.invalidateQueries({ queryKey: ["me", "messages"] });
                    void qc.invalidateQueries({ queryKey: ["me", "overview"] });
                  }}
                />
              )}
            </TabsContent>

            {/* TAB 4: OFFRES DE NÉGOCIATION */}
            <TabsContent value="offers" className="space-y-4">
              <OffersPanel />
            </TabsContent>

            {/* TAB 5: DEMANDES DE QUANTITÉ */}
            <TabsContent value="requests" className="space-y-4">
              <QuantityRequestsPanel />
            </TabsContent>

            {/* TAB 6: MES ACHATS */}
            <TabsContent value="purchases" className="space-y-4">
              <PurchasesPanel />
            </TabsContent>

            {/* TAB 7: SUBSCRIPTION & REQUESTS */}
            <TabsContent value="subscription" className="space-y-6">
              <div className="surface-card p-6">
                <h3 className="text-lg font-semibold">{t({ ar: "تفاصيل الباقة والاشتراك", fr: "Détails de votre offre & forfait", en: "Subscription plan details" })}</h3>
                <div className="mt-4 flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
                  <div>
                    <span className="font-display text-2xl font-bold uppercase text-rust">{plan}</span>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan === "basique"
                        ? t({ ar: "باقة أساسية مجانية — حتى 5 إعلانات نشيطة و12 صورة لكل إعلان.", fr: "Plan Basique gratuit — jusqu'à 5 annonces actives et 12 photos par annonce.", en: "Free basic plan — up to 5 active listings and 12 photos per listing." })
                        : plan === "pro"
                        ? t({ ar: "باقة محترف خردة — 50 إعلان نشيط، 40 نقطة هدية شهرياً وشارة بائع محترف.", fr: "Pro Ferrailleur — 50 annonces actives, 40 jetons offerts chaque mois et badge pro.", en: "Pro Scrap plan — 50 active listings, 40 free monthly tokens and pro badge." })
                        : t({ ar: "باقة شركات — إعلانات غير محدودة، بوتيك باسمك و150 نقطة هدية شهرياً.", fr: "Entreprise — Annonces illimitées, Boutique à votre nom et 150 jetons offerts chaque mois.", en: "Enterprise plan — Unlimited listings, Branded shop and 150 free monthly tokens." })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="rust"
                      onClick={() =>
                        setPlanDialog({
                          id: "pro",
                          name: { ar: "محترف خردة", fr: "Pro Ferrailleur", en: "Scrap Pro" },
                          price: 49,
                          isRenewal: isPro,
                        })
                      }
                    >
                      {isPro ? t({ ar: "طلب تجديد الباقة", fr: "Renouveler", en: "Renew" }) : t({ ar: "ترقية إلى Pro", fr: "Passer à Pro (49 DT)", en: "Upgrade to Pro" })}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setPlanDialog({
                          id: "entreprise",
                          name: { ar: "شركة", fr: "Entreprise", en: "Business" },
                          price: 149,
                          isRenewal: plan === "entreprise",
                        })
                      }
                    >
                      {t({ ar: "باقة شركة (149 DT)", fr: "Offre Entreprise (149 DT)", en: "Enterprise (149 DT)" })}
                    </Button>
                  </div>
                </div>
              </div>

              {/* History of Requests */}
              <div className="surface-card p-6">
                <h3 className="text-lg font-semibold">{t({ ar: "سجل طلباتي (الاشتراكات والنقاط)", fr: "Historique de vos demandes", en: "Your requests history" })}</h3>
                {!requests || requests.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {t({ ar: "لا توجد طلبات مسجلة بعد.", fr: "Aucune demande en cours.", en: "No requests recorded." })}
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {requests.map((r: UserRequestItem) => (
                      <div key={r.id} className="flex flex-col justify-between gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={r.status === "approved" ? "olive" : r.status === "rejected" ? "secondary" : "brass"}>
                              {r.status === "approved" ? "Validée" : r.status === "rejected" ? "Rejetée" : "En attente"}
                            </Badge>
                            <span className="font-semibold text-foreground text-sm">
                              {r.type === "token_pack"
                                ? `Pack de ${r.tokensCount || 0} jetons`
                                : `Forfait ${(r.planId || "Pro").toUpperCase()}`}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {date(r.createdAt || (r as any).created_at)} · Montant : {dt(r.amount)}
                          </p>
                        </div>
                        {r.adminNotes && (
                          <p className="text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded">
                            Note : {r.adminNotes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Boost Modal */}
      <BoostDialog
        initialListingId={boostListingId}
        open={boostOpen}
        onClose={() => setBoostOpen(false)}
        onRecharge={() => {
          setBoostOpen(false);
          setBuyPackOpen(true);
        }}
      />

      {/* Buy Tokens Pack Modal */}
      <BuyTokensDialog
        open={buyPackOpen}
        onClose={() => setBuyPackOpen(false)}
        onSuccess={() => {
          void qc.invalidateQueries({ queryKey: ["me", "requests"] });
          void qc.invalidateQueries({ queryKey: ["me", "overview"] });
        }}
      />

      {/* Subscribe / Renew Plan Modal */}
      <SubscribePlanDialog
        plan={planDialog}
        isRenewal={planDialog?.isRenewal ?? false}
        open={!!planDialog}
        onClose={() => setPlanDialog(null)}
        onSuccess={() => {
          void qc.invalidateQueries({ queryKey: ["me", "requests"] });
        }}
      />

      {/* Edit Listing Modal */}
      <EditListingDialog
        listing={editingListing}
        open={!!editingListing}
        onClose={() => setEditingListing(null)}
        onSuccess={() => {
          void qc.invalidateQueries({ queryKey: ["me", "listings"] });
        }}
      />
    </>
  );
}

