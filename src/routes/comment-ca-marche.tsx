import { createFileRoute, Link } from "@tanstack/react-router";
import { Calculator, Gavel, HandCoins, Megaphone, Scale, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/site/SectionHeading";
import { useI18n } from "@/hooks/use-i18n";
import { pageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/comment-ca-marche")({
  head: ({ match }) => ({
    meta: pageMeta(match.context.locale, {
      title: {
        ar: "كيفاش تخدم؟ — بيع وشري الخردة | خردجي",
        fr: "Comment ça marche ? — Vendre et acheter de la ferraille | Khardeji",
        en: "How it works — Buying and selling scrap | Khardeji",
      },
      description: {
        ar: "انشر إعلانك، استقبل العروض ولا المزايدات وبيع لأحسن مشتري. سعر ثابت، قابل للتفاوض ولا مزايدة، بالكيلو، بالقطعة ولا بالدفعة.",
        fr: "Publiez votre annonce, recevez des offres ou des enchères et vendez au meilleur acheteur. Prix fixe, négociable ou enchère, au kg, à la pièce ou au lot.",
        en: "Post your listing, receive offers or bids and sell to the best buyer. Fixed, negotiable or auction, per kg, per piece or per lot.",
      },
    }),
  }),
  component: HowItWorks,
});

const SELLER = [
  {
    icon: Megaphone,
    title: { ar: "1. انشر إعلانك", fr: "1. Publiez votre annonce", en: "1. Post your listing" },
    text: {
      ar: "العنوان، التصاور (حتى 12)، الصنف، الولاية والمعتمدية. النشر العادي بلاش.",
      fr: "Titre, photos (jusqu'à 12), catégorie, gouvernorat et délégation. La publication de base est gratuite.",
      en: "Title, photos (up to 12), category, governorate and delegation. Basic posting is free.",
    },
  },
  {
    icon: Scale,
    title: { ar: "2. اختار الوحدة وطريقة البيع", fr: "2. Choisissez l'unité et le mode", en: "2. Choose unit and mode" },
    text: {
      ar: "قطعة، كغ، غرام، طن، دفعة ولا كمية حرة. وبعد سعر ثابت، قابل للتفاوض ولا مزايدة.",
      fr: "Pièce, kg, gramme, tonne, lot ou quantité libre. Puis prix fixe, prix négociable ou enchère.",
      en: "Piece, kg, gram, tonne, lot or free quantity. Then fixed price, negotiable price or auction.",
    },
  },
  {
    icon: HandCoins,
    title: { ar: "3. استقبل العروض", fr: "3. Recevez des offres", en: "3. Receive offers" },
    text: {
      ar: "طلبات كمية، عروض مضادّة ولا مزايدات: إنت تقبل ولا ترفض كل طلب.",
      fr: "Demandes de quantité, contre-offres ou enchères : vous confirmez ou refusez chaque demande.",
      en: "Quantity requests, counter-offers or bids: you accept or decline each one.",
    },
  },
  {
    icon: Truck,
    title: { ar: "4. بيع لأحسن مشتري", fr: "4. Vendez au meilleur acheteur", en: "4. Sell to the best buyer" },
    text: {
      ar: "نظّم الاستلام. المخزون يتحدّث بعد التأكيد، حتى في البيع الجزئي.",
      fr: "Organisez l'enlèvement. Votre stock se met à jour après confirmation, ventes partielles incluses.",
      en: "Arrange collection. Your stock updates after confirmation, partial sales included.",
    },
  },
];

const BUYER = [
  {
    icon: Calculator,
    title: { ar: "اشري الكمية بالضبط", fr: "Achetez la quantité exacte", en: "Buy the exact quantity" },
    text: {
      ar: "اختار 25 كغ من 150 كغ متوفرة: المجموع يتحسب وحدو، وعمرو ما يفوت المخزون.",
      fr: "Choisissez 25 kg sur 150 kg disponibles : le total est calculé automatiquement, sans jamais dépasser le stock.",
      en: "Pick 25 kg out of 150 kg available: the total is calculated for you and never exceeds stock.",
    },
  },
  {
    icon: Gavel,
    title: { ar: "زايد مباشرة", fr: "Enchérissez en direct", en: "Bid live" },
    text: {
      ar: "عدّاد تنازلي، تاريخ كامل للعروض وأدنى زيادة محترمة في كل عرض.",
      fr: "Compte à rebours, historique complet et incrément minimum respecté à chaque offre.",
      en: "Countdown, full history and the minimum increment enforced on every bid.",
    },
  },
  {
    icon: ShieldCheck,
    title: { ar: "اشري وإنت مرتاح", fr: "Achetez en confiance", en: "Buy with confidence" },
    text: {
      ar: "بائعين محترفين متثبّت منهم، تثبّت من ملكية العربات ومراقبة المنتوجات الممنوعة.",
      fr: "Vendeurs professionnels vérifiés, contrôle de propriété pour les véhicules et modération des produits interdits.",
      en: "Verified professional sellers, vehicle ownership checks and moderation of banned items.",
    },
  },
];

function HowItWorks() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader
        eyebrow={t({ ar: "دليل", fr: "Guide", en: "Guide" })}
        title={t({ ar: "كيفاش تخدم؟", fr: "Comment ça marche ?", en: "How it works" })}
        intro={t({
          ar: "خردجي يربط بين أصحاب الخردة، الكاسات، الورشات والخواص في كامل تونس.",
          fr: "Khardeji relie les ferrailleurs, casses auto, ateliers et particuliers de toute la Tunisie.",
          en: "Khardeji connects scrap dealers, scrapyards, workshops and individuals across Tunisia.",
        })}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-3xl font-semibold">{t({ ar: "للبائعين", fr: "Pour les vendeurs", en: "For sellers" })}</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {SELLER.map((s) => (
            <div key={s.title.fr} className="surface-card p-6">
              <span className="grid size-11 place-items-center rounded-lg bg-rust text-rust-foreground"><s.icon className="size-5" /></span>
              <h3 className="mt-4 text-lg font-semibold">{t(s.title)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(s.text)}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-16 text-3xl font-semibold">{t({ ar: "للمشترين", fr: "Pour les acheteurs", en: "For buyers" })}</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {BUYER.map((s) => (
            <div key={s.title.fr} className="surface-card p-6">
              <span className="grid size-11 place-items-center rounded-lg bg-charcoal text-brass"><s.icon className="size-5" /></span>
              <h3 className="mt-4 text-lg font-semibold">{t(s.title)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(s.text)}</p>
            </div>
          ))}
        </div>

        <div className="surface-dark mt-16 flex flex-col items-start justify-between gap-6 rounded-2xl p-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-semibold text-on-dark">{t({ ar: "حاضر باش تبيع المواد متاعك؟", fr: "Prêt à vendre vos matériaux ?", en: "Ready to sell your materials?" })}</h2>
            <p className="mt-2 text-on-dark-muted">{t({ ar: "انشر أول إعلان بلاش في دقايق.", fr: "Publiez votre première annonce gratuitement en quelques minutes.", en: "Post your first listing for free in minutes." })}</p>
          </div>
          <Button asChild variant="rust" size="lg"><Link to="/publier">{t({ ar: "انشر إعلان", fr: "Publier une annonce", en: "Post a listing" })}</Link></Button>
        </div>
      </div>
    </>
  );
}
