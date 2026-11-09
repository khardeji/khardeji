import { createFileRoute, Link } from "@tanstack/react-router";
import { Calculator, Gavel, HandCoins, Megaphone, Scale, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/site/SectionHeading";

export const Route = createFileRoute("/comment-ca-marche")({
  head: () => ({
    meta: [
      { title: "Comment ça marche ? — Vendre et acheter de la ferraille | Khardeji" },
      { name: "description", content: "Publiez votre annonce, recevez des offres ou des enchères et vendez au meilleur acheteur. Prix fixe, négociable ou enchère, au kg, à la pièce ou au lot." },
      { property: "og:title", content: "Comment fonctionne Khardeji" },
      { property: "og:description", content: "Vendre et acheter de la ferraille en 3 étapes, partout en Tunisie." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorks,
});

const SELLER = [
  { icon: Megaphone, title: "1. Publiez votre annonce", text: "Titre, photos (jusqu'à 12), catégorie, gouvernorat et délégation. La publication de base est gratuite." },
  { icon: Scale, title: "2. Choisissez l'unité et le mode", text: "Pièce, kg, gramme, tonne, lot ou quantité libre. Puis prix fixe, prix négociable ou enchère." },
  { icon: HandCoins, title: "3. Recevez des offres", text: "Demandes de quantité, contre-offres ou enchères : vous confirmez ou refusez chaque demande." },
  { icon: Truck, title: "4. Vendez au meilleur acheteur", text: "Organisez l'enlèvement. Votre stock se met à jour après confirmation, ventes partielles incluses." },
];

const BUYER = [
  { icon: Calculator, title: "Achetez la quantité exacte", text: "Choisissez 25 kg sur 150 kg disponibles : le total est calculé automatiquement, sans jamais dépasser le stock." },
  { icon: Gavel, title: "Enchérissez en direct", text: "Compte à rebours, historique complet et incrément minimum respecté à chaque offre." },
  { icon: ShieldCheck, title: "Achetez en confiance", text: "Vendeurs professionnels vérifiés, contrôle de propriété pour les véhicules et modération des produits interdits." },
];

function HowItWorks() {
  return (
    <>
      <PageHeader eyebrow="Guide" title="Comment ça marche ?" intro="Khardeji relie les ferrailleurs, casses auto, ateliers et particuliers de toute la Tunisie." />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-3xl font-semibold">Pour les vendeurs</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {SELLER.map((s) => (
            <div key={s.title} className="surface-card p-6">
              <span className="grid size-11 place-items-center rounded-lg bg-rust text-rust-foreground"><s.icon className="size-5" /></span>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-16 text-3xl font-semibold">Pour les acheteurs</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {BUYER.map((s) => (
            <div key={s.title} className="surface-card p-6">
              <span className="grid size-11 place-items-center rounded-lg bg-charcoal text-brass"><s.icon className="size-5" /></span>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="surface-dark mt-16 flex flex-col items-start justify-between gap-6 rounded-2xl p-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-semibold text-on-dark">Prêt à vendre vos matériaux ?</h2>
            <p className="mt-2 text-on-dark-muted">Publiez votre première annonce gratuitement en quelques minutes.</p>
          </div>
          <Button asChild variant="rust" size="lg"><Link to="/publier">Publier une annonce</Link></Button>
        </div>
      </div>
    </>
  );
}
