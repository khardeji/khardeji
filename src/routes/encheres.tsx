import { createFileRoute } from "@tanstack/react-router";
import { Gavel, ShieldCheck, Timer, TrendingUp } from "lucide-react";
import { AuctionCard } from "@/components/site/AuctionCard";
import { PageHeader } from "@/components/site/SectionHeading";
import { catalogQuery, useCatalog } from "@/lib/catalog-queries";
import { auctionSortKey } from "@/lib/demo-clock";
import { useI18n } from "@/hooks/use-i18n";
import { pageMeta, SHARE_IMAGE } from "@/lib/i18n";

export const Route = createFileRoute("/encheres")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  head: ({ match }) => ({
    meta: pageMeta(match.context.locale, {
      image: SHARE_IMAGE,
      title: {
        ar: "المزايدات الجارية — عربات، خردة، آلات | خردجي",
        fr: "Enchères en cours — Véhicules, ferraille, machines | Khardeji",
        en: "Live auctions — Vehicles, scrap, machines | Khardeji",
      },
      description: {
        ar: "شارك في مزايدات العربات المصدومة، دفعات الخردة والمعدات الصناعية في تونس. عدّاد تنازلي وتاريخ العروض مباشرة.",
        fr: "Participez aux enchères de véhicules accidentés, lots de ferraille et matériel industriel en Tunisie. Compte à rebours et historique en direct.",
        en: "Bid on damaged vehicles, scrap lots and industrial equipment in Tunisia. Live countdown and bid history.",
      },
    }),
  }),
  component: Auctions,
});

const RULES = [
  {
    icon: TrendingUp,
    title: { ar: "أدنى زيادة", fr: "Incrément minimum", en: "Minimum increment" },
    text: {
      ar: "كل عرض جديد لازم يفوت السعر الحالي على الأقل بالزيادة اللي حدّدها البائع.",
      fr: "Chaque nouvelle offre dépasse le prix actuel d'au moins l'incrément fixé par le vendeur.",
      en: "Each new bid beats the current price by at least the seller's increment.",
    },
  },
  {
    icon: ShieldCheck,
    title: { ar: "عروض نهائية", fr: "Offres définitives", en: "Final bids" },
    text: {
      ar: "العرض المسجّل ما يتبدّلش وما يتلغاش. كل عرض يتثبّت منو.",
      fr: "Une enchère validée ne peut être ni modifiée ni annulée. Chaque offre est vérifiée.",
      en: "A placed bid cannot be changed or cancelled. Every bid is checked.",
    },
  },
  {
    icon: Timer,
    title: { ar: "غلق أوتوماتيكي", fr: "Clôture automatique", en: "Automatic closing" },
    text: {
      ar: "في الوقت المحدّد المزايدة تتسكّر وأعلى عرض هو اللي يربح.",
      fr: "À l'heure prévue, l'enchère se ferme et la meilleure offre est désignée gagnante.",
      en: "At the set time the auction closes and the highest bid wins.",
    },
  },
];

function Auctions() {
  const { t } = useI18n();
  const { listings } = useCatalog();
  const auctions = listings
    .filter((l) => l.saleType === "enchere" && l.auction)
    .sort((a, b) => auctionSortKey(a.auction!) - auctionSortKey(b.auction!));
  return (
    <>
      <PageHeader
        eyebrow={t({ ar: "قاعة البيع", fr: "Salle des ventes", en: "Sale room" })}
        title={t({ ar: "المزايدات الجارية", fr: "Enchères en cours", en: "Live auctions" })}
        intro={t({
          ar: "زايد على عربات مصدومة، دفعات معادن ومعدات صناعية. المزايدات اللي قرب تتسكّر تظهر الأولى.",
          fr: "Enchérissez sur des véhicules accidentés, des lots de métaux et du matériel industriel. Les enchères qui se terminent bientôt apparaissent en premier.",
          en: "Bid on damaged vehicles, metal lots and industrial equipment. Auctions ending soonest appear first.",
        })}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {RULES.map((r) => (
            <div key={r.title.fr} className="surface-card flex gap-4 p-5">
              <r.icon className="size-6 shrink-0 text-rust" />
              <div>
                <h2 className="text-lg font-semibold">{t(r.title)}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t(r.text)}</p>
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
          <Gavel className="size-4 shrink-0" />
          {t({
            ar: "نقاط الإشهار ما تستعملش أبداً في المزايدة: المزايدات بالدينار برك.",
            fr: "Les jetons promotionnels ne servent jamais à miser : les enchères se font uniquement en DT.",
            en: "Promotion tokens are never used to bid: auctions are in TND only.",
          })}
        </p>
      </div>
    </>
  );
}
