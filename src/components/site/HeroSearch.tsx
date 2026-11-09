import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { CATEGORIES, GOVERNORATES } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";

const fieldClass =
  "h-12 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition focus:border-rust focus:ring-2 focus:ring-rust/25";

export function HeroSearch() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [gov, setGov] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

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
      <label className="sr-only" htmlFor="hs-q">Que recherchez-vous ?</label>
      <input id="hs-q" className={fieldClass} placeholder="Que recherchez-vous ?" value={q} onChange={(e) => setQ(e.target.value)} />
      <label className="sr-only" htmlFor="hs-cat">Catégorie</label>
      <select id="hs-cat" className={fieldClass} value={cat} onChange={(e) => setCat(e.target.value)}>
        <option value="">Toutes catégories</option>
        {CATEGORIES.map((c) => (
          <option key={c.slug} value={c.slug}>{t(c.name)}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="hs-gov">Gouvernorat</label>
      <select id="hs-gov" className={fieldClass} value={gov} onChange={(e) => setGov(e.target.value)}>
        <option value="">Toute la Tunisie</option>
        {GOVERNORATES.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="hs-min">Prix minimum</label>
      <input id="hs-min" type="number" min={0} inputMode="decimal" className={fieldClass} placeholder="Min DT" value={min} onChange={(e) => setMin(e.target.value)} />
      <label className="sr-only" htmlFor="hs-max">Prix maximum</label>
      <input id="hs-max" type="number" min={0} inputMode="decimal" className={fieldClass} placeholder="Max DT" value={max} onChange={(e) => setMax(e.target.value)} />
      <Button type="submit" variant="rust" className="h-12 px-6">
        <Search /> Rechercher
      </Button>
    </form>
  );
}
