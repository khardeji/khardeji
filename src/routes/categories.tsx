import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/site/SectionHeading";
import { CATEGORIES, LISTINGS, subcategoryLabel } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Catégories — Métaux, pièces auto, véhicules, industriel | Khardeji" },
      { name: "description", content: "Toutes les catégories Khardeji : ferraille et métaux, pièces automobiles, véhicules accidentés, matériel industriel et matériaux de récupération." },
      { property: "og:title", content: "Catégories Khardeji" },
      { property: "og:description", content: "Ferraille, pièces auto, véhicules accidentés et matériel industriel en Tunisie." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Categories,
});

function Categories() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader eyebrow="Catalogue" title="Toutes les catégories" intro="Choisissez une famille de produits puis affinez par sous-catégorie." />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2">
        {CATEGORIES.map((c) => {
          const count = LISTINGS.filter((l) => l.category === c.slug).length;
          return (
            <article key={c.slug} className="surface-card overflow-hidden">
              <Link to="/annonces" search={{ cat: c.slug }} className="group relative isolate block h-48 overflow-hidden">
                <img src={c.image} alt="" loading="lazy" width={1024} height={768} className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-charcoal/90 to-charcoal/10" />
                <div className="flex h-full flex-col justify-end p-5 text-on-dark">
                  <p className="label-stamp text-[0.68rem] text-brass">{count} annonce{count > 1 ? "s" : ""}</p>
                  <h2 className="flex items-center gap-2 text-2xl font-semibold">
                    {t(c.name)} <ArrowRight className="size-5 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                  </h2>
                </div>
              </Link>
              <div className="flex flex-wrap gap-2 p-5">
                {c.subcategories.map((s) => (
                  <Link key={s} to="/annonces" search={{ cat: c.slug, sub: s }} className="rounded-full border border-border bg-background px-3 py-1.5 text-sm transition hover:border-rust hover:text-rust">
                    {t(subcategoryLabel(s))}
                  </Link>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
