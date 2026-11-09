import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Gavel, HandCoins, Megaphone, ShieldCheck, Truck, Wrench } from "lucide-react";
import heroImg from "@/assets/hero-workshop.jpg";
import { Button } from "@/components/ui/button";
import { AuctionCard } from "@/components/site/AuctionCard";
import { HeroSearch } from "@/components/site/HeroSearch";
import { ListingCard } from "@/components/site/ListingCard";
import { SectionHeading } from "@/components/site/SectionHeading";
import { CATEGORIES, LISTINGS } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Khardeji — La ferraille a de la valeur | Marketplace Tunisie" },
      {
        name: "description",
        content:
          "Achetez, vendez et enchérissez sur les pièces automobiles, métaux et matériaux de récupération partout en Tunisie. Prix en DT, 24 gouvernorats.",
      },
      { property: "og:title", content: "Khardeji — La ferraille a de la valeur" },
      {
        property: "og:description",
        content: "La marketplace tunisienne de la ferraille, des pièces auto et des enchères de récupération.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const STEPS = [
  { icon: Megaphone, title: "Publiez votre annonce", text: "Photos, quantité, unité (kg, pièce, tonne, lot) et mode de vente : prix fixe, négociable ou enchère." },
  { icon: HandCoins, title: "Recevez des offres", text: "Les acheteurs demandent une quantité, proposent un prix ou enchérissent jusqu'à la clôture." },
  { icon: Truck, title: "Vendez au meilleur acheteur", text: "Confirmez la demande, organisez l'enlèvement et votre stock se met à jour automatiquement." },
];

const STATS = [
  { value: "12 480", label: "Annonces publiées" },
  { value: "3 260", label: "Vendeurs inscrits" },
  { value: "8 900", label: "Acheteurs actifs" },
  { value: "5 140", label: "Transactions réalisées" },
];

function Home() {
  const { t } = useI18n();
  const recent = [...LISTINGS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 8);
  const auctions = LISTINGS.filter((l) => l.saleType === "enchere").slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImg}
          alt="Atelier mécanique et parc de ferraille au coucher du soleil"
          width={1920}
          height={1088}
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div className="bg-hero-overlay absolute inset-0 -z-10" />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 md:pb-24 md:pt-28">
          <div className="max-w-3xl animate-fade-up">
            <p className="label-stamp inline-flex items-center gap-2 rounded-full border border-brass/50 bg-charcoal/40 px-3 py-1 text-xs text-brass">
              <Wrench className="size-3.5" /> Marketplace tunisienne de la récupération
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] text-on-dark sm:text-6xl lg:text-7xl">
              La ferraille a de la valeur.{" "}
              <em className="font-normal text-brass">Donnez-lui un nouveau marché.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-on-dark-muted">
              Achetez, vendez et enchérissez sur les pièces automobiles, métaux et matériaux de
              récupération partout en Tunisie.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="rust" size="lg">
                <Link to="/annonces">
                  Acheter des matériaux <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline-dark" size="lg">
                <Link to="/publier">Vendre mes matériaux</Link>
              </Button>
            </div>
          </div>
          <div className="mt-12 animate-fade-up [animation-delay:200ms]">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <SectionHeading
          eyebrow="Catalogue"
          title="Catégories principales"
          action={
            <Button asChild variant="link" className="px-0 text-rust">
              <Link to="/categories">Toutes les catégories <ArrowRight /></Link>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c, i) => (
            <Link
              key={c.slug}
              to="/annonces"
              search={{ cat: c.slug }}
              className={`group relative isolate flex min-h-56 flex-col justify-end overflow-hidden rounded-xl p-5 text-on-dark shadow-card ${i === 0 ? "sm:col-span-2 lg:row-span-2" : ""}`}
            >
              <img src={c.image} alt="" loading="lazy" width={1024} height={768} className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-charcoal via-charcoal/55 to-transparent" />
              <span className="label-stamp text-[0.68rem] text-brass">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-1 text-2xl font-semibold">{t(c.name)}</h3>
              <p className="mt-1 text-sm text-on-dark-muted">{t(c.tagline)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent listings */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <SectionHeading
          eyebrow="Fraîchement publiées"
          title="Annonces récentes"
          action={
            <Button asChild variant="outline">
              <Link to="/annonces">Voir toutes les annonces <ArrowRight /></Link>
            </Button>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </section>

      {/* Auctions */}
      <section className="surface-dark mt-24 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label-stamp flex items-center gap-2 text-xs text-brass">
                <Gavel className="size-4" /> Salle des ventes
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-on-dark sm:text-4xl">Enchères en cours</h2>
            </div>
            <Button asChild variant="outline-dark">
              <Link to="/encheres">Toutes les enchères <ArrowRight /></Link>
            </Button>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {auctions.map((l) => (
              <AuctionCard key={l.id} listing={l} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <SectionHeading eyebrow="Simple et sécurisé" title="Comment ça marche ?" />
        <ol className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="surface-card relative p-6">
              <span className="absolute end-5 top-4 font-display text-6xl font-semibold text-beige">{i + 1}</span>
              <span className="grid size-12 place-items-center rounded-lg bg-charcoal text-brass">
                <s.icon className="size-6" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Stats / trust */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-beige/60">
          <div className="grid divide-border sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="p-8 text-center">
                <p className="font-display text-4xl font-semibold text-foreground">{s.value}</p>
                <p className="label-stamp mt-2 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-t border-border bg-card/60 px-6 py-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-olive" /> Vendeurs professionnels vérifiés</span>
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-olive" /> Contrôle de propriété des véhicules</span>
            <span className="label-stamp text-[0.68rem] text-rust">Chiffres de démonstration</span>
          </div>
        </div>
      </section>
    </>
  );
}
