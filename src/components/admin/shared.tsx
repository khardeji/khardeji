import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/hooks/use-i18n";
import type { Msg } from "@/lib/i18n";

export const field =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-rust focus:ring-2 focus:ring-rust/25";

export const A = {
  save: { ar: "سجّل", fr: "Enregistrer", en: "Save" },
  cancel: { ar: "إلغاء", fr: "Annuler", en: "Cancel" },
  delete: { ar: "فسخ", fr: "Supprimer", en: "Delete" },
  add: { ar: "زيد", fr: "Ajouter", en: "Add" },
  active: { ar: "مفعّل", fr: "Actif", en: "Active" },
  order: { ar: "الترتيب", fr: "Ordre", en: "Order" },
  saved: { ar: "تسجّل", fr: "Enregistré", en: "Saved" },
  failed: { ar: "ما نجمناش نسجّلو. عاود جرّب.", fr: "Échec de l'enregistrement. Réessayez.", en: "Could not save. Try again." },
  confirmTitle: { ar: "متأكد؟", fr: "Confirmer ?", en: "Are you sure?" },
  irreversible: { ar: "ما تنجمش ترجع فيها.", fr: "Cette action est définitive.", en: "This cannot be undone." },
  loading: { ar: "قاعد يتحمّل…", fr: "Chargement…", en: "Loading…" },
  loadError: { ar: "ما نجمناش نحمّلو المعطيات.", fr: "Impossible de charger les données.", en: "Could not load the data." },
} satisfies Record<string, Msg>;

/** Refresh admin data plus the public catalogue/prices that admin edits affect. */
export function useRefresh() {
  const qc = useQueryClient();
  return (...keys: string[][]) => Promise.all([...keys, ["catalog"], ["pricing"], ["stats"]].map((k) => qc.invalidateQueries({ queryKey: k })));
}

/** Run an admin action, show the outcome, refresh the given data. */
export function useAction() {
  const { t } = useI18n();
  const refresh = useRefresh();
  return async (run: () => Promise<{ ok: boolean; error?: string }>, keys: string[][], errors?: Record<string, Msg>) => {
    try {
      const res = await run();
      if (res.ok) {
        toast.success(t(A.saved));
        await refresh(...keys);
      } else {
        toast.error(t((res.error && errors?.[res.error]) || A.failed));
      }
      return res.ok;
    } catch {
      toast.error(t(A.failed));
      return false;
    }
  };
}

/** Three inputs (Arabic, French, English) for one piece of copy. */
export function MsgFields({ label, value, onChange, multiline }: { label: string; value: Msg; onChange: (m: Msg) => void; multiline?: boolean }) {
  const langs = [["ar", "ع"], ["fr", "FR"], ["en", "EN"]] as const;
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{label}</legend>
      {langs.map(([k, tag]) => (
        <div key={k} className="flex items-start gap-2">
          <span className="label-stamp mt-2.5 w-6 shrink-0 text-[0.65rem] text-muted-foreground">{tag}</span>
          {multiline ? (
            <textarea
              aria-label={`${label} ${tag}`}
              dir={k === "ar" ? "rtl" : "ltr"}
              rows={2}
              className={`${field} h-auto py-2`}
              value={value[k]}
              onChange={(e) => onChange({ ...value, [k]: e.target.value })}
            />
          ) : (
            <input
              aria-label={`${label} ${tag}`}
              dir={k === "ar" ? "rtl" : "ltr"}
              className={field}
              value={value[k]}
              onChange={(e) => onChange({ ...value, [k]: e.target.value })}
            />
          )}
        </div>
      ))}
    </fieldset>
  );
}

export function Confirm({ trigger, onConfirm, title, description }: { trigger: ReactNode; onConfirm: () => void; title?: string; description?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? t(A.confirmTitle)}</AlertDialogTitle>
          <AlertDialogDescription>{description ?? t(A.irreversible)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t(A.cancel)}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {t(A.delete)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Loading({ error }: { error?: boolean }) {
  const { t } = useI18n();
  return <p className="py-10 text-center text-sm text-muted-foreground">{t(error ? A.loadError : A.loading)}</p>;
}
