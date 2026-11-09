import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpCircle, BadgeCheck, Building2, Check, Coins, Flame, Home, Rocket, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDT } from "@/lib/format";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Offres et services — Jetons, boosts et forfaits Pro | Khardeji" },
      { name: "description", content: "Publiez gratuitement, achetez des jetons, boostez vos annonces et choisissez une offre Pro pour ferrailleurs et entreprises en Tunisie." },
      { property: "og:title", content: "Offres et services Khardeji" },
      { property: "og:description", content: "Jetons, boosts d'annonces et forfaits Pro pour vendre plus vite." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Services,
});

const OVERVIEW = [
  { icon: Sparkles, title: "Commencez gratuitement", text: "Créez votre profil et publiez vos premières annonces sans frais.", href: "#basique", cta: "Découvrir le plan basique" },
  { icon: Coins, title: "Achetez des jetons", text: "Des crédits pour profiter des services de visibilité à la carte.", href: "#jetons", cta: "Voir les forfaits de jetons" },
  { icon: Rocket, title: "Boostez vos annonces", text: "Plus de vues, plus d'offres, une vente plus rapide.", href: "#boosts", cta: "En savoir plus sur les boosts" },
  { icon: Building2, title: "Choisissez votre offre", text: "Ferrailleurs, casses auto et entreprises : comparez nos offres Pro.", href: "#pro", cta: "Comparer les offres" },
];

const PACKS = [
  { tokens: 10, price: 10 },
  { tokens: 30, price: 25, tag: "Populaire" },
  { tokens: 80, price: 60 },
  { tokens: 200, price: 130, tag: "Meilleur prix" },
];

const BOOSTS = [
  { icon: ArrowUpCircle, name: "Remonter l'annonce", cost: 2, text: "Votre annonce repasse en tête des résultats de sa catégorie." },
  { icon: Flame, name: "Annonce urgente", cost: 3, text: "Badge « Urgent » visible sur la carte et dans la fiche." },
  { icon: Star, name: "Annonce Premium — 7 jours", cost: 8, text: "Position prioritaire et cadre doré dans les listes." },
  { icon: Home, name: "À la une — page d'accueil", cost: 15, text: "Affichage dans la sélection de la page d'accueil pendant 3 jours." },
];

const PLANS = [
  { id: "basique", name: "Basique", price: 0, period: "", features: ["5 annonces actives", "Photos jusqu'à 12 par annonce", "Prix fixe, négociable et enchères", "Messagerie avec les acheteurs"] },
  { id: "pro", name: "Pro Ferrailleur", price: 49, period: "/ mois", highlight: true, features: ["50 annonces actives", "Badge vendeur professionnel", "40 jetons offerts chaque mois", "Statistiques de consultation", "Gestion des stocks multi-annonces"] },
  { id: "entreprise", name: "Entreprise", price: 149, period: "/ mois", features: ["Annonces illimitées", "Boutique à votre nom", "150 jetons offerts chaque mois", "Plusieurs comptes collaborateurs", "Accompagnement dédié"] },
];

