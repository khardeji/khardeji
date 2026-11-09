import { createFileRoute } from "@tanstack/react-router";
import { Gavel, ShieldCheck, Timer, TrendingUp } from "lucide-react";
import { AuctionCard } from "@/components/site/AuctionCard";
import { PageHeader } from "@/components/site/SectionHeading";
import { LISTINGS } from "@/data/catalog";

export const Route = createFileRoute("/encheres")({
  head: () => ({
    meta: [
      { title: "Enchères en cours — Véhicules, ferraille, machines | Khardeji" },
      { name: "description", content: "Participez aux enchères de véhicules accidentés, lots de ferraille et matériel industriel en Tunisie. Compte à rebours et historique en direct." },
      { property: "og:title", content: "Enchères en cours sur Khardeji" },
      { property: "og:description", content: "Véhicules accidentés, ferraille et machines aux enchères en Tunisie." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Auctions,
});

const RULES = [
  { icon: TrendingUp, title: "Incrément minimum", text: "Chaque nouvelle offre dépasse le prix actuel d'au moins l'incrément fixé par le vendeur." },
  { icon: ShieldCheck, title: "Offres définitives", text: "Une enchère validée ne peut être ni modifiée ni annulée. Chaque offre est vérifiée." },
  { icon: Timer, title: "Clôture automatique", text: "À l'heure prévue, l'enchère se ferme et la meilleure offre est désignée gagnante." },
];

function Auctions() {
  const auctions = [...LISTINGS.filter((l) => l.saleType === "enchere")].sort((a, b) => a.auction!.endsInHours - b.auction!.endsInHours);
  return (
    <>
      <PageHeader eyebrow="Salle des ventes" title="Enchères en cours" intro="Enchérissez sur des véhicules accidentés, des lots de métaux et du matériel industriel. Les enchères qui se terminent bientôt apparaissent en premier." />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {RULES.map((r) => (
            <div key={r.title} className="surface-card flex gap-4 p-5">
              <r.icon className="size-6 shrink-0 text-rust" />
              <div>
                <h2 className="text-lg font-semibold">{r.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {auctions.map((l) => (
            <AuctionCard key={l.id} listing={l} />
          ))}
        </div>
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Gavel className="size-4" /> Les jetons promotionnels ne servent jamais à miser : les enchères se font uniquement en DT.
        </p>
      </div>
    </>
  );
}
