import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Coins, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import type { Msg } from "@/lib/i18n";
import { buyTokenPack, requestSubscription, type RequestOrderResult } from "@/lib/services.functions";
import { AccountRequiredDialog } from "./ActionDialogs";

export function BuyTokensDialog({
  pack,
  open,
  onClose,
  onSuccess,
}: {
  pack: { id: string; tokens: number; price: number; tag?: Msg | null | undefined } | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (() => void) | undefined;
}) {
  const { t, dt, num, dir } = useI18n();
  const { user } = useAuth();
  const buy = useServerFn(buyTokenPack);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [needAccount, setNeedAccount] = useState(false);

  if (!pack) return null;

  const handleBuy = async () => {
    if (!user) {
      setNeedAccount(true);
      return;
    }
    setBusy(true);
    const res: RequestOrderResult = await buy({
      data: {
        packId: pack.id,
        tokensCount: pack.tokens,
        amount: pack.price,
        notes: notes.trim(),
      },
    }).catch(() => ({ ok: false, error: "failed" }) as const);
    setBusy(false);

    if (res.ok) {
      toast.success(t({ ar: "تم تسجيل طلب شراء النقاط بنجاح!", fr: "Demande de jetons enregistrée !", en: "Token request submitted!" }), {
        description: t({
          ar: "سيتم مراجعة طلبك وإضافة النقاط إلى رصيدك من قبل الإدارة.",
          fr: "Votre demande a été transmise. Les jetons seront crédités dès validation par l'administration.",
          en: "Your request is submitted. Tokens will be credited once approved by administration.",
        }),
      });
      setNotes("");
      onClose();
      onSuccess?.();
    } else {
      if (res.error === "not_ready") {
        toast.error(
          t({
            ar: "خدمة الطلبات غير مفعلة بعد في قاعدة البيانات. يرجى تنفيذ ملف SQL في Supabase.",
            fr: "Le module de commandes n'est pas encore activé dans la base de données. Exécutez le script SQL dans Supabase.",
            en: "The requests module is not enabled yet in database. Please run the SQL script in Supabase.",
          }),
        );
      } else {
        toast.error(t({ ar: "تعذر إرسال الطلب. حاول مجدداً.", fr: "Échec de l'envoi de la commande. Réessayez.", en: "Failed to submit request. Try again." }));
      }
    }
  };

  return (
    <>
      <AccountRequiredDialog open={needAccount} onClose={() => setNeedAccount(false)} reason="publier" />
      <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
        <DialogContent dir={dir} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="size-6 text-brass" />
              {t({ ar: "تأكيد شراء باقة النقاط", fr: "Acheter un pack de jetons", en: "Buy token pack" })}
            </DialogTitle>
            <DialogDescription>
              {t({ ar: "احصل على رصيد نقاط لترويج إعلاناتك بمرونة.", fr: "Rechargez votre solde de jetons pour booster vos annonces.", en: "Top up your token balance to boost your listings." })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="font-display text-4xl font-semibold text-foreground">
                {num(pack.tokens)} <span className="text-base font-normal text-muted-foreground">{t({ ar: "نقطة", fr: "jetons", en: "tokens" })}</span>
              </p>
              <p className="mt-2 text-2xl font-bold text-rust">{dt(pack.price)}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="token-notes">
                {t({ ar: "ملاحظات أو طريقة الدفع المفضلة (اختياري)", fr: "Remarques ou mode de règlement souhaité (facultatif)", en: "Notes or preferred payment method (optional)" })}
              </Label>
              <Textarea
                id="token-notes"
                rows={2}
                placeholder={t({ ar: "مثال: دفع عند الاستلام أو تحويل بنكي…", fr: "Ex. : Virement bancaire, mandat ou règlement sur place…", en: "e.g. Bank transfer, cash on delivery…" })}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              {t({ ar: "إلغاء", fr: "Annuler", en: "Cancel" })}
            </Button>
            <Button variant="rust" onClick={() => void handleBuy()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Check />}
              {t({ ar: "تأكيد الطلب", fr: "Confirmer la commande", en: "Confirm order" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SubscribePlanDialog({
  plan,
  isRenewal = false,
  open,
  onClose,
  onSuccess,
}: {
  plan: { id: "pro" | "entreprise"; name: Msg; price: number; features?: Msg[] | undefined; isRenewal?: boolean | undefined } | null;
  isRenewal?: boolean | undefined;
  open: boolean;
  onClose: () => void;
  onSuccess?: (() => void) | undefined;
}) {
  const { t, dt, dir } = useI18n();
  const { user } = useAuth();
  const sub = useServerFn(requestSubscription);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [needAccount, setNeedAccount] = useState(false);

  if (!plan) return null;

  const bonusTokens = plan.id === "entreprise" ? 150 : 40;

  const handleSubscribe = async () => {
    if (!user) {
      setNeedAccount(true);
      return;
    }
    setBusy(true);
    const res: RequestOrderResult = await sub({
      data: {
        planId: plan.id,
        isRenewal,
        notes: notes.trim(),
      },
    }).catch(() => ({ ok: false, error: "failed" }) as const);
    setBusy(false);

    if (res.ok) {
      toast.success(
        isRenewal
          ? t({ ar: "تم تسجيل طلب التجديد بنجاح!", fr: "Demande de renouvellement enregistrée !", en: "Renewal request submitted!" })
          : t({ ar: "تم تسجيل طلب الاشتراك بنجاح!", fr: "Demande de souscription enregistrée !", en: "Subscription request submitted!" }),
        {
          description: t({
            ar: "سيتم تفعيل حسابك وإضافة النقاط الشهرية فور مراجعة الإدارة.",
            fr: "Votre compte sera activé et vos jetons crédités dès validation par l'administration.",
            en: "Your account will be updated and tokens credited upon review.",
          }),
        },
      );
      setNotes("");
      onClose();
      onSuccess?.();
    } else {
      if (res.error === "not_ready") {
        toast.error(
          t({
            ar: "خدمة الاشتراكات غير مفعلة بعد في قاعدة البيانات. يرجى تنفيذ ملف SQL في Supabase.",
            fr: "Le module d'abonnements n'est pas encore activé dans la base de données. Exécutez le script SQL dans Supabase.",
            en: "The subscription module is not enabled yet in database. Please run the SQL script in Supabase.",
          }),
        );
      } else {
        toast.error(t({ ar: "تعذر إرسال الطلب. حاول مجدداً.", fr: "Échec de l'envoi de la demande. Réessayez.", en: "Failed to submit request. Try again." }));
      }
    }
  };

  return (
    <>
      <AccountRequiredDialog open={needAccount} onClose={() => setNeedAccount(false)} reason="publier" />
      <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
        <DialogContent dir={dir} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-6 text-olive" />
              {isRenewal
                ? t({ ar: "تجديد الباقة :", fr: "Renouvellement :", en: "Renew plan:" })
                : t({ ar: "اختيار الباقة :", fr: "Souscrire à l'offre :", en: "Subscribe to:" })}{" "}
              {t(plan.name)}
            </DialogTitle>
            <DialogDescription>
              {t({
                ar: "استفد من مميزات الحساب الاحترافي ورصيد نقاط شهري مهداة.",
                fr: "Profitez des fonctionnalités Pro, visibilité accrue et jetons offerts chaque mois.",
                en: "Enjoy pro features, higher visibility and free monthly tokens.",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="font-display text-3xl font-semibold text-foreground">{t(plan.name)}</p>
              <p className="mt-2 text-2xl font-bold text-rust">
                {dt(plan.price)}{" "}
                <span className="text-sm font-normal text-muted-foreground">{t({ ar: "/ الشهر", fr: "/ mois", en: "/ month" })}</span>
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brass/15 px-3 py-1 text-xs font-semibold text-brass-foreground">
                <Coins className="size-3.5" />
                {t({ ar: `يشمل ${bonusTokens} نقطة هدية شهرياً`, fr: `Inclus ${bonusTokens} jetons offerts / mois`, en: `Includes ${bonusTokens} free tokens / month` })}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-notes">
                {t({ ar: "ملاحظات (اختياري)", fr: "Remarques ou coordonnées (facultatif)", en: "Notes or contact info (optional)" })}
              </Label>
              <Textarea
                id="sub-notes"
                rows={2}
                placeholder={t({ ar: "مثال: رغبة في فواتير للشركة أو وسيلة دفع معينة…", fr: "Ex. : Demande de facture société, contact comptabilité…", en: "e.g. Invoice request, corporate billing…" })}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              {t({ ar: "إلغاء", fr: "Annuler", en: "Cancel" })}
            </Button>
            <Button variant="rust" onClick={() => void handleSubscribe()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Check />}
              {isRenewal
                ? t({ ar: "تأكيد طلب التجديد", fr: "Confirmer le renouvellement", en: "Confirm renewal" })
                : t({ ar: "تأكيد طلب الاشتراك", fr: "Confirmer la souscription", en: "Confirm subscription" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

