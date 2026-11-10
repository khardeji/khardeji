import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, EyeOff, ExternalLink, RotateCcw, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LISTING_STATUS_LABEL } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { deleteAdminReport, listAdminReports, updateAdminListing, updateAdminReport, type ReportStatus } from "@/lib/admin.functions";
import type { Msg } from "@/lib/i18n";
import { REPORT_REASON_LABEL, type ReportReason } from "@/lib/report-rules";
import { cn } from "@/lib/utils";
import { STATUS_BADGE } from "./Listings";
import { A, Confirm, Loading, Panel, useAction } from "./shared";

const STATUS_LABEL: Record<ReportStatus, Msg> = {
  open: { ar: "في الانتظار", fr: "À traiter", en: "Open" },
  resolved: { ar: "تعالج", fr: "Traité", en: "Resolved" },
  dismissed: { ar: "مرفوض", fr: "Rejeté", en: "Dismissed" },
};
const STATUS_VARIANT: Record<ReportStatus, "brass" | "olive" | "secondary"> = { open: "brass", resolved: "olive", dismissed: "secondary" };
const FILTERS: (ReportStatus | "all")[] = ["open", "resolved", "dismissed", "all"];

export function ReportsPanel() {
  const { t, date, num } = useI18n();
  const fetchReports = useServerFn(listAdminReports);
  const update = useServerFn(updateAdminReport);
  const remove = useServerFn(deleteAdminReport);
  const updateListing = useServerFn(updateAdminListing);
  const act = useAction();
  const [filter, setFilter] = useState<ReportStatus | "all">("open");
  const q = useQuery({ queryKey: ["admin", "reports"], queryFn: () => fetchReports() });
  const keys = [["admin", "reports"], ["admin", "listings"], ["admin", "overview"]];

  const title = t({ ar: "التبليغات", fr: "Signalements", en: "Reports" });
  if (!q.data) return <Panel title={title}><Loading error={q.isError} /></Panel>;
  if (!q.data.ready) {
    return (
      <Panel title={title}>
        <p className="rounded-md border border-brass/50 bg-brass/10 p-4 text-sm">
          {t({
            ar: "التبليغات مازالت ما تخدمش: لازم تشغّل الملف khardeji-favoris-signalements.sql في Supabase (SQL Editor) مرّة وحدة.",
            fr: "Les signalements ne sont pas encore activés : exécutez une fois le fichier khardeji-favoris-signalements.sql dans Supabase (SQL Editor).",
            en: "Reports aren't set up yet: run khardeji-favoris-signalements.sql once in Supabase (SQL Editor).",
          })}
        </p>
      </Panel>
    );
  }

  const all = q.data.reports;
  const rows = all.filter((r) => filter === "all" || r.status === filter);
  const count = (s: ReportStatus) => all.filter((r) => r.status === s).length;
  const setStatus = (id: string, status: ReportStatus) => act(() => update({ data: { id, status } }), keys);
  const hideAndResolve = (reportId: string, listingId: string) =>
    act(async () => {
      const res = await updateListing({ data: { id: listingId, status: "hidden", note: "Masquée suite à un signalement" } });
      if (!res.ok) return res;
      return update({ data: { id: reportId, status: "resolved" } });
    }, keys);

  return (
    <Panel title={title}>
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filter === s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition",
              filter === s ? "border-rust bg-rust text-rust-foreground" : "border-border bg-card hover:border-rust/50",
            )}
          >
            {s === "all" ? t({ ar: "الكل", fr: "Tous", en: "All" }) : t(STATUS_LABEL[s])} ({num(s === "all" ? all.length : count(s))})
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t({ ar: "ما فمّا حتى تبليغ هنا.", fr: "Aucun signalement ici.", en: "No reports here." })}</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_VARIANT[r.status]}>{t(STATUS_LABEL[r.status])}</Badge>
                    <Badge variant="rust">{t(REPORT_REASON_LABEL[r.reason as ReportReason] ?? { ar: r.reason, fr: r.reason, en: r.reason })}</Badge>
                    {r.listingStatus && <Badge variant={STATUS_BADGE[r.listingStatus]}>{t(LISTING_STATUS_LABEL[r.listingStatus])}</Badge>}
                  </div>
                  <p className="font-semibold">
                    {r.listingTitle ? t(r.listingTitle) : t({ ar: "إعلان تفسخ", fr: "Annonce supprimée", en: "Deleted listing" })}
                  </p>
                  {r.details && <p className="whitespace-pre-line text-sm text-foreground/85">« {r.details} »</p>}
                  <p className="text-xs text-muted-foreground">
                    {t({ ar: "بلّغ عليه", fr: "Signalé par", en: "Reported by" })} <span dir="ltr">{r.reporterEmail || r.reporterName || "—"}</span> · {date(r.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.listingStatus === "approved" && (
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/annonces/$id" params={{ id: r.listingId }} target="_blank">
                        <ExternalLink /> {t({ ar: "شوف", fr: "Voir", en: "View" })}
                      </Link>
                    </Button>
                  )}
                  {r.status === "open" ? (
                    <>
                      {r.listingStatus === "approved" && (
                        <Button size="sm" variant="rust" onClick={() => void hideAndResolve(r.id, r.listingId)}>
                          <EyeOff /> {t({ ar: "خبّي الإعلان", fr: "Masquer l'annonce", en: "Hide listing" })}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => void setStatus(r.id, "resolved")}>
                        <Check /> {t(STATUS_LABEL.resolved)}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void setStatus(r.id, "dismissed")}>
                        <X /> {t({ ar: "ارفض", fr: "Rejeter", en: "Dismiss" })}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => void setStatus(r.id, "open")}>
                      <RotateCcw /> {t({ ar: "رجّعو", fr: "Rouvrir", en: "Reopen" })}
                    </Button>
                  )}
                  <Confirm
                    trigger={
                      <Button size="sm" variant="ghost" aria-label={t(A.delete)}>
                        <Trash2 />
                      </Button>
                    }
                    onConfirm={() => void act(() => remove({ data: { id: r.id } }), keys)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
