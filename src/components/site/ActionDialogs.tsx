import { useLocation, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, LogIn, Phone, UserPlus } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import type { Msg } from "@/lib/i18n";

export interface SummaryRow {
  label: Msg;
  value: string;
  strong?: boolean;
}

type Step = "closed" | "account" | "confirm" | "done";

/**
 * Buying actions go through: account check → confirmation → next step.
 * Signed-out visitors get a sign-in prompt instead of the action.
 */
export function useBuyFlow() {
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>("closed");
  return {
    step,
    setStep,
    start: () => {
      if (loading) return;
      setStep(user ? "confirm" : "account");
    },
    close: () => setStep("closed"),
  };
}

export type AccountReason = "acheter" | "favori" | "signaler" | "contacter" | "publier";

const ACCOUNT_REASON: Record<AccountReason, Msg> = {
  acheter: {
    ar: "باش تطلب ولا تقدّم عرض ولا تزايد، لازم تدخل للحساب متاعك. التسجيل بلاش.",
    fr: "Pour commander, faire une offre ou enchérir, connectez-vous à votre compte. L'inscription est gratuite.",
    en: "To order, make an offer or bid, sign in to your account. Signing up is free.",
  },
  favori: {
    ar: "باش تحفظ الإعلانات في المفضلة متاعك، لازم تدخل للحساب متاعك. التسجيل بلاش.",
    fr: "Pour enregistrer des annonces dans vos favoris, connectez-vous à votre compte. L'inscription est gratuite.",
    en: "To save listings to your favourites, sign in to your account. Signing up is free.",
  },
  signaler: {
    ar: "باش تبلّغ على إعلان، لازم تدخل للحساب متاعك. هكا فريقنا ينجم يتبّع التبليغ.",
    fr: "Pour signaler une annonce, connectez-vous à votre compte. Cela permet à notre équipe de suivre le signalement.",
    en: "To report a listing, sign in to your account. This lets our team follow up on the report.",
  },
  contacter: {
    ar: "باش تراسل البائع، لازم تدخل للحساب متاعك. التسجيل بلاش.",
    fr: "Pour contacter le vendeur, connectez-vous à votre compte. L'inscription est gratuite.",
    en: "To contact the seller, sign in to your account. Signing up is free.",
  },
  publier: {
    ar: "باش تنشر ولا تشري نقاط، لازم تدخل للحساب متاعك. التسجيل بلاش.",
    fr: "Pour publier ou souscrire à une offre, connectez-vous à votre compte. L'inscription est gratuite.",
    en: "To post or subscribe, sign in to your account. Signing up is free.",
  },
};

export function AccountRequiredDialog({ open, onClose, reason = "acheter" }: { open: boolean; onClose: () => void; reason?: AccountReason }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const href = useLocation({ select: (l) => l.href });
  const go = (mode: "connexion" | "inscription") => {
    onClose();
    void navigate({ to: "/connexion", search: { redirect: href, raison: reason, mode } });
  };
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t({ ar: "لازمك حساب", fr: "Compte nécessaire", en: "Account needed" })}</AlertDialogTitle>
          <AlertDialogDescription>{t(ACCOUNT_REASON[reason])}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel>{t({ ar: "رجوع", fr: "Retour", en: "Back" })}</AlertDialogCancel>
          <Button variant="outline" onClick={() => go("inscription")}>
            <UserPlus /> {t({ ar: "اعمل حساب", fr: "Créer un compte", en: "Create account" })}
          </Button>
          <Button variant="rust" onClick={() => go("connexion")}>
            <LogIn /> {t({ ar: "ادخل", fr: "Se connecter", en: "Sign in" })}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ConfirmActionDialog({
  open,
  onClose,
  title,
  description,
  rows,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: Msg;
  description: Msg;
  rows: SummaryRow[];
  confirmLabel: Msg;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(title)}</AlertDialogTitle>
          <AlertDialogDescription>{t(description)}</AlertDialogDescription>
        </AlertDialogHeader>
        <dl className="space-y-2 rounded-lg bg-muted/70 p-4 text-sm">
          {rows.map((r) => (
            <div key={r.label.en} className={`flex justify-between gap-4 ${r.strong ? "border-t border-border pt-2" : ""}`}>
              <dt className={r.strong ? "font-semibold" : "text-muted-foreground"}>{t(r.label)}</dt>
              <dd className={r.strong ? "font-display text-xl font-semibold text-rust" : "text-end font-medium"}>{r.value}</dd>
            </div>
          ))}
        </dl>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel>{t({ ar: "إلغاء", fr: "Annuler", en: "Cancel" })}</AlertDialogCancel>
          <Button variant="rust" onClick={onConfirm}>
            <CheckCircle2 /> {t(confirmLabel)}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** After confirming: the deal is finalised directly with the seller. */
export function ContactSellerDialog({
  open,
  onClose,
  title,
  phone,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: Msg;
  phone: string;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-olive" /> {t(title)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {phone
              ? t({
                  ar: "باش تكمّل الشراء، اتصل بالبائع وتفاهم معاه على الخلاص والتسليم.",
                  fr: "Pour finaliser, appelez le vendeur et convenez du paiement et de la livraison.",
                  en: "To finish, call the seller and agree on payment and delivery.",
                })
              : t({
                  ar: "البائع ما حطّش رقم تليفون. تنجم تراسلو كيف تتحلّ المراسلة.",
                  fr: "Le vendeur n'a pas indiqué de numéro. Vous pourrez lui écrire dès que la messagerie sera disponible.",
                  en: "The seller left no phone number. You'll be able to message them once messaging is available.",
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel>{t({ ar: "سكّر", fr: "Fermer", en: "Close" })}</AlertDialogCancel>
          {phone && (
            <Button variant="rust" asChild>
              <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} dir="ltr">
                <Phone /> {phone}
              </a>
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
