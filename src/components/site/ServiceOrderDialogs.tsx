import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Coins, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { pricingQuery } from "@/lib/catalog-queries";
import type { Msg } from "@/lib/i18n";
import { buyTokenPack, requestSubscription, type RequestOrderResult } from "@/lib/services.functions";
import { cn } from "@/lib/utils";
import { AccountRequiredDialog } from "./ActionDialogs";

export interface TokenPackItem {
  id: string;
  tokens: number;
  price: number;
  tag?: Msg | null | undefined;
}

const FALLBACK_PACKS: TokenPackItem[] = [
  { id: "336cb805-3e53-4766-891c-9b3461f73282", tokens: 10, price: 10, tag: null },
  { id: "1ef534c4-e149-4548-98e5-608659746944", tokens: 30, price: 25, tag: { ar: "الأكثر طلباً", fr: "Populaire", en: "Popular" } },
  { id: "b96afa83-26be-453a-bead-335237bf3f48", tokens: 80, price: 60, tag: null },
  { id: "8b39be68-eed1-47a7-b15d-892f84279281", tokens: 200, price: 130, tag: { ar: "أحسن سوم", fr: "Meilleur prix", en: "Best value" } },
];

export function BuyTokensDialog({
  pack,
  open,
  onClose,
  onSuccess,
}: {
  pack?: TokenPackItem | null | undefined;
  open: boolean;
  onClose: () => void;
  onSuccess?: (() => void) | undefined;
}) {
  const { t, dt, num, dir } = useI18n();
  const { user } = useAuth();
  const buy = useServerFn(buyTokenPack);
  const { data: pricing } = useQuery(pricingQuery);
  const packs: TokenPackItem[] = (pricing?.packs && pricing.packs.length > 0) ? pricing.packs : FALLBACK_PACKS;

  const [selectedPackId, setSelectedPackId] = useState<string>(() => pack?.id || packs[1]?.id || packs[0]?.id);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [needAccount, setNeedAccount] = useState(false);

  useEffect(() => {
    if (pack?.id) {
      setSelectedPackId(pack.id);
    } else if (pack?.tokens) {
      const match = packs.find((p) => p.tokens === pack.tokens);
      if (match) setSelectedPackId(match.id);
    }
  }, [pack?.id, pack?.tokens, packs]);

  const activePack = packs.find((p) => p.id === selectedPackId || p.tokens === pack?.tokens) || packs[1] || packs[0];

  const handleBuy = async () => {
    if (!user) {
      setNeedAccount(true);
      return;
    }
    setBusy(true);
    const res: RequestOrderResult = await buy({
      data: {
        packId: activePack.id,
        tokensCount: activePack.tokens,
        amount: activePack.price,
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
        <DialogContent dir={dir} className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="size-6 text-brass" />
              {t({ ar: "شراء باقة نقاط", fr: "Acheter un pack de jetons", en: "Buy token pack" })}
            </DialogTitle>
            <DialogDescription>
              {t({ ar: "اختر الباقة التي تناسبك لشحن رصيد نقاطك وترويج إعلاناتك.", fr: "Choisissez l'offre qui vous convient pour recharger vos jetons.", en: "Choose the pack that fits your needs to top up your token balance." })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Pack selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t({ ar: "الباقات المتوفرة", fr: "Packs disponibles", en: "Available packs" })}
              </Label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {packs.map((p) => {
                  const isSelected = p.id === activePack.id || p.tokens === activePack.tokens;
                  const unitPrice = Math.round((p.price / p.tokens) * 100) / 100;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPackId(p.id)}
                      className={cn(
                        "relative flex flex-col items-center justify-between rounded-xl border p-3 text-center transition-all cursor-pointer",
                        isSelected
                          ? "border-rust bg-rust/5 ring-2 ring-rust/30 shadow-sm"
                          : "border-border bg-card hover:border-rust/40 hover:bg-muted/50"
                      )}
                    >
                      {p.tag && (
                        <span className="mb-1 rounded bg-brass/20 px-1.5 py-0.5 text-[0.6rem] font-medium text-brass-foreground">
                          {t(p.tag)}
                        </span>
                      )}
                      <p className="font-display text-2xl font-bold text-foreground">
                        {num(p.tokens)}
                      </p>
                      <p className="text-xs text-muted-foreground">{t({ ar: "نقطة", fr: "jetons", en: "tokens" })}</p>
                      <p className="mt-2 text-base font-bold text-rust">{dt(p.price)}</p>
                      <p className="text-[0.65rem] text-muted-foreground/80">
                        {dt(unitPrice)}/{t({ ar: "نقطة", fr: "j.", en: "t." })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected pack summary */}
            <div className="rounded-xl border border-rust/20 bg-rust/5 p-3.5 text-center">
              <div className="flex items-center justify-center gap-2">
                <Coins className="size-5 text-brass" />
                <p className="font-display text-xl font-bold text-foreground">
                  {num(activePack.tokens)} {t({ ar: "نقطة", fr: "jetons", en: "tokens" })} = <span className="text-rust">{dt(activePack.price)}</span>
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t({
                  ar: "النقاط صالحة للاستعمال في كل خدمات الظرويج بدون تاريخ انتهاء.",
                  fr: "Valable pour tous les boosts de visibilité sans limite de validité.",
                  en: "Valid for all listing boosts with no expiration date.",
                })}
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="token-notes">
                {t({ ar: "ملاحظات أو طريقة الدفع المفضلة (اختياري)", fr: "Remarques ou mode de règlement souhaité (facultatif)", en: "Notes or preferred payment method (optional)" })}
              </Label>
              <Textarea
                id="token-notes"
                rows={2}
                placeholder={t({ ar: "مثال: تحويل بنكي، فيرمون، دفع نقدي…", fr: "Ex. : Virement bancaire, mandat ou règlement sur place…", en: "e.g. Bank transfer, cash on delivery…" })}
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

