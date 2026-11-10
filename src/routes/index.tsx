import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Gavel, HandCoins, Megaphone, ShieldCheck, Truck, Wrench } from "lucide-react";
import heroImg from "@/assets/hero-workshop.jpg";
import { Button } from "@/components/ui/button";
import { AuctionCard } from "@/components/site/AuctionCard";
import { HeroSearch } from "@/components/site/HeroSearch";
import { ListingCard } from "@/components/site/ListingCard";
import { SectionHeading } from "@/components/site/SectionHeading";
import { useSuspenseQuery } from "@tanstack/react-query";
import { catalogQuery, statsQuery, useCatalog } from "@/lib/catalog-queries";
import { useI18n } from "@/hooks/use-i18n";
import { pageMeta, SHARE_IMAGE } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(catalogQuery), context.queryClient.ensureQueryData(statsQuery)]),
  head: ({ match }) => ({
    meta: pageMeta(match.context.locale, {
      image: SHARE_IMAGE,
      title: {
        ar: "خردجي — الخردة عندها قيمة | سوق تونسية",
        fr: "Khardeji — La ferraille a de la valeur | Marketplace Tunisie",
        en: "Khardeji — Scrap has value | Tunisian marketplace",
      },
      description: {
        ar: "اشري، بيع وزايد على قطع غيار السيارات، المعادن ومواد الرسكلة في كامل تونس. الأسعار بالدينار، 24 ولاية.",
        fr: "Achetez, vendez et enchérissez sur les pièces automobiles, métaux et matériaux de récupération partout en Tunisie. Prix en DT, 24 gouvernorats.",
        en: "Buy, sell and bid on car parts, metals and salvage materials across Tunisia. Prices in TND, 24 governorates.",
      },
    }),
  }),
  component: Home,
});

const ARROW = "rtl:rotate-180";

const STEPS = [
  {
    icon: Megaphone,
    title: { ar: "انشر إعلانك", fr: "Publiez votre annonce", en: "Post your listing" },
    text: {
      ar: "تصاور، الكمية، الوحدة (كغ، قطعة، طن، دفعة) وطريقة البيع: سعر ثابت، قابل للتفاوض ولا مزايدة.",
      fr: "Photos, quantité, unité (kg, pièce, tonne, lot) et mode de vente : prix fixe, négociable ou enchère.",
      en: "Photos, quantity, unit (kg, piece, tonne, lot) and sale mode: fixed price, negotiable or auction.",
    },
  },
  {
    icon: HandCoins,
    title: { ar: "استقبل العروض", fr: "Recevez des offres", en: "Receive offers" },
    text: {
      ar: "المشترين يطلبوا كمية، يقترحوا سعر ولا يزايدوا حتى لين تتسكّر المزايدة.",
      fr: "Les acheteurs demandent une quantité, proposent un prix ou enchérissent jusqu'à la clôture.",
      en: "Buyers request a quantity, propose a price or bid until the auction closes.",
    },
  },
  {
    icon: Truck,
    title: { ar: "بيع لأحسن مشتري", fr: "Vendez au meilleur acheteur", en: "Sell to the best buyer" },
    text: {
      ar: "أكّد الطلب، نظّم الاستلام والمخزون يتحدّث وحدو.",
      fr: "Confirmez la demande, organisez l'enlèvement et votre stock se met à jour automatiquement.",
      en: "Confirm the request, arrange collection and your stock updates automatically.",
    },
  },
];

const STATS = [
  { key: "listings", label: { ar: "إعلان منشور", fr: "Annonces en ligne", en: "Live listings" } },
  { key: "members", label: { ar: "حساب مسجّل", fr: "Membres inscrits", en: "Registered members" } },
  { key: "auctions", label: { ar: "مزايدة جارية", fr: "Enchères en cours", en: "Live auctions" } },
  { key: "sales", label: { ar: "عملية بيع", fr: "Ventes réalisées", en: "Completed sales" } },
] as const;

