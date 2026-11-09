import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { DEMO_IMAGES, subcategoryLabel } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { deleteAdminCategory, listAdminCategories, saveAdminCategory, type CategoryInput } from "@/lib/admin.functions";
import type { Msg } from "@/lib/i18n";
import { A, Confirm, field, Loading, MsgFields, Panel, useAction } from "./shared";

const EMPTY_MSG: Msg = { ar: "", fr: "", en: "" };
const ERRORS: Record<string, Msg> = {
  slug: { ar: "المعرّف: حروف لاتينية صغيرة، أرقام و«-» برك.", fr: "Identifiant : minuscules, chiffres et tirets uniquement.", en: "Key: lowercase letters, digits and dashes only." },
  name: { ar: "اكتب اسم الصنف.", fr: "Indiquez un nom.", en: "Enter a name." },
  exists: { ar: "المعرّف هذا موجود.", fr: "Cet identifiant existe déjà.", en: "This key already exists." },
  in_use: { ar: "فمّا إعلانات في الصنف هذا. خبّيه عوض ما تفسخو.", fr: "Des annonces utilisent cette catégorie : désactivez-la plutôt.", en: "Listings use this category — deactivate it instead." },
};

export function CategoriesPanel() {
  const { t } = useI18n();
  const fetchCats = useServerFn(listAdminCategories);
  const save = useServerFn(saveAdminCategory);
  const remove = useServerFn(deleteAdminCategory);
  const act = useAction();
  const q = useQuery({ queryKey: ["admin", "categories"], queryFn: () => fetchCats() });
  const [edit, setEdit] = useState<(CategoryInput & { subText: string }) | null>(null);
  const keys = [["admin", "categories"], ["admin", "overview"]];

  function openNew() {
    setEdit({ slug: "", isNew: true, name: EMPTY_MSG, tagline: EMPTY_MSG, imageKey: "listing-recup", subcategories: [], subText: "", sortOrder: (q.data?.length ?? 0) + 1, isActive: true });
  }

  async function submit() {
    if (!edit) return;
    const { subText, ...rest } = edit;
    const subs = subText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!subs.length) {
      toast.error(t({ ar: "زيد صنف فرعي واحد على الأقل.", fr: "Ajoutez au moins une sous-catégorie.", en: "Add at least one subcategory." }));
      return;
    }
    const ok = await act(() => save({ data: { ...rest, slug: rest.slug.trim(), subcategories: subs } }), keys, ERRORS);
    if (ok) setEdit(null);
  }

  return (
    <Panel
      title={t({ ar: "الأصناف", fr: "Catégories", en: "Categories" })}
      action={<Button variant="rust" size="sm" onClick={openNew}><Plus /> {t({ ar: "صنف جديد", fr: "Nouvelle catégorie", en: "New category" })}</Button>}
    >
      {!q.data ? (
        <Loading error={q.isError} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {q.data.map((c) => (
            <li key={c.slug} className="flex gap-4 rounded-xl border border-border bg-card p-4">
              <img src={c.image} alt="" className="size-20 shrink-0 rounded-md object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{t(c.name)}</h3>
                  {!c.isActive && <Badge variant="dark">{t({ ar: "مخفي", fr: "Inactive", en: "Inactive" })}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground" dir="ltr">{c.slug} · #{c.sortOrder}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.subcategories.map((s) => t(subcategoryLabel(s))).join(" · ")}</p>
                <div className="mt-2 flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEdit({ slug: c.slug, isNew: false, name: c.name, tagline: c.tagline, imageKey: c.imageKey, subcategories: c.subcategories, subText: c.subcategories.join("\n"), sortOrder: c.sortOrder ?? 0, isActive: c.isActive ?? true })
                    }
                  >
                    <Pencil /> {t({ ar: "بدّل", fr: "Modifier", en: "Edit" })}
                  </Button>
                  <Confirm
                    onConfirm={() => void act(() => remove({ data: { slug: c.slug } }), keys, ERRORS)}
                    trigger={<Button size="sm" variant="ghost" className="text-destructive"><Trash2 /> {t(A.delete)}</Button>}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{edit?.isNew ? t({ ar: "صنف جديد", fr: "Nouvelle catégorie", en: "New category" }) : t({ ar: "بدّل الصنف", fr: "Modifier la catégorie", en: "Edit category" })}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium">
                {t({ ar: "المعرّف (في الرابط)", fr: "Identifiant (dans l'adresse)", en: "Key (in the address)" })}
                <input className={field} dir="ltr" value={edit.slug} disabled={!edit.isNew} placeholder="ex. pieces-moto" onChange={(e) => setEdit({ ...edit, slug: e.target.value.toLowerCase() })} />
              </label>
              <MsgFields label={t({ ar: "الاسم", fr: "Nom", en: "Name" })} value={edit.name} onChange={(name) => setEdit({ ...edit, name })} />
              <MsgFields label={t({ ar: "جملة قصيرة", fr: "Accroche", en: "Tagline" })} value={edit.tagline} onChange={(tagline) => setEdit({ ...edit, tagline })} />
              <label className="grid gap-1.5 text-sm font-medium">
                {t({ ar: "التصويرة", fr: "Image", en: "Image" })}
                <div className="flex items-center gap-3">
                  <img src={DEMO_IMAGES[edit.imageKey] ?? DEMO_IMAGES["listing-recup"]} alt="" className="size-12 rounded-md object-cover" />
                  <select className={field} value={edit.imageKey} onChange={(e) => setEdit({ ...edit, imageKey: e.target.value })}>
                    {Object.keys(DEMO_IMAGES).map((k) => <option key={k} value={k}>{k.replace("listing-", "")}</option>)}
                  </select>
                </div>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                {t({ ar: "الأصناف الفرعية (واحد في كل سطر)", fr: "Sous-catégories (une par ligne)", en: "Subcategories (one per line)" })}
                <textarea rows={5} className={`${field} h-auto py-2`} value={edit.subText} onChange={(e) => setEdit({ ...edit, subText: e.target.value })} />
              </label>
              <div className="flex flex-wrap items-end gap-6">
                <label className="grid gap-1.5 text-sm font-medium">
                  {t(A.order)}
                  <input type="number" className={`${field} w-24`} value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) })} />
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm font-medium">
                  <Switch checked={edit.isActive} onCheckedChange={(v) => setEdit({ ...edit, isActive: v })} /> {t(A.active)}
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>{t(A.cancel)}</Button>
            <Button variant="rust" onClick={() => void submit()}>{t(A.save)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
