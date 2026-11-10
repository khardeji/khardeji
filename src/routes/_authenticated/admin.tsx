import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, Flag, LayoutDashboard, Layers, ShieldAlert, ShoppingBag, Tags, Users } from "lucide-react";
import { useState } from "react";
import { CategoriesPanel } from "@/components/admin/Categories";
import { ListingsPanel } from "@/components/admin/Listings";
import { Overview } from "@/components/admin/Overview";
import { PricingPanel } from "@/components/admin/Pricing";
import { ReportsPanel } from "@/components/admin/Reports";
import { SubscriptionsPanel } from "@/components/admin/Subscriptions";
import { Loading } from "@/components/admin/shared";
import { UsersPanel } from "@/components/admin/Users";
import { PageHeader } from "@/components/site/SectionHeading";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ListingStatus } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { pageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin")({
  head: ({ match }) => ({
    meta: [
      ...pageMeta(match.context.locale, {
        title: { ar: "لوحة الإدارة | خردجي", fr: "Administration | Khardeji", en: "Admin dashboard | Khardeji" },
        description: {
          ar: "تسيير الحسابات، مراجعة الإعلانات، الأصناف والأسعار في خردجي.",
          fr: "Gestion des comptes, modération des annonces, catégories et tarifs de Khardeji.",
          en: "Manage Khardeji accounts, listing moderation, categories and prices.",
        },
        card: "summary",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type Tab = "overview" | "listings" | "subscriptions" | "reports" | "users" | "categories" | "pricing";

function AdminPage() {
  const { t, dir } = useI18n();
  const { isAdmin, loading } = useIsAdmin();
  const [tab, setTab] = useState<Tab>("overview");
  const [status, setStatus] = useState<ListingStatus | "all">("pending");

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-16"><Loading /></div>;
  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <ShieldAlert className="size-12 text-rust" />
        <h1 className="mt-4 text-3xl font-semibold">{t({ ar: "الدخول ممنوع", fr: "Accès réservé", en: "Restricted area" })}</h1>
        <p className="mt-2 text-muted-foreground">
          {t({ ar: "الصفحة هذي للإدارة برك.", fr: "Cette page est réservée à l'administration du site.", en: "This page is for site administrators only." })}
        </p>
        <Button asChild variant="rust" className="mt-6"><Link to="/">{t({ ar: "ارجع للرئيسية", fr: "Retour à l'accueil", en: "Back to home" })}</Link></Button>
      </div>
    );
  }

  const tabs: { id: Tab; icon: typeof Users; label: string }[] = [
    { id: "overview", icon: LayoutDashboard, label: t({ ar: "نظرة عامة", fr: "Vue d'ensemble", en: "Overview" }) },
    { id: "listings", icon: ShoppingBag, label: t({ ar: "الإعلانات", fr: "Annonces", en: "Listings" }) },
    { id: "subscriptions", icon: CreditCard, label: t({ ar: "الاشتراكات والنقاط", fr: "Demandes", en: "Requests" }) },
    { id: "reports", icon: Flag, label: t({ ar: "التبليغات", fr: "Signalements", en: "Reports" }) },
    { id: "users", icon: Users, label: t({ ar: "الحسابات", fr: "Comptes", en: "Accounts" }) },
    { id: "categories", icon: Layers, label: t({ ar: "الأصناف", fr: "Catégories", en: "Categories" }) },
    { id: "pricing", icon: Tags, label: t({ ar: "الأسعار", fr: "Tarifs", en: "Prices" }) },
  ];

  return (
    <>
      <PageHeader
        eyebrow={t({ ar: "الإدارة", fr: "Administration", en: "Administration" })}
        title={t({ ar: "لوحة التحكّم", fr: "Tableau de bord", en: "Dashboard" })}
        intro={t({ ar: "راجع الإعلانات، سيّر الحسابات، الأصناف والأسعار متاع الموقع.", fr: "Validez les annonces, gérez les comptes, les catégories et les tarifs du site.", en: "Review listings, manage accounts, categories and site prices." })}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} dir={dir}>
          <TabsList className="mb-6 h-auto flex-wrap justify-start gap-1 bg-muted p-1">
            {tabs.map((x) => (
              <TabsTrigger key={x.id} value={x.id} className="gap-2 px-3 py-2">
                <x.icon className="size-4" /> {x.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="overview">
            <Overview
              onOpenUsers={() => setTab("users")}
              onOpenListings={(s) => {
                setStatus(s);
                setTab("listings");
              }}
            />
          </TabsContent>
          <TabsContent value="listings"><ListingsPanel status={status} onStatus={setStatus} /></TabsContent>
          <TabsContent value="subscriptions"><SubscriptionsPanel /></TabsContent>
          <TabsContent value="reports"><ReportsPanel /></TabsContent>
          <TabsContent value="users"><UsersPanel /></TabsContent>
          <TabsContent value="categories"><CategoriesPanel /></TabsContent>
          <TabsContent value="pricing"><PricingPanel /></TabsContent>
        </Tabs>
      </div>
    </>
  );
}
