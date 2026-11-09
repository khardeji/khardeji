import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { governorateLabel, GOVERNORATES } from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-queries";
import { useI18n } from "@/hooks/use-i18n";

const fieldClass =
  "h-12 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition focus:border-rust focus:ring-2 focus:ring-rust/25";

export function HeroSearch() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { categories } = useCatalog();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [gov, setGov] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  const L = {
    q: t({ ar: "شنوّة تلوّج؟", fr: "Que recherchez-vous ?", en: "What are you looking for?" }),
    cat: t({ ar: "الصنف", fr: "Catégorie", en: "Category" }),
    allCat: t({ ar: "كل الأصناف", fr: "Toutes catégories", en: "All categories" }),
    gov: t({ ar: "الولاية", fr: "Gouvernorat", en: "Governorate" }),
    allGov: t({ ar: "كامل تونس", fr: "Toute la Tunisie", en: "All of Tunisia" }),
    min: t({ ar: "أدنى سعر", fr: "Prix minimum", en: "Minimum price" }),
    max: t({ ar: "أقصى سعر", fr: "Prix maximum", en: "Maximum price" }),
    minPh: t({ ar: "من (د.ت)", fr: "Min DT", en: "Min TND" }),
    maxPh: t({ ar: "إلى (د.ت)", fr: "Max DT", en: "Max TND" }),
    go: t({ ar: "ابحث", fr: "Rechercher", en: "Search" }),
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    navigate({
      to: "/annonces",
      search: {
        q: q || undefined,
        cat: cat || undefined,
        gov: gov || undefined,
        min: min ? Number(min) : undefined,
        max: max ? Number(max) : undefined,
      },
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-xl border border-border bg-background/95 p-2 shadow-lift backdrop-blur md:grid-cols-[2fr_1.3fr_1.2fr_0.8fr_0.8fr_auto]"
    >
      <label className="sr-only" htmlFor="hs-q">{L.q}</label>
      <input id="hs-q" className={fieldClass} placeholder={L.q} value={q} onChange={(e) => setQ(e.target.value)} />
      <label className="sr-only" htmlFor="hs-cat">{L.cat}</label>
      <select id="hs-cat" className={fieldClass} value={cat} onChange={(e) => setCat(e.target.value)}>
        <option value="">{L.allCat}</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>{t(c.name)}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="hs-gov">{L.gov}</label>
      <select id="hs-gov" className={fieldClass} value={gov} onChange={(e) => setGov(e.target.value)}>
        <option value="">{L.allGov}</option>
        {GOVERNORATES.map((g) => (
          <option key={g} value={g}>{t(governorateLabel(g))}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="hs-min">{L.min}</label>
      <input id="hs-min" type="number" min={0} inputMode="decimal" className={fieldClass} placeholder={L.minPh} value={min} onChange={(e) => setMin(e.target.value)} />
      <label className="sr-only" htmlFor="hs-max">{L.max}</label>
      <input id="hs-max" type="number" min={0} inputMode="decimal" className={fieldClass} placeholder={L.maxPh} value={max} onChange={(e) => setMax(e.target.value)} />
      <Button type="submit" variant="rust" className="h-12 px-6">
        <Search /> {L.go}
      </Button>
    </form>
  );
}
