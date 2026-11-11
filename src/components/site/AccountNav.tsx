import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Gavel, HandCoins, Heart, Home, ListChecks, Package, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";

export interface AccountNavProps {
  current?: "annonces" | "offres" | "demandes" | "favoris" | "publier" | "achats";
}

export function AccountNav({ current }: AccountNavProps) {
  const { t, dir } = useI18n();
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  const tabs = [
    {
      id: "annonces",
      to: "/mes-annonces" as const,
      icon: ListChecks,
      label: { ar: "إعلاناتي", fr: "Mes annonces", en: "My listings" },
    },
    {
      id: "achats",
      to: "/tableau-de-bord" as const,
      search: { tab: "purchases" as const },
      icon: Receipt,
      label: { ar: "مشترياتي", fr: "Mes achats", en: "My purchases" },
    },
    {
      id: "favoris",
      to: "/mes-favoris" as const,
      icon: Heart,
      label: { ar: "مفضلتي", fr: "Mes favoris", en: "My favourites" },
    },
    {
      id: "publier",
      to: "/publier" as const,
      icon: Plus,
      label: { ar: "انشر إعلان", fr: "Publier", en: "Post listing" },
    },
  ];

  return (
    <div className="border-b border-border bg-card/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        {/* Breadcrumb & Home Return Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-medium text-foreground/80 transition-colors hover:text-rust"
            >
              <Home className="size-4 text-rust" />
              <span>{t({ ar: "الرئيسية", fr: "Accueil", en: "Home" })}</span>
            </Link>
            <span>/</span>
            <span className="text-foreground">{t({ ar: "حسابي", fr: "Mon compte", en: "My account" })}</span>
          </nav>

          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
            <Link to="/">
              <BackArrow className="size-3.5" />
              <span>{t({ ar: "الرجوع للرئيسية", fr: "Retour à l'accueil", en: "Back to Home" })}</span>
            </Link>
          </Button>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none sm:gap-2">
          {tabs.map((tab) => {
            const active = current === tab.id;
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                asChild
                variant={active ? "rust" : "ghost"}
                size="sm"
                className={`shrink-0 gap-1.5 text-xs sm:text-sm ${
                  active ? "font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link to={tab.to} search={(tab as any).search}>
                  <Icon className="size-4" />
                  <span>{t(tab.label)}</span>
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

