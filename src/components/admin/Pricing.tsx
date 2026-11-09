import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/hooks/use-i18n";
import { deleteTokenPack, listAdminPricing, saveBoost, savePlan, saveTokenPack } from "@/lib/admin.functions";
import type { Boost, Plan, TokenPack } from "@/lib/catalog-map";
import type { Msg } from "@/lib/i18n";
import { A, Confirm, field, Loading, MsgFields, Panel, useAction } from "./shared";

const KEYS = [["admin", "pricing"]];
const EMPTY: Msg = { ar: "", fr: "", en: "" };
const DT = { ar: "د.ت", fr: "DT", en: "TND" };

function Num({ label, value, onChange, step }: { label: string; value: number; onChange: (n: number) => void; step?: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input type="number" min={0} step={step ?? "1"} className={field} value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function ActiveSwitch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  const { t } = useI18n();
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <Switch checked={value} onCheckedChange={onChange} /> {label ?? t(A.active)}
    </label>
  );
}

function PackRow({ pack, onDone }: { pack: TokenPack | null; onDone?: () => void }) {
  const { t } = useI18n();
  const save = useServerFn(saveTokenPack);
  const remove = useServerFn(deleteTokenPack);
  const act = useAction();
  const [p, setP] = useState({ tokens: pack?.tokens ?? 10, price: pack?.price ?? 10, tag: pack?.tag ?? EMPTY, sortOrder: pack?.sortOrder ?? 99, isActive: pack?.isActive ?? true });
  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card p-4 lg:grid-cols-[1fr_1fr_2fr_auto]">
      <Num label={t({ ar: "عدد النقاط", fr: "Jetons", en: "Tokens" })} value={p.tokens} onChange={(tokens) => setP({ ...p, tokens })} />
      <Num label={`${t({ ar: "السعر", fr: "Prix", en: "Price" })} (${t(DT)})`} value={p.price} step="0.5" onChange={(price) => setP({ ...p, price })} />
      <MsgFields label={t({ ar: "علامة (اختياري)", fr: "Étiquette (facultatif)", en: "Tag (optional)" })} value={p.tag} onChange={(tag) => setP({ ...p, tag })} />
      <div className="flex flex-col gap-3">
        <Num label={t(A.order)} value={p.sortOrder} onChange={(sortOrder) => setP({ ...p, sortOrder })} />
        <ActiveSwitch value={p.isActive} onChange={(isActive) => setP({ ...p, isActive })} />
        <div className="flex gap-1.5">
          <Button size="sm" variant="rust" onClick={() => void act(() => save({ data: { id: pack?.id ?? null, ...p } }), KEYS).then((ok) => ok && onDone?.())}>
            {t(A.save)}
          </Button>
          {pack ? (
            <Confirm onConfirm={() => void act(() => remove({ data: { id: pack.id } }), KEYS)} trigger={<Button size="sm" variant="ghost" className="text-destructive" aria-label={t(A.delete)}><Trash2 /></Button>} />
          ) : (
            <Button size="sm" variant="ghost" onClick={onDone}>{t(A.cancel)}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function BoostRow({ boost }: { boost: Boost }) {
  const { t } = useI18n();
  const save = useServerFn(saveBoost);
  const act = useAction();
  const [b, setB] = useState({ name: boost.name, description: boost.description, cost: boost.cost, isActive: boost.isActive });
  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card p-4 lg:grid-cols-[2fr_2fr_auto]">
      <MsgFields label={t({ ar: "الاسم", fr: "Nom", en: "Name" })} value={b.name} onChange={(name) => setB({ ...b, name })} />
      <MsgFields label={t({ ar: "الوصف", fr: "Description", en: "Description" })} value={b.description} multiline onChange={(description) => setB({ ...b, description })} />
      <div className="flex flex-col gap-3">
        <Num label={t({ ar: "الكلفة (نقاط)", fr: "Coût (jetons)", en: "Cost (tokens)" })} value={b.cost} onChange={(cost) => setB({ ...b, cost })} />
        <ActiveSwitch value={b.isActive} onChange={(isActive) => setB({ ...b, isActive })} />
        <Button size="sm" variant="rust" onClick={() => void act(() => save({ data: { id: boost.id, ...b } }), KEYS)}>{t(A.save)}</Button>
      </div>
    </div>
  );
}

function PlanRow({ plan }: { plan: Plan }) {
  const { t } = useI18n();
  const save = useServerFn(savePlan);
  const act = useAction();
  const lines = (k: keyof Msg) => plan.features.map((f) => f[k]).join("\n");
  const [p, setP] = useState({ name: plan.name, price: plan.price, highlight: plan.highlight, isActive: plan.isActive, features: { ar: lines("ar"), fr: lines("fr"), en: lines("en") } });

  function submit() {
    const split = (s: string) => s.split("\n").map((x) => x.trim());
    const ar = split(p.features.ar), fr = split(p.features.fr), en = split(p.features.en);
    const n = Math.max(ar.length, fr.length, en.length);
    const features = Array.from({ length: n }, (_, i) => ({ ar: ar[i] ?? "", fr: fr[i] ?? "", en: en[i] ?? "" })).filter((f) => f.ar || f.fr || f.en);
    void act(() => save({ data: { id: plan.id, name: p.name, price: p.price, features, highlight: p.highlight, isActive: p.isActive } }), KEYS);
  }

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card p-4 lg:grid-cols-[1fr_2fr_auto]">
      <MsgFields label={t({ ar: "الاسم", fr: "Nom", en: "Name" })} value={p.name} onChange={(name) => setP({ ...p, name })} />
      <MsgFields label={t({ ar: "المزايا (واحدة في كل سطر)", fr: "Avantages (un par ligne)", en: "Features (one per line)" })} value={p.features} multiline onChange={(features) => setP({ ...p, features })} />
      <div className="flex flex-col gap-3">
        <Num label={`${t({ ar: "السعر في الشهر", fr: "Prix / mois", en: "Price / month" })} (${t(DT)})`} value={p.price} step="0.5" onChange={(price) => setP({ ...p, price })} />
        <ActiveSwitch value={p.highlight} onChange={(highlight) => setP({ ...p, highlight })} label={t({ ar: "مبرز", fr: "Mis en avant", en: "Highlighted" })} />
        <ActiveSwitch value={p.isActive} onChange={(isActive) => setP({ ...p, isActive })} />
        <Button size="sm" variant="rust" onClick={submit}>{t(A.save)}</Button>
      </div>
    </div>
  );
}

export function PricingPanel() {
  const { t } = useI18n();
  const fetchPricing = useServerFn(listAdminPricing);
  const q = useQuery({ queryKey: ["admin", "pricing"], queryFn: () => fetchPricing() });
  const [adding, setAdding] = useState(false);
  if (!q.data) return <Loading error={q.isError} />;
  const stamp = q.dataUpdatedAt;

  return (
    <div className="grid gap-6">
      <Panel
        title={t({ ar: "باقات النقاط", fr: "Packs de jetons", en: "Token packs" })}
        action={!adding && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus /> {t(A.add)}</Button>}
      >
        <div className="grid gap-3">
          {q.data.packs.map((p) => <PackRow key={`${p.id}-${stamp}`} pack={p} />)}
          {adding && <PackRow pack={null} onDone={() => setAdding(false)} />}
        </div>
      </Panel>
      <Panel title={t({ ar: "خدمات الترويج", fr: "Boosts", en: "Boosts" })}>
        <div className="grid gap-3">{q.data.boosts.map((b) => <BoostRow key={`${b.id}-${stamp}`} boost={b} />)}</div>
      </Panel>
      <Panel title={t({ ar: "الاشتراكات", fr: "Abonnements", en: "Plans" })}>
        <div className="grid gap-3">{q.data.plans.map((p) => <PlanRow key={`${p.id}-${stamp}`} plan={p} />)}</div>
      </Panel>
    </div>
  );
}
