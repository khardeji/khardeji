import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Coins, Layers, RotateCcw, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import {
  listAdminSubscriptionRequests,
  reviewAdminSubscriptionRequest,
  type AdminSubscriptionRequest,
} from "@/lib/admin.functions";
import type { Msg } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Confirm, Loading, Panel, useAction } from "./shared";

const STATUS_LABEL: Record<string, Msg> = {
  pending: { ar: "في الانتظار", fr: "En attente", en: "Pending" },
  approved: { ar: "تمت الموافقة", fr: "Validée", en: "Approved" },
  rejected: { ar: "مرفوضة", fr: "Rejetée", en: "Rejected" },
};

const STATUS_VARIANT: Record<string, "brass" | "olive" | "secondary"> = {
  pending: "brass",
  approved: "olive",
  rejected: "secondary",
};

const TYPE_LABEL: Record<string, Msg> = {
  subscription: { ar: "اشتراك باقة", fr: "Souscription forfait", en: "Subscription" },
  renewal: { ar: "تجديد باقة", fr: "Renouvellement forfait", en: "Renewal" },
  token_pack: { ar: "شراء نقاط", fr: "Achat de jetons", en: "Token purchase" },
};

export function SubscriptionsPanel() {
  const { t, dt, date } = useI18n();
  const fetchRequests = useServerFn(listAdminSubscriptionRequests);
  const review = useServerFn(reviewAdminSubscriptionRequest);
  const act = useAction();
  const [filter, setFilter] = useState<string>("pending");

  const q = useQuery({ queryKey: ["admin", "subscriptions"], queryFn: () => fetchRequests() });
  const keys = [["admin", "subscriptions"], ["admin", "users"], ["admin", "overview"]];

  const title = t({ ar: "طلبات الاشتراكات والنقاط", fr: "Demandes d'abonnements & jetons", en: "Subscriptions & Tokens requests" });

  if (!q.data) return <Panel title={title}><Loading error={q.isError} /></Panel>;
  if (!q.data.ready) {
    return (
      <Panel title={title}>
        <p className="rounded-md border border-brass/50 bg-brass/10 p-4 text-sm">
          {t({
            ar: "الطلبات غير مفعلة بعد: يرجى تنفيذ ملف khardeji-services-abonnements.sql في Supabase (SQL Editor).",
            fr: "Les demandes ne sont pas encore activées : exécutez le script khardeji-services-abonnements.sql dans Supabase (SQL Editor).",
            en: "Requests are not active yet: please run khardeji-services-abonnements.sql in Supabase (SQL Editor).",
          })}
        </p>
      </Panel>
    );
  }

  const all = q.data.requests;
  const rows = all.filter((r) => filter === "all" || r.status === filter);
  const count = (s: string) => all.filter((r) => r.status === s).length;

  const handleAction = (id: string, action: "approve" | "reject") =>
    act(() => review({ data: { id, action } }), keys);

  return (
    <Panel title={title}>
      <div className="mb-5 flex flex-wrap gap-2">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filter === s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition",
              filter === s
                ? "border-rust bg-rust text-rust-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {s === "all" ? t({ ar: "الكل", fr: "Toutes", en: "All" }) : t(STATUS_LABEL[s]!)}
            {s !== "all" && <span className="ms-1.5 opacity-80">({count(s)})</span>}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          {t({ ar: "لا توجد طلبات في هذا القسم.", fr: "Aucune demande dans cette section.", en: "No requests in this section." })}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r: AdminSubscriptionRequest) => {
            const isPending = r.status === "pending";
            return (
              <div key={r.id} className="surface-card flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_VARIANT[r.status] || "secondary"}>
                      {t(STATUS_LABEL[r.status] || { ar: r.status, fr: r.status, en: r.status })}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {r.type === "token_pack" ? <Coins className="size-3 text-brass" /> : <Sparkles className="size-3 text-olive" />}
                      {t(TYPE_LABEL[r.type] || { ar: r.type, fr: r.type, en: r.type })}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{date(r.createdAt)}</span>
                  </div>

                  <div className="text-sm">
                    <span className="font-semibold text-foreground">{r.userName}</span>
                    {r.userPhone && <span className="ms-2 font-mono text-xs text-muted-foreground">({r.userPhone})</span>}
                    {r.userEmail && <span className="ms-2 text-xs text-muted-foreground">&lt;{r.userEmail}&gt;</span>}
                  </div>

                  <div className="font-medium text-foreground">
                    {r.type === "token_pack" ? (
                      <span>
                        Pack de <strong className="text-rust">{r.tokensCount} jetons</strong> · Montant : {dt(r.amount)}
                      </span>
                    ) : (
                      <span>
                        Forfait <strong className="text-rust uppercase">{r.planId}</strong> · Montant : {dt(r.amount)}
                      </span>
                    )}
                  </div>

                  {r.notes && (
                    <p className="rounded bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
                      <strong>Note client :</strong> {r.notes}
                    </p>
                  )}
                </div>

                {isPending && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Confirm
                      title={t({ ar: "تأكيد الموافقة؟", fr: "Valider cette demande ?", en: "Approve this request?" })}
                      description={
                        r.type === "token_pack"
                          ? t({
                              ar: `سيتم إضافة ${r.tokensCount} نقطة إلى رصيد المستخدم.`,
                              fr: `Ce client recevra ${r.tokensCount} jetons sur son solde.`,
                              en: `This user will receive ${r.tokensCount} tokens.`,
                            })
                          : t({
                              ar: `سيتم تفعيل باقة ${r.planId} وإضافة النقاط المجانية.`,
                              fr: `Ce client passera au forfait ${r.planId} avec ses jetons mensuels.`,
                              en: `This user will be upgraded to plan ${r.planId}.`,
                            })
                      }
                      onConfirm={() => void handleAction(r.id, "approve")}
                      trigger={
                        <Button size="sm" variant="rust" className="gap-1.5">
                          <Check className="size-4" />
                          {t({ ar: "موافقة وتفعيل", fr: "Valider & Créditer", en: "Approve" })}
                        </Button>
                      }
                    />

                    <Confirm
                      title={t({ ar: "رفض الطلب؟", fr: "Rejeter cette demande ?", en: "Reject this request?" })}
                      onConfirm={() => void handleAction(r.id, "reject")}
                      trigger={
                        <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:bg-destructive/10">
                          <X className="size-4" />
                          {t({ ar: "رفض", fr: "Rejeter", en: "Reject" })}
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

