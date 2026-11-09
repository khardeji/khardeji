import { Link } from "@tanstack/react-router";
import { useI18n } from "@/hooks/use-i18n";
import { LogoFull } from "./Logo";

export function Footer() {
  const { t } = useI18n();
  const link = "hover:text-on-dark";
  return (
    <footer className="surface-dark mt-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <LogoFull />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-on-dark-muted">
            {t({
              ar: "السوق التونسية للخردة، قطع غيار السيارات ومواد الرسكلة. اشري، بيع وزايد في الـ24 ولاية.",
              fr: "La marketplace tunisienne de la ferraille, des pièces automobiles et des matériaux de récupération. Achetez, vendez et enchérissez dans les 24 gouvernorats.",
              en: "Tunisia's marketplace for scrap metal, car parts and salvage materials. Buy, sell and bid across all 24 governorates.",
            })}
          </p>
        </div>
        <div>
          <h3 className="label-stamp text-xs text-brass">{t({ ar: "السوق", fr: "Marketplace", en: "Marketplace" })}</h3>
          <ul className="mt-4 space-y-2 text-sm text-on-dark-muted">
            <li><Link to="/annonces" className={link}>{t({ ar: "كل الإعلانات", fr: "Toutes les annonces", en: "All listings" })}</Link></li>
            <li><Link to="/encheres" className={link}>{t({ ar: "المزايدات الجارية", fr: "Enchères en cours", en: "Live auctions" })}</Link></li>
            <li><Link to="/categories" className={link}>{t({ ar: "الأصناف", fr: "Catégories", en: "Categories" })}</Link></li>
            <li><Link to="/publier" className={link}>{t({ ar: "انشر إعلان", fr: "Publier une annonce", en: "Post a listing" })}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="label-stamp text-xs text-brass">{t({ ar: "مساعدة", fr: "Aide", en: "Help" })}</h3>
          <ul className="mt-4 space-y-2 text-sm text-on-dark-muted">
            <li><Link to="/comment-ca-marche" className={link}>{t({ ar: "كيفاش تخدم؟", fr: "Comment ça marche ?", en: "How it works" })}</Link></li>
            <li><Link to="/services" className={link}>{t({ ar: "الخدمات والنقاط", fr: "Services et jetons", en: "Services & tokens" })}</Link></li>
            <li><Link to="/connexion" className={link}>{t({ ar: "دخول", fr: "Connexion", en: "Sign in" })}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-on-dark/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-on-dark-muted sm:flex-row sm:justify-between sm:px-6">
          <span>{t({ ar: "© 2026 خردجي — تونس", fr: "© 2026 Khardeji — Tunisie", en: "© 2026 Khardeji — Tunisia" })}</span>
          <span>
            {t({
              ar: "الأسعار بالدينار التونسي (د.ت). معطيات تجريبية.",
              fr: "Prix affichés en dinars tunisiens (DT). Données de démonstration.",
              en: "Prices in Tunisian dinars (TND). Demo data.",
            })}
          </span>
        </div>
      </div>
    </footer>
  );
}