function Services() {
  return (
    <>
      <section className="surface-dark">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
          <p className="label-stamp text-xs text-brass">Savez-vous ce qu'il vous faut ?</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold text-on-dark sm:text-6xl">Offres et services</h1>
          <p className="mt-4 max-w-2xl text-lg text-on-dark-muted">
            Démarrez gratuitement, puis profitez de services à valeur ajoutée pour augmenter votre visibilité et vendre plus vite.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OVERVIEW.map((o) => (
              <a key={o.title} href={o.href} className="group rounded-xl border border-on-dark/10 bg-charcoal-soft p-5 transition hover:border-brass/60">
                <o.icon className="size-7 text-brass" />
                <h2 className="mt-4 text-xl font-semibold text-on-dark">{o.title}</h2>
                <p className="mt-1 text-sm text-on-dark-muted">{o.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-rust-foreground group-hover:text-brass">
                  {o.cta} <ArrowDown className="size-4" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Tokens */}
        <section id="jetons" className="scroll-mt-24 pt-20">
          <p className="label-stamp text-xs text-rust">Jetons</p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Achetez des jetons facilement</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Les jetons servent uniquement aux services de visibilité. Ils ne servent jamais à miser dans une enchère.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PACKS.map((p) => (
              <div key={p.tokens} className="surface-card card-lift relative flex flex-col p-6">
                {p.tag && <span className="label-stamp absolute right-4 top-4 rounded bg-brass px-2 py-0.5 text-[0.62rem] text-brass-foreground">{p.tag}</span>}
                <Coins className="size-8 text-brass" />
                <p className="mt-4 font-display text-4xl font-semibold">{p.tokens} <span className="text-lg font-normal text-muted-foreground">jetons</span></p>
                <p className="mt-1 text-sm text-muted-foreground">{formatDT(Math.round((p.price / p.tokens) * 100) / 100)} le jeton</p>
                <p className="mt-6 font-display text-2xl font-semibold text-rust">{formatDT(p.price)}</p>
                <Button variant="default" className="mt-4" onClick={() => toast("Paiement bientôt disponible", { description: "L'achat de jetons ouvrira avec les comptes vendeurs." })}>
                  Acheter
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Boosts */}
        <section id="boosts" className="scroll-mt-24 pt-20">
          <p className="label-stamp text-xs text-rust">Visibilité</p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Boostez vos annonces efficacement</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {BOOSTS.map((b) => (
              <div key={b.name} className="surface-card flex items-start gap-4 p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-charcoal text-brass"><b.icon className="size-6" /></span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{b.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
                </div>
                <span className="shrink-0 rounded-full bg-beige px-3 py-1 font-label text-sm font-semibold">{b.cost} jetons</span>
              </div>
            ))}
          </div>
        </section>

        {/* Plans */}
        <section id="pro" className="scroll-mt-24 pt-20">
          <p className="label-stamp text-xs text-rust">Forfaits</p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Choisissez votre offre</h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                id={p.id === "basique" ? "basique" : undefined}
                key={p.id}
                className={p.highlight ? "surface-dark relative scroll-mt-24 rounded-xl p-7 shadow-lift ring-2 ring-brass" : "surface-card scroll-mt-24 p-7"}
              >
                {p.highlight && <span className="label-stamp absolute -top-3 left-7 rounded bg-rust px-2 py-1 text-[0.62rem] text-rust-foreground">Recommandé pour les pros</span>}
                <h3 className={`flex items-center gap-2 text-2xl font-semibold ${p.highlight ? "text-on-dark" : ""}`}>
                  {p.name} {p.id !== "basique" && <BadgeCheck className="size-5 text-olive" />}
                </h3>
                <p className="mt-4">
                  <span className={`font-display text-4xl font-semibold ${p.highlight ? "text-brass" : "text-foreground"}`}>{p.price === 0 ? "Gratuit" : formatDT(p.price)}</span>
                  <span className={p.highlight ? "text-on-dark-muted" : "text-muted-foreground"}> {p.period}</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${p.highlight ? "text-on-dark" : ""}`}>
                      <Check className="mt-0.5 size-4 shrink-0 text-olive" /> {f}
                    </li>
                  ))}
                </ul>
                {p.id === "basique" ? (
                  <Button asChild variant="outline" className="mt-8 w-full"><Link to="/connexion">Créer un compte gratuit</Link></Button>
                ) : (
                  <Button variant={p.highlight ? "rust" : "default"} className="mt-8 w-full" onClick={() => toast("Contactez-nous", { description: "Les forfaits Pro ouvriront avec les comptes vendeurs." })}>
                    Choisir {p.name}
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Tarifs indicatifs en DT TTC, susceptibles d'évoluer.</p>
        </section>
      </div>
    </>
  );
}
