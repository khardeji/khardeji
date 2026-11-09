import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/site/SectionHeading";
import { subcategoryLabel } from "@/data/catalog";
import { catalogQuery, useCatalog } from "@/lib/catalog-queries";
import { useI18n } from "@/hooks/use-i18n";
import { pageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/categories")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  head: ({ match }) => ({
    meta: pageMeta(match.context.locale, {
      title: {
        ar: "الأصناف — معادن، قطع غيار، عربات، معدات | خردجي",
        fr: "Catégories — Métaux, pièces auto, véhicules, industriel | Khardeji",
        en: "Categories — Metals, car parts, vehicles, industrial | Khardeji",
      },
      description: {
        ar: "كل أصناف خردجي: خردة ومعادن، قطع غيار السيارات، عربات مصدومة، معدات صناعية ومواد الرسكلة.",
        fr: "Toutes les catégories Khardeji : ferraille et métaux, pièces automobiles, véhicules accidentés, matériel industriel et matériaux de récupération.",
        en: "All Khardeji categories: scrap and metals, car parts, damaged vehicles, industrial equipment and salvage materials.",
      },
    }),
  }),
  component: Categories,
});

function Categories() {
  const { t } = useI18n();
  const { categories, listings } = useCatalog();
  return (
    <>
      <PageHeader
        eyebrow={t({ ar: "الكتالوج", fr: "Catalogue", en: "Catalogue" })}
        title={t({ ar: "كل الأصناف", fr: "Toutes les catégories", en: "All categories" })}
        intro={t({
          ar: "اختار عايلة المنتوجات وبعد دقّق بالصنف الفرعي.",
          fr: "Choisissez une famille de produits puis affinez par sous-catégorie.",
          en: "Pick a product family, then narrow down by subcategory.",
        })}
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2">
        {categories.map((c) => {
          const count = listings.filter((l) => l.category === c.slug).length;
          return (
            <article key={c.slug} className="surface-card overflow-hidden">
              <Link to="/annonces" search={{ cat: c.slug }} className="group relative isolate block h-48 overflow-hidden">
                <img src={c.image} alt="" loading="lazy" width={1024} height={768} className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-charcoal/90 to-charcoal/10" />
                <div className="flex h-full flex-col justify-end p-5 text-on-dark">
                  <p className="label-stamp text-[0.68rem] text-brass">
                    {count} {t({ ar: "إعلان", fr: count > 1 ? "annonces" : "annonce", en: count > 1 ? "listings" : "listing" })}
                  </p>
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
