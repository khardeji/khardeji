import { useServerFn } from "@tanstack/react-start";
import { Flag, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { reportListing, type ReportResult } from "@/lib/engagement.functions";
import type { Msg } from "@/lib/i18n";
import { REPORT_DETAILS_MAX, REPORT_REASON_LABEL, REPORT_REASONS, reportProblem, type ReportReason } from "@/lib/report-rules";
import { AccountRequiredDialog } from "./ActionDialogs";

const ERRORS: Record<Exclude<ReportResult, { ok: true }>["error"], Msg> = {
  reason: { ar: "اختار سبب التبليغ.", fr: "Choisissez une raison.", en: "Choose a reason." },
  details_required: { ar: "اشرحلنا المشكل في كلمتين على الأقل.", fr: "Expliquez le problème en quelques mots.", en: "Explain the problem in a few words." },
  details_too_long: { ar: "التفاصيل طويلة برشا (1000 حرف أقصى حد).", fr: "Détails trop longs (1000 caractères maximum).", en: "Details too long (1,000 characters max)." },
  already: { ar: "بلّغت على الإعلان هذا قبل، فريقنا قاعد يراجع فيه.", fr: "Vous avez déjà signalé cette annonce, notre équipe l'examine.", en: "You already reported this listing; our team is reviewing it." },
  blocked: { ar: "الحساب متاعك موقوف، ما تنجمش تبلّغ.", fr: "Votre compte est bloqué, vous ne pouvez pas signaler.", en: "Your account is blocked, you can't report." },
  not_ready: { ar: "التبليغ مازال ما يخدمش توّا. عاود جرّب مبعد.", fr: "Les signalements ne sont pas encore disponibles. Réessayez plus tard.", en: "Reporting isn't available yet. Try again later." },
  failed: { ar: "ما نجمناش نبعثو التبليغ. عاود جرّب.", fr: "Échec de l'envoi. Réessayez.", en: "Could not send the report. Try again." },
};

/** Report a listing: account check → reason form → saved for the moderators. */
export function ReportButton({ listingId, listingTitle }: { listingId: string; listingTitle: string }) {
  const { t, dir } = useI18n();
  const { user, loading } = useAuth();
  const send = useServerFn(reportListing);
  const [step, setStep] = useState<"closed" | "account" | "form">("closed");
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setStep("closed");
    setError(null);
  };

  async function submit() {
    const problem = reportProblem({ reason, details });
    if (problem) {
      setError(ERRORS[problem]);
      return;
    }
    setBusy(true);
    const res: ReportResult = await send({ data: { listingId, reason, details } }).catch(() => ({ ok: false, error: "failed" }) as const);
    setBusy(false);
    if (res.ok) {
      toast.success(t({ ar: "وصلنا التبليغ", fr: "Signalement reçu", en: "Report received" }), {
        description: t({ ar: "فريق المراقبة باش يراجع الإعلان. شكراً!", fr: "Notre équipe de modération va examiner l'annonce. Merci !", en: "Our moderation team will review the listing. Thank you!" }),
      });
      setReason("");
      setDetails("");
      close();
    } else setError(ERRORS[res.error]);
  }

  const detailsRequired = reason === "other";

  return (
    <>
      <Button variant="outline" onClick={() => !loading && setStep(user ? "form" : "account")}>
        <Flag /> {t({ ar: "بلّغ", fr: "Signaler", en: "Report" })}
      </Button>
      <AccountRequiredDialog open={step === "account"} onClose={close} reason="signaler" />
      <Dialog open={step === "form"} onOpenChange={(o) => !o && !busy && close()}>
        <DialogContent dir={dir} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t({ ar: "بلّغ على الإعلان", fr: "Signaler l'annonce", en: "Report this listing" })}</DialogTitle>
            <DialogDescription>
              {t({ ar: "شنوّة المشكل في", fr: "Quel est le problème avec", en: "What's wrong with" })} « {listingTitle} » ?{" "}
              {t({ ar: "التبليغ يوصل للإدارة برك، والبائع ما يعرفش شكون بلّغ.", fr: "Seule l'administration le voit ; le vendeur ne saura pas qui l'a signalé.", en: "Only the administrators see it; the seller won't know who reported." })}
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={reason}
            onValueChange={(v) => {
              setReason(v as ReportReason);
              setError(null);
            }}
            aria-label={t({ ar: "سبب التبليغ", fr: "Raison du signalement", en: "Reason for reporting" })}
            className="gap-2"
            dir={dir}
          >
            {REPORT_REASONS.map((r) => (
              <Label
                key={r}
                htmlFor={`report-${r}`}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 font-normal has-[[data-state=checked]]:border-rust has-[[data-state=checked]]:bg-rust/5"
              >
                <RadioGroupItem id={`report-${r}`} value={r} />
                {t(REPORT_REASON_LABEL[r])}
              </Label>
            ))}
          </RadioGroup>

          <div className="space-y-1.5">
            <Label htmlFor="report-details">
              {t({ ar: "تفاصيل", fr: "Détails", en: "Details" })}{" "}
              <span className="text-muted-foreground">
                {detailsRequired ? t({ ar: "(لازم)", fr: "(obligatoire)", en: "(required)" }) : t({ ar: "(اختياري)", fr: "(facultatif)", en: "(optional)" })}
              </span>
            </Label>
            <Textarea
              id="report-details"
              rows={3}
              maxLength={REPORT_DETAILS_MAX}
              value={details}
              onChange={(e) => {
                setDetails(e.target.value);
                setError(null);
              }}
              placeholder={t({ ar: "مثلاً: البائع طلب الخلاص قبل ما نشوف السلعة…", fr: "Ex. : le vendeur demande un paiement avant de voir la marchandise…", en: "e.g. the seller asks for payment before I can see the goods…" })}
            />
            <p className="text-end text-xs text-muted-foreground" dir="ltr">{details.length}/{REPORT_DETAILS_MAX}</p>
          </div>

          {error && <p role="alert" className="text-sm font-medium text-destructive">{t(error)}</p>}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={close} disabled={busy}>{t({ ar: "إلغاء", fr: "Annuler", en: "Cancel" })}</Button>
            <Button variant="rust" onClick={() => void submit()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Send />} {t({ ar: "ابعث التبليغ", fr: "Envoyer le signalement", en: "Send report" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
