import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpCircle, BadgeCheck, Building2, Check, Coins, Flame, Home, Rocket, Sparkles, Star } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { pricingQuery } from "@/lib/catalog-queries";
import { pageMeta, type Msg } from "@/lib/i18n";

export const Route = createFileRoute("/services")({
  loader: ({ context }) => context.queryClient.ensureQueryData(pricingQuery),
  head: ({ match }) => ({
    meta: pageMeta(match.context.locale, {
      title: {
        ar: "العروض والخدمات — نقاط، ترويج الإعلانات وباقات محترفين | خردجي",
        fr: "Offres et services — Jetons, boosts et forfaits Pro | Khardeji",
        en: "Plans and services — Tokens, boosts and Pro plans | Khardeji",
      },
      description: {
        ar: "انشر بلاش، اشري نقاط، روّج إعلاناتك واختار باقة محترفين لأصحاب الخردة والشركات في تونس.",
        fr: "Publiez gratuitement, achetez des jetons, boostez vos annonces et choisissez une offre Pro pour ferrailleurs et entreprises en Tunisie.",
        en: "Post for free, buy tokens, boost your listings and pick a Pro plan for scrap dealers and companies in Tunisia.",
      },
    }),
  }),
  component: Services,
});

const OVERVIEW = [
  {
    icon: Sparkles,
    href: "#basique",
    title: { ar: "ابدا بلاش", fr: "Commencez gratuitement", en: "Start for free" },
    text: { ar: "اعمل البروفيل متاعك وانشر أول إعلاناتك بلاش.", fr: "Créez votre profil et publiez vos premières annonces sans frais.", en: "Create your profile and post your first listings at no cost." },
    cta: { ar: "اكتشف الباقة الأساسية", fr: "Découvrir le plan basique", en: "See the basic plan" },
  },
  {
    icon: Coins,
    href: "#jetons",
    title: { ar: "اشري نقاط", fr: "Achetez des jetons", en: "Buy tokens" },
    text: { ar: "رصيد تستعملو في خدمات الظهور كيف ما تحب.", fr: "Des crédits pour profiter des services de visibilité à la carte.", en: "Credits for pay-as-you-go visibility services." },
    cta: { ar: "شوف باقات النقاط", fr: "Voir les forfaits de jetons", en: "See token packs" },
  },
  {
    icon: Rocket,
    href: "#boosts",
    title: { ar: "روّج إعلاناتك", fr: "Boostez vos annonces", en: "Boost your listings" },
    text: { ar: "مشاهدات أكثر، عروض أكثر، وبيع أسرع.", fr: "Plus de vues, plus d'offres, une vente plus rapide.", en: "More views, more offers, a faster sale." },
    cta: { ar: "اعرف أكثر على الترويج", fr: "En savoir plus sur les boosts", en: "Learn about boosts" },
  },
  {
    icon: Building2,
    href: "#pro",
    title: { ar: "اختار العرض متاعك", fr: "Choisissez votre offre", en: "Choose your plan" },
    text: { ar: "أصحاب الخردة، الكاسات والشركات: قارن عروض المحترفين.", fr: "Ferrailleurs, casses auto et entreprises : comparez nos offres Pro.", en: "Scrap dealers, scrapyards and companies: compare our Pro plans." },
    cta: { ar: "قارن العروض", fr: "Comparer les offres", en: "Compare plans" },
  },
];

const BOOST_ICON: Record<string, typeof Star> = { "arrow-up": ArrowUpCircle, flame: Flame, star: Star, home: Home };

