import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  Coins,
  CreditCard,
  ExternalLink,
  Flame,
  Home,
  Layers,
  Mail,
  MessageSquare,
  Phone,
  Plus,
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
import { PageHeader } from "@/components/site/SectionHeading";
import { BuyTokensDialog, SubscribePlanDialog } from "@/components/site/ServiceOrderDialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LISTING_STATUS_LABEL, SALE_TYPE_LABEL, type ListingStatus } from "@/data/catalog";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { pageMeta, type Msg } from "@/lib/i18n";
import { deleteMyListing, getMyListings } from "@/lib/listings.functions";
import { UNIT_LABEL } from "@/lib/quantity";
import {
  getMyMessages,
  getMyOverview,
  getMyRequests,
  markMessageRead,
  type MessageItem,
  type UserRequestItem,
} from "@/lib/services.functions";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
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
  component: DashboardPage,
});

export function DashboardPage() {
  const { t, dt, date, num, dir } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const fetchOverview = useServerFn(getMyOverview);
  const fetchListings = useServerFn(getMyListings);
  const fetchMessages = useServerFn(getMyMessages);
  const fetchRequests = useServerFn(getMyRequests);
  const removeListing = useServerFn(deleteMyListing);
  const setRead = useServerFn(markMessageRead);

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

  const [activeTab, setActiveTab] = useState<"overview" | "listings" | "messages" | "subscription">("overview");
  const [boostListingId, setBoostListingId] = useState<string | undefined>();
  const [boostOpen, setBoostOpen] = useState(false);
  const [buyPackOpen, setBuyPackOpen] = useState(false);
  const [planDialog, setPlanDialog] = useState<{ id: "pro" | "entreprise"; name: Msg; price: number; isRenewal?: boolean } | null>(null);

  const approvedListings = (listings ?? []).filter((l) => l.status === "approved");

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
                <p className="mt-2 font-display text-4xl font-bold text-foreground">
                  {num(overview?.listingsCount.total ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {overview?.listingsCount.approved ?? 0} {t({ ar: "منشورة", fr: "en ligne", en: "live" })} · {overview?.listingsCount.pending ?? 0} {t({ ar: "قيد المراجعة", fr: "en attente", en: "pending" })}
                </p>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-olive/15 text-olive">
                <ShoppingBag className="size-6" />
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm" variant="outline" className="w-full text-xs">
                <Link to="/publier">
                  <Plus className="size-3.5" /> {t({ ar: "نشر إعلان", fr: "Publier", en: "Post" })}
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
                    {approvedListings.slice(0, 5).map((l) => (
                      <div key={l.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                          <img src={l.images[0]} alt="" className="size-14 rounded-md object-cover" />
                          <div>
                            <p className="font-semibold text-foreground">{t(l.title)}</p>
                            <p className="text-xs text-muted-foreground">{dt(l.price)} · {t(SALE_TYPE_LABEL[l.saleType])}</p>
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
                    ))}
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
                    return (
                      <div key={l.id} className="surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                        <img src={l.images[0]} alt="" className="size-20 shrink-0 rounded-md object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={STATUS_BADGE[st]}>{t(LISTING_STATUS_LABEL[st])}</Badge>
                            <Badge variant="outline">{t(SALE_TYPE_LABEL[l.saleType])}</Badge>
                          </div>
                          <h4 className="mt-1 truncate font-semibold text-foreground">{t(l.title)}</h4>
                          <p className="text-xs text-muted-foreground">{dt(l.price)} / {t(UNIT_LABEL[l.unit].short)}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          {st === "approved" && (
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
                          <Button asChild size="sm" variant="outline">
                            <Link to="/annonces/$id" params={{ id: l.id }}>
                              <ExternalLink className="size-3.5" /> {t({ ar: "عرض", fr: "Voir", en: "View" })}
                            </Link>
                          </Button>
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
              <div className="surface-card p-6">
                <h3 className="text-lg font-semibold">{t({ ar: "المراسلات الواردة من المشترين", fr: "Messages reçus de vos acheteurs", en: "Messages received from buyers" })}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t({
                    ar: "المستخدمون الذين قاموا بالضغط على «راسل» في إعلاناتك للاتصال بك.",
                    fr: "Les visiteurs et acheteurs qui ont utilisé le bouton « Contacter » sur vos annonces.",
                    en: "Buyers who contacted you through the 'Contact' button on your listings.",
                  })}
                </p>

                {messagesLoading ? (
                  <div className="p-8"><Loading /></div>
                ) : !messages || messages.length === 0 ? (
                  <p className="mt-6 rounded-md bg-muted p-8 text-center text-sm text-muted-foreground">
                    {t({ ar: "لم تتلق أي رسائل بعد.", fr: "Aucun message reçu pour le moment.", en: "No messages received yet." })}
                  </p>
                ) : (
                  <div className="mt-6 space-y-3">
                    {messages.map((m: MessageItem) => (
                      <div
                        key={m.id}
                        className={`rounded-xl border p-4 transition ${
                          !m.isRead && !m.isMine ? "border-rust bg-rust/5" : "border-border bg-card"
                        }`}
                      >
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{m.senderName}</span>
                            {m.isMine && (
                              <Badge variant="outline" className="text-[0.65rem]">{t({ ar: "مرسلة منّي", fr: "Envoyé par moi", en: "Sent by me" })}</Badge>
                            )}
                            {!m.isRead && !m.isMine && (
                              <Badge variant="destructive" className="text-[0.65rem]">{t({ ar: "جديدة", fr: "Nouveau", en: "New" })}</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{date(m.createdAt)}</span>
                        </div>

                        {m.listingTitle && (
                          <p className="mt-1 text-xs text-rust font-medium">
                            {t({ ar: "بخصوص :", fr: "Concerne :", en: "About:" })} « {t(m.listingTitle)} »
                          </p>
                        )}

                        <p className="mt-3 rounded-lg bg-background/80 p-3 text-sm text-foreground whitespace-pre-line border border-border/50">
                          {m.content}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                          <div className="flex items-center gap-3">
                            {m.senderPhone && (
                              <a href={`tel:${m.senderPhone}`} className="flex items-center gap-1 text-olive hover:underline font-mono">
                                <Phone className="size-3.5" /> {m.senderPhone}
                              </a>
                            )}
                            {m.senderEmail && (
                              <span className="text-muted-foreground">{m.senderEmail}</span>
                            )}
                          </div>

                          {!m.isRead && !m.isMine && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => void handleMarkRead(m.id)}>
                              <Check className="size-3.5" /> {t({ ar: "تحديد كمقروء", fr: "Marquer comme lu", en: "Mark as read" })}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 4: SUBSCRIPTION & REQUESTS */}
            <TabsContent value="subscription" className="space-y-6">
              <div className="surface-card p-6">
                <h3 className="text-lg font-semibold">{t({ ar: "تفاصيل الباقة والاشتراك", fr: "Détails de votre offre & forfait", en: "Subscription plan details" })}</h3>
                <div className="mt-4 flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
                  <div>
                    <span className="font-display text-2xl font-bold uppercase text-rust">{plan}</span>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan === "basique"
                        ? t({ ar: "باقة أساسية مجانية — نشر حتى 5 إعلانات.", fr: "Plan Basique gratuit — jusqu'à 5 annonces actives.", en: "Free basic plan — up to 5 active listings." })
                        : plan === "pro"
                        ? t({ ar: "باقة محترف خردة — 50 إعلان و40 نقطة شهرياً.", fr: "Pro Ferrailleur — 50 annonces et 40 jetons offerts chaque mois.", en: "Pro Scrap plan — 50 listings & 40 monthly tokens." })
                        : t({ ar: "باقة شركات — إعلانات غير محدودة و150 نقطة شهرياً.", fr: "Entreprise — Annonces illimitées et 150 jetons offerts chaque mois.", en: "Enterprise plan — Unlimited listings & 150 monthly tokens." })}
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
                              {r.type === "token_pack" ? `Pack de ${r.tokensCount} jetons` : `Forfait ${r.planId?.toUpperCase()}`}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{date(r.createdAt)} · Montant : {dt(r.amount)}</p>
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
        pack={{ id: "pack-30", tokens: 30, price: 25 }}
        open={buyPackOpen}
        onClose={() => setBuyPackOpen(false)}
        onSuccess={() => {
          void qc.invalidateQueries({ queryKey: ["me", "requests"] });
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
    </>
  );
}

