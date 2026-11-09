import { Link } from "@tanstack/react-router";
import { Menu, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "./Logo";

const NAV = [
  { to: "/", label: "Accueil" },
  { to: "/annonces", label: "Annonces" },
  { to: "/encheres", label: "Enchères" },
  { to: "/categories", label: "Catégories" },
  { to: "/comment-ca-marche", label: "Comment ça marche ?" },
  { to: "/services", label: "Services et jetons" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Logo />

        <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-accent/60 hover:text-foreground data-[status=active]:text-rust"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-0">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/connexion">
              <UserRound /> Connexion
            </Link>
          </Button>
          <Button asChild variant="rust" className="hidden sm:inline-flex">
            <Link to="/publier">
              <Plus /> Publier une annonce
            </Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="xl:hidden" aria-label="Ouvrir le menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-background">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mt-6 flex flex-col gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: item.to === "/" }}
                    className="rounded-md px-3 py-3 font-display text-lg text-foreground hover:bg-accent/60 data-[status=active]:text-rust"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="rivet-rule my-4" />
                <Button asChild variant="outline">
                  <Link to="/connexion">Connexion / Inscription</Link>
                </Button>
                <Button asChild variant="rust" className="mt-2">
                  <Link to="/publier">
                    <Plus /> Publier une annonce
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
