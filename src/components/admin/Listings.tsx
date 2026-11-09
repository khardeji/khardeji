import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, EyeOff, ExternalLink, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { governorateLabel, LISTING_STATUS_LABEL, SALE_TYPE_LABEL, subcategoryLabel, type ListingStatus } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { deleteAdminListing, listAdminListings, updateAdminListing } from "@/lib/admin.functions";
import { UNIT_LABEL } from "@/lib/quantity";
import { cn } from "@/lib/utils";
import { A, Confirm, field, Loading, Panel, useAction } from "./shared";

export const STATUS_BADGE: Record<ListingStatus, "brass" | "olive" | "destructive" | "dark" | "secondary"> = {
  pending: "brass",
  approved: "olive",
  rejected: "destructive",
  hidden: "dark",
  sold: "secondary",
};

const STATUSES: ListingStatus[] = ["pending", "approved", "rejected", "hidden", "sold"];

export function ListingsPanel({ status, onStatus }: { status: ListingStatus | "all"; onStatus: (s: ListingStatus | "all") => void }) {
  const { t, dt, date, num } = useI18n();
  const fetchListings = useServerFn(listAdminListings);
  const update = useServerFn(updateAdminListing);
  const remove = useServerFn(deleteAdminListing);
  const act = useAction();
  const [query, setQuery] = useState("");
  const [rejecting, setRejecting] = useState<{ id: string; note: string } | null>(null);
  const q = useQuery({ queryKey: ["admin", "listings"], queryFn: () => fetchListings() });
  const keys = [["admin", "listings"], ["admin", "overview"]];

  const all = q.data ?? [];
  const needle = query.trim().toLowerCase();
  const rows = all
    .filter((l) => status === "all" || l.status === status)
    .filter((l) => !needle || `${Object.values(l.title).join(" ")} ${l.ownerEmail} ${l.seller.name}`.toLowerCase().includes(needle));
  const count = (s: ListingStatus) => all.filter((l) => l.status === s).length;

  const setStatus = (id: string, s: ListingStatus, note?: string) => act(() => update({ data: { id, status: s, note } }), keys);

  return (
    <Panel
      title={t({ ar: "مراجعة الإعلانات", fr: "Modération des annonces", en: "Listing moderation" })}
      action={
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">{t({ ar: "لوّج", fr: "Rechercher", en: "Search" })}</span>
          <input className={`${field} ps-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t({ ar: "عنوان، بائع، إيمايل…", fr: "Titre, vendeur, email…", en: "Title, seller, email…" })} />
        </label>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => onStatus(s)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition",
              status === s ? "border-rust bg-rust text-rust-foreground" : "border-border bg-card hover:border-rust/50",
            )}
          >
            {s === "all" ? t({ ar: "الكل", fr: "Toutes", en: "All" }) : t(LISTING_STATUS_LABEL[s])} ({num(s === "all" ? all.length : count(s))})
          </button>
        ))}
      </div>

      {!q.data ? (
        <Loading error={q.isError} />
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t({ ar: "ما فمّا حتى إعلان هنا.", fr: "Aucune annonce ici.", en: "No listings here." })}</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((l) => {
            const st = l.status ?? "approved";
            return (
              <li key={l.id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:flex-row">
                <img src={l.images[0]} alt="" className="h-28 w-full shrink-0 rounded-md object-cover md:h-24 md:w-32" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_BADGE[st]}>{t(LISTING_STATUS_LABEL[st])}</Badge>
                    <Badge variant="outline">{t(SALE_TYPE_LABEL[l.saleType])}</Badge>
                    {!l.ownerId && <Badge variant="outline">{t({ ar: "تجريبي", fr: "Démo", en: "Demo" })}</Badge>}
                  </div>
                  <h3 className="mt-2 truncate text-lg font-semibold">{t(l.title)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t(subcategoryLabel(l.subcategory))} · {t(governorateLabel(l.governorate))} · {dt(l.auction?.startPrice ?? l.price)} / {t(UNIT_LABEL[l.unit].short)}
                    {l.publishedAt && ` · ${date(l.publishedAt)}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.seller.name}
                    {l.ownerEmail && <span dir="ltr"> · {l.ownerEmail}</span>}
                    {l.seller.phone && <span dir="ltr"> · {l.seller.phone}</span>}
                  </p>
                  {t(l.description) && (
                    <p className="mt-2 line-clamp-2 text-sm">{t(l.description)}</p>
                  )}
                  {l.moderationNote && (
                    <p className="mt-2 rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                      {t({ ar: "ملاحظة:", fr: "Note :", en: "Note:" })} {l.moderationNote}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <Switch checked={!!l.featured} onCheckedChange={(v) => void act(() => update({ data: { id: l.id, featured: v } }), keys)} />
                      {t({ ar: "في الواجهة", fr: "À la une", en: "Featured" })}
                    </label>
                    <label className="flex items-center gap-2">
                      <Switch checked={!!l.urgent} onCheckedChange={(v) => void act(() => update({ data: { id: l.id, urgent: v } }), keys)} />
                      {t({ ar: "مستعجل", fr: "Urgent", en: "Urgent" })}
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap content-start gap-2 md:w-44 md:flex-col">
                  {st !== "approved" && (
                    <Button size="sm" variant="rust" onClick={() => void setStatus(l.id, "approved", "")}>
                      <Check /> {t({ ar: "اقبل وانشر", fr: "Valider", en: "Approve" })}
                    </Button>
                  )}
                  {st !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => setRejecting({ id: l.id, note: l.moderationNote ?? "" })}>
                      <X /> {t({ ar: "ارفض", fr: "Refuser", en: "Reject" })}
                    </Button>
                  )}
                  {st !== "hidden" && (
                    <Button size="sm" variant="outline" onClick={() => void setStatus(l.id, "hidden")}>
                      <EyeOff /> {t({ ar: "خبّي", fr: "Masquer", en: "Hide" })}
                    </Button>
                  )}
                  {st === "approved" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => void setStatus(l.id, "sold")}>
                        {t({ ar: "تباع", fr: "Marquer vendue", en: "Mark sold" })}
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/annonces/$id" params={{ id: l.id }} target="_blank">
                          <ExternalLink /> {t({ ar: "شوف", fr: "Voir", en: "View" })}
                        </Link>
                      </Button>
                    </>
                  )}
                  <Confirm
                    onConfirm={() => void act(() => remove({ data: { id: l.id } }), keys)}
                    trigger={
                      <Button size="sm" variant="ghost" className="text-destructive">
                        <Trash2 /> {t(A.delete)}
                      </Button>
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t({ ar: "رفض الإعلان", fr: "Refuser l'annonce", en: "Reject listing" })}</DialogTitle>
          </DialogHeader>
          <label className="text-sm font-medium" htmlFor="reject-note">
            {t({ ar: "السبب (يبان للبائع)", fr: "Motif (visible par le vendeur)", en: "Reason (shown to the seller)" })}
          </label>
          <textarea
            id="reject-note"
            rows={3}
            maxLength={500}
            className={`${field} h-auto py-2`}
            value={rejecting?.note ?? ""}
            onChange={(e) => setRejecting((r) => (r ? { ...r, note: e.target.value } : r))}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>{t(A.cancel)}</Button>
            <Button
              variant="rust"
              onClick={() => {
                if (!rejecting) return;
                const { id, note } = rejecting;
                setRejecting(null);
                void setStatus(id, "rejected", note.trim());
              }}
            >
              <X /> {t({ ar: "ارفض", fr: "Refuser", en: "Reject" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
