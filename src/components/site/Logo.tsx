import { Link } from "@tanstack/react-router";
import logoMark from "@/assets/brand/khardeji-logo-mark.webp.asset.json";
import logoFull from "@/assets/brand/khardeji-logo-full.webp.asset.json";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

/** Header mark: gear emblem + "Khardeji" wordmark from the brand logo. */
export function Logo({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <Link to="/" className={cn("flex shrink-0 items-center", className)} aria-label={t({ ar: "خردجي — الرئيسية", fr: "Khardeji — accueil", en: "Khardeji — home" })}>
      <img src={logoMark.url} alt="Khardeji" width={432} height={200} className="h-12 w-auto sm:h-14" />
    </Link>
  );
}

/** Full brand logo with tagline and sale-mode pills, on a light plate (for dark areas). */
export function LogoFull({ className }: { className?: string }) {
  return (
    <div className={cn("inline-block rounded-2xl bg-ivory p-4 shadow-card", className)}>
      <img src={logoFull.url} alt="Khardeji — إشتري، بع، و إربح أكثر" width={900} height={601} loading="lazy" className="h-auto w-56 sm:w-64" />
    </div>
  );
}