function Services() {
  const { t, dt, num } = useI18n();
  const { data: pricing } = useSuspenseQuery(pricingQuery);
  const PACKS = pricing.packs;
  const BOOSTS = pricing.boosts;
  const PLANS = pricing.plans;
  const tokensWord = t({ ar: "نقطة", fr: "jetons", en: "tokens" });
  const perMonth = t({ ar: "/ الشهر", fr: "/ mois", en: "/ month" });

  return (
    <>
      <section className="surface-dark">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
          <p className="label-stamp text-xs text-brass">{t({ ar: "تعرف شنوّة يلزمك؟", fr: "Savez-vous ce qu'il vous faut ?", en: "Know what you need?" })}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold text-on-dark sm:text-6xl">{t({ ar: "العروض والخدمات", fr: "Offres et services", en: "Plans and services" })}</h1>
          <p className="mt-4 max-w-2xl text-lg text-on-dark-muted">
            {t({
              ar: "ابدا بلاش، وبعد استفيد من خدمات إضافية باش إعلاناتك تبان أكثر وتبيع أسرع.",
              fr: "Démarrez gratuitement, puis profitez de services à valeur ajoutée pour augmenter votre visibilité et vendre plus vite.",
              en: "Start free, then use extra services to get more visibility and sell faster.",
            })}
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OVERVIEW.map((o) => (
              <a key={o.href} href={o.href} className="group rounded-xl border border-on-dark/10 bg-charcoal-soft p-5 transition hover:border-brass/60">
                <o.icon className="size-7 text-brass" />
                <h2 className="mt-4 text-xl font-semibold text-on-dark">{t(o.title)}</h2>
                <p className="mt-1 text-sm text-on-dark-muted">{t(o.text)}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-rust-foreground group-hover:text-brass">
                  {t(o.cta)} <ArrowDown className="size-4" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Tokens */}
        <section id="jetons" className="scroll-mt-24 pt-20">
          <p className="label-stamp text-xs text-rust">{t({ ar: "النقاط", fr: "Jetons", en: "Tokens" })}</p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{t({ ar: "اشري نقاط بسهولة", fr: "Achetez des jetons facilement", en: "Buy tokens easily" })}</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {t({
              ar: "النقاط تستعمل كان لخدمات الظهور. عمرها ما تستعمل للمزايدة.",
              fr: "Les jetons servent uniquement aux services de visibilité. Ils ne servent jamais à miser dans une enchère.",
              en: "Tokens are only for visibility services. They can never be used to bid in an auction.",
            })}
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PACKS.map((p) => (
              <div key={p.id} className="surface-card card-lift relative flex flex-col p-6">
                {p.tag && <span className="label-stamp absolute end-4 top-4 rounded bg-brass px-2 py-0.5 text-[0.62rem] text-brass-foreground">{t(p.tag)}</span>}
                <Coins className="size-8 text-brass" />
                <p className="mt-4 font-display text-4xl font-semibold">{num(p.tokens)} <span className="text-lg font-normal text-muted-foreground">{tokensWord}</span></p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {dt(Math.round((p.price / p.tokens) * 100) / 100)} {t({ ar: "للنقطة", fr: "le jeton", en: "per token" })}
                </p>
                <p className="mt-6 font-display text-2xl font-semibold text-rust">{dt(p.price)}</p>
                <Button
                  variant="default"
                  className="mt-4"
                  onClick={() =>
                    toast(t({ ar: "الخلاص قريب", fr: "Paiement bientôt disponible", en: "Payment coming soon" }), {
                      description: t({ ar: "شراء النقاط باش يتحلّ قريب.", fr: "L'achat de jetons ouvrira très prochainement.", en: "Token purchases will open very soon." }),
                    })
                  }
                >
                  {t({ ar: "اشري", fr: "Acheter", en: "Buy" })}
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Boosts */}
        <section id="boosts" className="scroll-mt-24 pt-20">
          <p className="label-stamp text-xs text-rust">{t({ ar: "الظهور", fr: "Visibilité", en: "Visibility" })}</p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{t({ ar: "روّج إعلاناتك بفعالية", fr: "Boostez vos annonces efficacement", en: "Boost your listings effectively" })}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {BOOSTS.map((b) => {
              const Icon = BOOST_ICON[b.icon] ?? Star;
              return (
              <div key={b.id} className="surface-card flex items-start gap-4 p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-charcoal text-brass"><Icon className="size-6" /></span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{t(b.name)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(b.description)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-beige px-3 py-1 font-label text-sm font-semibold">{num(b.cost)} {tokensWord}</span>
              </div>
              );
            })}
          </div>
        </section>

        {/* Plans */}
        <section id="pro" className="scroll-mt-24 pt-20">
          <p className="label-stamp text-xs text-rust">{t({ ar: "الباقات", fr: "Forfaits", en: "Plans" })}</p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{t({ ar: "اختار العرض متاعك", fr: "Choisissez votre offre", en: "Choose your plan" })}</h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                id={p.id === "basique" ? "basique" : undefined}
                key={p.id}
                className={p.highlight ? "surface-dark relative scroll-mt-24 rounded-xl p-7 shadow-lift ring-2 ring-brass" : "surface-card scroll-mt-24 p-7"}
              >
                {p.highlight && (
                  <span className="label-stamp absolute -top-3 start-7 rounded bg-rust px-2 py-1 text-[0.62rem] text-rust-foreground">
                    {t({ ar: "مُنصح بيه للمحترفين", fr: "Recommandé pour les pros", en: "Recommended for pros" })}
                  </span>
                )}
                <h3 className={`flex items-center gap-2 text-2xl font-semibold ${p.highlight ? "text-on-dark" : ""}`}>
                  {t(p.name)} {p.id !== "basique" && <BadgeCheck className="size-5 text-olive" />}
                </h3>
                <p className="mt-4">
                  <span className={`font-display text-4xl font-semibold ${p.highlight ? "text-brass" : "text-foreground"}`}>
                    {p.price === 0 ? t({ ar: "بلاش", fr: "Gratuit", en: "Free" }) : dt(p.price)}
                  </span>
                  {p.price > 0 && <span className={p.highlight ? "text-on-dark-muted" : "text-muted-foreground"}> {perMonth}</span>}
                </p>
                <ul className="mt-6 space-y-3">
                  {p.features.map((f, i) => (
                    <li key={i} className={`flex items-start gap-2 text-sm ${p.highlight ? "text-on-dark" : ""}`}>
                      <Check className="mt-0.5 size-4 shrink-0 text-olive" /> {t(f)}
                    </li>
                  ))}
                </ul>
                {p.id === "basique" ? (
                  <Button asChild variant="outline" className="mt-8 w-full">
                    <Link to="/connexion" search={{ mode: "inscription" }}>{t({ ar: "اعمل حساب بلاش", fr: "Créer un compte gratuit", en: "Create a free account" })}</Link>
                  </Button>
                ) : (
                  <Button
                    variant={p.highlight ? "rust" : "default"}
                    className="mt-8 w-full"
                    onClick={() =>
                      toast(t({ ar: "اتصل بينا", fr: "Contactez-nous", en: "Contact us" }), {
                        description: t({ ar: "باقات المحترفين باش تتحلّ قريب.", fr: "Les forfaits Pro ouvriront très prochainement.", en: "Pro plans will open very soon." }),
                      })
                    }
                  >
                    {t({ ar: "اختار", fr: "Choisir", en: "Choose" })} {t(p.name)}
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            {t({ ar: "أسعار تقريبية بالدينار، الأداءات محسوبة، وتنجم تتبدّل.", fr: "Tarifs indicatifs en DT TTC, susceptibles d'évoluer.", en: "Indicative prices in TND incl. tax, subject to change." })}
          </p>
        </section>
      </div>
    </>
  );
}
