import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, ListChecks, LogOut, Menu, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";

const NAV = [
  { to: "/", label: { ar: "الرئيسية", fr: "Accueil", en: "Home" } },
  { to: "/annonces", label: { ar: "الإعلانات", fr: "Annonces", en: "Listings" } },
  { to: "/encheres", label: { ar: "المزايدات", fr: "Enchères", en: "Auctions" } },
  { to: "/categories", label: { ar: "الأصناف", fr: "Catégories", en: "Categories" } },
  { to: "/comment-ca-marche", label: { ar: "كيفاش تخدم؟", fr: "Comment ça marche ?", en: "How it works" } },
  { to: "/services", label: { ar: "الخدمات والنقاط", fr: "Services et jetons", en: "Services & tokens" } },
] as const;

const PUBLISH = { ar: "انشر إعلان", fr: "Publier une annonce", en: "Post a listing" };
const MY_LISTINGS = { ar: "إعلاناتي", fr: "Mes annonces", en: "My listings" };
const ADMIN = { ar: "لوحة الإدارة", fr: "Administration", en: "Admin dashboard" };
const SIGN_OUT = { ar: "تسجيل الخروج", fr: "Se déconnecter", en: "Sign out" };

/** Sign out and drop every private cached answer (my listings, admin data). */
function useSignOut() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return async () => {
    await qc.cancelQueries();
    qc.removeQueries({ queryKey: ["me"] });
    qc.removeQueries({ queryKey: ["admin"] });
    await supabase.auth.signOut();
    navigate({ to: "/connexion", replace: true });
  };
}

function AccountMenu() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const { isAdmin } = useIsAdmin();
  if (!user) return null;
  const name = (user.user_metadata?.["full_name"] as string | undefined) || user.email || "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="hidden max-w-48 sm:inline-flex">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-charcoal font-display text-sm text-brass">
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="truncate">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem onSelect={() => navigate({ to: "/admin" })}>
            <LayoutDashboard /> {t(ADMIN)}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => navigate({ to: "/mes-annonces" })}>
          <ListChecks /> {t(MY_LISTINGS)}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/publier" })}>
          <Plus /> {t(PUBLISH)}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut /> {t(SIGN_OUT)}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const { t, dir } = useI18n();
  const { user, loading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const signOut = useSignOut();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden flex-1 items-center justify-center gap-0.5 xl:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-md px-2.5 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-accent/60 hover:text-foreground data-[status=active]:text-rust"
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1.5 xl:ms-0">
          <LanguageSwitcher />
          {!loading && !user && (
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/connexion">
                <UserRound /> {t({ ar: "دخول", fr: "Connexion", en: "Sign in" })}
              </Link>
            </Button>
          )}
          <AccountMenu />
          <Button asChild variant="rust" className="hidden sm:inline-flex">
            <Link to="/publier">
              <Plus /> {t(PUBLISH)}
            </Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="xl:hidden" aria-label={t({ ar: "فتح القائمة", fr: "Ouvrir le menu", en: "Open menu" })}>
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side={dir === "rtl" ? "left" : "right"} className="w-80 bg-background" dir={dir}>
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mt-6 flex flex-col gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: item.to === "/" }}
                    className="rounded-md px-3 py-3 font-display text-lg text-foreground hover:bg-accent/60 data-[status=active]:text-rust"
                  >
                    {t(item.label)}
                  </Link>
                ))}
                <div className="rivet-rule my-4" />
                {user ? (
                  <>
                    {isAdmin && (
                      <Link to="/admin" className="flex items-center gap-2 rounded-md px-3 py-3 font-display text-lg text-foreground hover:bg-accent/60 data-[status=active]:text-rust">
                        <LayoutDashboard className="size-5" /> {t(ADMIN)}
                      </Link>
                    )}
                    <Link to="/mes-annonces" className="mb-2 flex items-center gap-2 rounded-md px-3 py-3 font-display text-lg text-foreground hover:bg-accent/60 data-[status=active]:text-rust">
                      <ListChecks className="size-5" /> {t(MY_LISTINGS)}
                    </Link>
                    <Button variant="outline" onClick={() => void signOut()}>
                      <LogOut /> {t(SIGN_OUT)}
                    </Button>
                  </>
                ) : (
                  <Button asChild variant="outline">
                    <Link to="/connexion">{t({ ar: "دخول / تسجيل", fr: "Connexion / Inscription", en: "Sign in / Sign up" })}</Link>
                  </Button>
                )}
                <Button asChild variant="rust" className="mt-2">
                  <Link to="/publier">
                    <Plus /> {t(PUBLISH)}
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