function Home() {
  const { t, num } = useI18n();
  const { listings, categories } = useCatalog();
  const { data: stats } = useSuspenseQuery(statsQuery);
  const recent = [...listings].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 8);
  const auctions = listings.filter((l) => l.saleType === "enchere" && l.auction).slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImg}
          alt={t({ ar: "ورشة ميكانيك ومخزن خردة وقت الغروب", fr: "Atelier mécanique et parc de ferraille au coucher du soleil", en: "Mechanic workshop and scrapyard at sunset" })}
          width={1920}
          height={1088}
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div className="bg-hero-overlay absolute inset-0 -z-10 rtl:-scale-x-100" />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 md:pb-24 md:pt-28">
          <div className="max-w-3xl animate-fade-up">
            <p className="label-stamp inline-flex items-center gap-2 rounded-full border border-brass/50 bg-charcoal/40 px-3 py-1 text-xs text-brass">
              <Wrench className="size-3.5" /> {t({ ar: "السوق التونسية للرسكلة", fr: "Marketplace tunisienne de la récupération", en: "Tunisia's salvage marketplace" })}
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.15] text-on-dark sm:text-6xl lg:text-7xl">
              {t({ ar: "الخردة عندها قيمة.", fr: "La ferraille a de la valeur.", en: "Scrap has value." })}{" "}
              <em className="font-normal text-brass">
                {t({ ar: "أعطيها سوق جديدة.", fr: "Donnez-lui un nouveau marché.", en: "Give it a new market." })}
              </em>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-on-dark-muted">
              {t({
                ar: "اشري، بيع وزايد على قطع غيار السيارات، المعادن ومواد الرسكلة في كامل تونس.",
                fr: "Achetez, vendez et enchérissez sur les pièces automobiles, métaux et matériaux de récupération partout en Tunisie.",
                en: "Buy, sell and bid on car parts, metals and salvage materials anywhere in Tunisia.",
              })}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="rust" size="lg">
                <Link to="/annonces">
                  {t({ ar: "اشري مواد", fr: "Acheter des matériaux", en: "Buy materials" })} <ArrowRight className={ARROW} />
                </Link>
              </Button>
              <Button asChild variant="outline-dark" size="lg">
                <Link to="/publier">{t({ ar: "بيع الموادّ متاعي", fr: "Vendre mes matériaux", en: "Sell my materials" })}</Link>
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
          eyebrow={t({ ar: "الكتالوج", fr: "Catalogue", en: "Catalogue" })}
          title={t({ ar: "الأصناف الرئيسية", fr: "Catégories principales", en: "Main categories" })}
          action={
            <Button asChild variant="link" className="px-0 text-rust">
              <Link to="/categories">{t({ ar: "كل الأصناف", fr: "Toutes les catégories", en: "All categories" })} <ArrowRight className={ARROW} /></Link>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c, i) => (
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
          eyebrow={t({ ar: "منشورة جديدة", fr: "Fraîchement publiées", en: "Freshly posted" })}
          title={t({ ar: "آخر الإعلانات", fr: "Annonces récentes", en: "Recent listings" })}
          action={
            <Button asChild variant="outline">
              <Link to="/annonces">{t({ ar: "شوف كل الإعلانات", fr: "Voir toutes les annonces", en: "See all listings" })} <ArrowRight className={ARROW} /></Link>
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
                <Gavel className="size-4" /> {t({ ar: "قاعة البيع", fr: "Salle des ventes", en: "Sale room" })}
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-on-dark sm:text-4xl">
                {t({ ar: "المزايدات الجارية", fr: "Enchères en cours", en: "Live auctions" })}
              </h2>
            </div>
            <Button asChild variant="outline-dark">
              <Link to="/encheres">{t({ ar: "كل المزايدات", fr: "Toutes les enchères", en: "All auctions" })} <ArrowRight className={ARROW} /></Link>
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
        <SectionHeading
          eyebrow={t({ ar: "ساهل ومضمون", fr: "Simple et sécurisé", en: "Simple and secure" })}
          title={t({ ar: "كيفاش تخدم؟", fr: "Comment ça marche ?", en: "How it works" })}
        />
        <ol className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title.fr} className="surface-card relative p-6">
              <span className="absolute end-5 top-4 font-display text-6xl font-semibold text-beige">{i + 1}</span>
              <span className="grid size-12 place-items-center rounded-lg bg-charcoal text-brass">
                <s.icon className="size-6" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">{t(s.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(s.text)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Stats / trust */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-beige/60">
          <div className="grid divide-border sm:grid-cols-2 sm:divide-x lg:grid-cols-4 rtl:sm:divide-x-reverse">
            {STATS.map((s) => (
              <div key={s.label.fr} className="p-8 text-center">
                <p className="font-display text-4xl font-semibold text-foreground">{num(stats[s.key])}</p>
                <p className="label-stamp mt-2 text-xs text-muted-foreground">{t(s.label)}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-t border-border bg-card/60 px-6 py-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-olive" /> {t({ ar: "بائعين محترفين متثبّت منهم", fr: "Vendeurs professionnels vérifiés", en: "Verified professional sellers" })}</span>
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-olive" /> {t({ ar: "التثبّت من ملكية العربات", fr: "Contrôle de propriété des véhicules", en: "Vehicle ownership checks" })}</span>
          </div>
        </div>
      </section>
    </>
  );
}
