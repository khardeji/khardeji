import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="surface-dark mt-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo tone="light" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-on-dark-muted">
            La marketplace tunisienne de la ferraille, des pièces automobiles et des matériaux de
            récupération. Achetez, vendez et enchérissez dans les 24 gouvernorats.
          </p>
        </div>
        <div>
          <h3 className="label-stamp text-xs text-brass">Marketplace</h3>
          <ul className="mt-4 space-y-2 text-sm text-on-dark-muted">
            <li><Link to="/annonces" className="hover:text-on-dark">Toutes les annonces</Link></li>
            <li><Link to="/encheres" className="hover:text-on-dark">Enchères en cours</Link></li>
            <li><Link to="/categories" className="hover:text-on-dark">Catégories</Link></li>
            <li><Link to="/publier" className="hover:text-on-dark">Publier une annonce</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="label-stamp text-xs text-brass">Aide</h3>
          <ul className="mt-4 space-y-2 text-sm text-on-dark-muted">
            <li><Link to="/comment-ca-marche" className="hover:text-on-dark">Comment ça marche ?</Link></li>
            <li><Link to="/services" className="hover:text-on-dark">Services et jetons</Link></li>
            <li><Link to="/connexion" className="hover:text-on-dark">Connexion</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-on-dark/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-on-dark-muted sm:flex-row sm:justify-between sm:px-6">
          <span>© 2026 Khardeji — Tunisie</span>
          <span>Prix affichés en dinars tunisiens (DT). Données de démonstration.</span>
        </div>
      </div>
    </footer>
  );
}
