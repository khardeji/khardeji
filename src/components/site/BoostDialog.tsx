import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowUpCircle,
  BadgeCheck,
  Clock,
  Coins,
  Flame,
  Home,
  Loader2,
  RefreshCw,
  Rocket,
  ShieldAlert,
  Trash2,
} from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BOOST_DURATIONS,
  BOOST_NAMES,
  getBoostTimeRemaining,
  isBoostActive,
  type BoostType,
  type Listing,
} from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { getMyListings } from "@/lib/listings.functions";
import { applyBoost, BOOST_COSTS, getMyOverview, removeBoost, type BoostResult } from "@/lib/services.functions";
import type { Msg } from "@/lib/i18n";

interface BoostOption {
  id: BoostType;
  icon: typeof BadgeCheck;
  title: Msg;
  desc: Msg;
  durationLabel: Msg;
  cost: number;
}

const BOOST_OPTIONS: BoostOption[] = [
  {
    id: "remonter",
    icon: ArrowUpCircle,
    title: { ar: "طلّع الإعلان للفوق", fr: "Remonter l'annonce", en: "Bump the listing" },
    desc: { ar: "إعلانك يرجع في أوّل نتائج الصنف متاعو.", fr: "Votre annonce repasse en tête des résultats.", en: "Your listing returns to the top of its category." },
    durationLabel: { ar: "24 ساعة", fr: "24 heures", en: "24 hours" },
    cost: 2,
  },
  {
    id: "urgent",
    icon: Flame,
    title: { ar: "إعلان مستعجل", fr: "Annonce urgente", en: "Urgent listing" },
    desc: { ar: "علامة «مستعجل» تبان على البطاقة وفي صفحة الإعلان.", fr: "Badge « Urgent » visible sur la carte et la fiche.", en: "An “Urgent” badge visible on cards and pages." },
    durationLabel: { ar: "7 أيام", fr: "7 jours", en: "7 days" },
    cost: 3,
  },
  {
    id: "premium-7j",
    icon: BadgeCheck,
    title: { ar: "إعلان مميّز — 7 أيام", fr: "Annonce Premium — 7 jours", en: "Premium listing — 7 days" },
    desc: { ar: "بلاصة في الأولوية وإطار ذهبي في القوائم.", fr: "Position prioritaire et cadre doré dans les listes.", en: "Priority position and gold border in search." },
    durationLabel: { ar: "7 أيام", fr: "7 jours", en: "7 days" },
    cost: 8,
  },
  {
    id: "a-la-une",
    icon: Home,
    title: { ar: "في الواجهة — الصفحة الرئيسية", fr: "À la une — page d'accueil", en: "Featured — home page" },
    desc: { ar: "يظهر في اختيارات الصفحة الرئيسية لمدّة 3 أيام.", fr: "Affichage dans la sélection de la page d'accueil pendant 3 jours.", en: "Displayed in the homepage featured section for 3 days." },
    durationLabel: { ar: "3 أيام", fr: "3 jours", en: "3 days" },
    cost: 15,
  },
];

export function BoostDialog({
  initialListingId,
  open,
  onClose,
  onRecharge,
}: {
  initialListingId?: string | undefined;
  open: boolean;
  onClose: () => void;
  onRecharge?: (() => void) | undefined;
}) {
  const { t, num, date, dir } = useI18n();
  const qc = useQueryClient();
  const fetchMine = useServerFn(getMyListings);
  const fetchOverview = useServerFn(getMyOverview);
  const executeBoost = useServerFn(applyBoost);
  const executeRemoveBoost = useServerFn(removeBoost);

  const { data: listings } = useQuery({ queryKey: ["me", "listings"], queryFn: () => fetchMine(), enabled: open });
  const { data: overview } = useQuery({ queryKey: ["me", "overview"], queryFn: () => fetchOverview(), enabled: open });

  const approvedListings = (listings ?? []).filter((l) => l.status === "approved");
  const [selectedListingId, setSelectedListingId] = useState<string>(initialListingId || (approvedListings[0]?.id ?? ""));
  const [selectedBoost, setSelectedBoost] = useState<BoostType>("remonter");
  const [busy, setBusy] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  useEffect(() => {
    if (initialListingId) {
      setSelectedListingId(initialListingId);
    } else if (approvedListings[0]?.id && !selectedListingId) {
      setSelectedListingId(approvedListings[0].id);
    }
  }, [initialListingId, open, approvedListings]);

  const selectedListing = approvedListings.find((l) => l.id === selectedListingId);
  const activeBoost = selectedListing?.activeBoost && isBoostActive(selectedListing.activeBoost) ? selectedListing.activeBoost : null;
  const timeRemaining = activeBoost ? getBoostTimeRemaining(activeBoost.expiresAt) : null;

  const currentTokens = overview?.tokensBalance ?? 0;
  const cost = BOOST_COSTS[selectedBoost] ?? 2;
  const hasEnough = currentTokens >= cost;

  const handleApply = async (isReplace = false) => {
    const targetId = selectedListingId || initialListingId || approvedListings[0]?.id;
    if (!targetId) {
      toast.error(t({ ar: "اختار إعلان.", fr: "Veuillez sélectionner une annonce.", en: "Please select a listing." }));
      return;
    }
    if (!hasEnough) {
      toast.error(t({
        ar: "رصيدك غير كافٍ. اشري نقاط للمتابعة.",
        fr: "Solde de jetons insuffisant. Achetez des jetons pour continuer.",
        en: "Insufficient tokens. Buy tokens to proceed.",
      }));
      return;
    }

    setBusy(true);
    const res: BoostResult = await executeBoost({
      data: { listingId: targetId, boostId: selectedBoost, replace: isReplace },
    }).catch(() => ({ ok: false, error: "failed" }) as const);
    setBusy(false);

    if (res.ok) {
      toast.success(
        isReplace
          ? t({ ar: "تم استبدال الترويج بنجاح!", fr: "Boost remplacé avec succès !", en: "Boost replaced successfully!" })
          : t({ ar: "تم تفعيل الترويج بنجاح!", fr: "Boost appliqué avec succès !", en: "Boost applied successfully!" }),
        {
          description: t({
            ar: `تم خصم ${cost} نقطة. رصيدك المتبقي: ${res.newBalance} نقطة.`,
            fr: `${cost} jetons déduits. Nouveau solde : ${res.newBalance} jetons.`,
            en: `${cost} tokens deducted. Remaining balance: ${res.newBalance} tokens.`,
          }),
        }
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["me", "listings"] }),
        qc.invalidateQueries({ queryKey: ["me", "overview"] }),
        qc.invalidateQueries({ queryKey: ["me", "boosts"] }),
        qc.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
      onClose();
    } else if (res.error === "already_boosted") {
      toast.warning(t({
        ar: "هذا الإعلان يحتوي على ترويج مفعّل حالياً. قم بإزالته أو اختيار استبداله.",
        fr: "Cette annonce a déjà un boost actif. Retirez-le ou confirmez le remplacement pour re-booster.",
        en: "This listing already has an active boost. Remove it or replace it to reboost.",
      }));
    } else if (res.error === "insufficient_tokens") {
      toast.error(t({ ar: "رصيدك غير كافٍ.", fr: "Solde de jetons insuffisant.", en: "Insufficient tokens." }));
    } else {
      toast.error(t({ ar: "فشل تفعيل الترويج.", fr: "Échec du boost.", en: "Failed to apply boost." }));
    }
  };

  const handleRemoveActiveBoost = async () => {
    if (!selectedListingId) return;
    setBusy(true);
    try {
      const res = await executeRemoveBoost({ data: { listingId: selectedListingId } });
      if (res.ok) {
        toast.success(t({
          ar: "تمت إزالة الترويج بنجاح! لم يتم استرجاع النقاط.",
          fr: "Le boost a été retiré avec succès (aucun remboursement de jetons).",
          en: "Boost removed successfully (no token refund).",
        }));
        setConfirmRemoveOpen(false);
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["me", "listings"] }),
          qc.invalidateQueries({ queryKey: ["me", "overview"] }),
          qc.invalidateQueries({ queryKey: ["me", "boosts"] }),
          qc.invalidateQueries({ queryKey: ["catalog"] }),
        ]);
      } else {
        toast.error(res.message || t({ ar: "فشلت العملية", fr: "Échec de l'opération", en: "Operation failed" }));
      }
    } catch {
      toast.error(t({ ar: "فشلت العملية", fr: "Échec de l'opération", en: "Operation failed" }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
        <DialogContent dir={dir} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="size-6 text-rust" />
              {t({ ar: "إدارة وترويج الإعلان (Boost)", fr: "Booster & Gérer la visibilité", en: "Listing Boost & Visibility" })}
            </DialogTitle>
            <DialogDescription>
              {t({
                ar: "يمكن تطبيق ترويج واحد في كل مرة لكل إعلان. يمكنك متابعة المدة المتبقية، إزالة الترويج أو إعادة الترويج.",
                fr: "Un seul boost est applicable par annonce à la fois. Suivez la durée restante, retirez le boost ou remplacez-le.",
                en: "Only one boost is active per listing at a time. Track days left, remove, or reboost.",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Token Balance indicator */}
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Coins className="size-4 text-brass" />
                {t({ ar: "رصيدك الحالي:", fr: "Votre solde de jetons :", en: "Your token balance:" })}
              </span>
              <span className="font-display text-lg font-bold text-rust">
                {num(currentTokens)} <span className="text-xs font-normal text-muted-foreground">{t({ ar: "نقطة", fr: "jetons", en: "tokens" })}</span>
              </span>
            </div>

            {/* Select listing if multiple */}
            {!initialListingId && (
              <div className="space-y-1.5">
                <Label>{t({ ar: "اختار الإعلان", fr: "Sélectionner une annonce", en: "Choose listing" })}</Label>
                {approvedListings.length === 0 ? (
                  <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {t({
                      ar: "ليس لديك إعلانات مقبولة في الوقت الحالي لترويجها.",
                      fr: "Vous n'avez pas d'annonce en ligne pour le moment.",
                      en: "You have no live listings to boost right now.",
                    })}
                  </p>
                ) : (
                  <Select value={selectedListingId || approvedListings[0]?.id || ""} onValueChange={setSelectedListingId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t({ ar: "اختار إعلان…", fr: "Sélectionner une annonce…", en: "Select a listing…" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {approvedListings.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {t(l.title)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* ── ACTIVE BOOST BANNER IF CURRENTLY BOOSTED ── */}
            {activeBoost && timeRemaining && (
              <div className="rounded-xl border border-rust/30 bg-gradient-to-br from-rust/10 via-brass/10 to-transparent p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t({ ar: "الترويج المفعّل حالياً", fr: "Boost actuellement actif", en: "Active Boost Status" })}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-rust text-white text-xs px-2.5 py-1 font-semibold gap-1.5 shadow-sm">
                        {activeBoost.boostId === "urgent" ? (
                          <Flame className="size-3.5 fill-white" />
                        ) : activeBoost.boostId === "remonter" ? (
                          <Rocket className="size-3.5" />
                        ) : (
                          <BadgeCheck className="size-3.5 fill-white text-brass" />
                        )}
                        {t(BOOST_NAMES[activeBoost.boostId])}
                      </Badge>
                      <span className="font-semibold text-sm text-foreground flex items-center gap-1">
                        <Clock className="size-4 text-rust" />
                        {t(timeRemaining.label)}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs shrink-0 gap-1"
                    onClick={() => setConfirmRemoveOpen(true)}
                  >
                    <Trash2 className="size-3.5" />
                    {t({ ar: "إزالة الترويج", fr: "Retirer le boost", en: "Remove boost" })}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t border-border/60 pt-2">
                  <div>
                    <span>{t({ ar: "تاريخ التفعيل:", fr: "Activé le :", en: "Started:" })}</span>{" "}
                    <span className="font-medium text-foreground">{date(activeBoost.appliedAt)}</span>
                  </div>
                  <div>
                    <span>{t({ ar: "ينتهي في:", fr: "Expire le :", en: "Expires:" })}</span>{" "}
                    <span className="font-medium text-foreground">{date(activeBoost.expiresAt)}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground bg-background/60 p-2 rounded border border-border/50">
                  <ShieldAlert className="inline size-3.5 text-brass me-1 shrink-0" />
                  {t({
                    ar: "قاعدة الموقع: ترويج واحد فقط مفعّل لكل إعلان. يمكنك إزالة الترويج الحالي (دون استرجاع النقاط) أو اختيار ترويج آخر أدناه لاستبداله مباشرة.",
                    fr: "Règle : un seul boost actif par annonce. Vous pouvez retirer le boost actuel (sans remboursement des jetons) ou choisir un nouveau boost ci-dessous pour le remplacer directement.",
                    en: "Policy: only one boost per post. You can remove it (no tokens refunded) or choose another boost below to replace it.",
                  })}
                </p>
              </div>
            )}

            {/* Boost Options */}
            <div className="space-y-2">
              <Label>
                {activeBoost
                  ? t({ ar: "أو استبدل بترويج جديد (إعادة الترويج)", fr: "Ou remplacer par un autre boost (re-booster)", en: "Or replace with a new boost (reboost)" })
                  : t({ ar: "اختار نوع الترويج", fr: "Choisir le type de boost", en: "Choose boost type" })}
              </Label>
              <RadioGroup value={selectedBoost} onValueChange={(v) => setSelectedBoost(v as BoostType)} className="gap-2.5">
                {BOOST_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <Label
                      key={opt.id}
                      htmlFor={`boost-${opt.id}`}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 font-normal transition has-[[data-state=checked]]:border-rust has-[[data-state=checked]]:bg-rust/5"
                    >
                      <RadioGroupItem id={`boost-${opt.id}`} value={opt.id} className="mt-1" />
                      <Icon className="mt-0.5 size-5 shrink-0 text-rust" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            {t(opt.title)}
                            <span className="text-[0.65rem] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {t(opt.durationLabel)}
                            </span>
                          </span>
                          <span className="rounded-full bg-brass/20 px-2.5 py-0.5 text-xs font-bold text-brass-foreground">
                            {opt.cost} {t({ ar: "نقطة", fr: "jetons", en: "tokens" })}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t(opt.desc)}</p>
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>

            {!hasEnough && (
              <div className="flex items-center justify-between rounded-lg border border-rust/40 bg-rust/10 p-3 text-sm">
                <span className="text-rust">
                  {t({
                    ar: `يلزمك ${cost - currentTokens} نقطة إضافية.`,
                    fr: `Il vous manque ${cost - currentTokens} jetons.`,
                    en: `You need ${cost - currentTokens} more tokens.`,
                  })}
                </span>
                {onRecharge && (
                  <Button size="sm" variant="rust" onClick={onRecharge}>
                    <Coins className="size-3.5" />
                    {t({ ar: "شراء نقاط", fr: "Acheter des jetons", en: "Buy tokens" })}
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              {t({ ar: "إلغاء", fr: "Annuler", en: "Cancel" })}
            </Button>
            <Button
              variant="rust"
              onClick={() => void handleApply(!!activeBoost)}
              disabled={busy || !hasEnough || approvedListings.length === 0}
            >
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : activeBoost ? (
                <RefreshCw className="size-4 me-1" />
              ) : (
                <Rocket className="size-4 me-1" />
              )}
              {activeBoost
                ? t({ ar: `استبدال الترويج (${cost} نقطة)`, fr: `Remplacer le boost (${cost} jetons)`, en: `Replace boost (${cost} tokens)` })
                : t({ ar: `تطبيق (${cost} نقطة)`, fr: `Appliquer (${cost} jetons)`, en: `Apply (${cost} tokens)` })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CONFIRMATION MODAL TO REMOVE BOOST (NO REFUND) ── */}
      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              {t({ ar: "هل أنت متأكد من إزالة الترويج؟", fr: "Confirmer le retrait du boost ?", en: "Confirm boost removal?" })}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <p>
                {t({
                  ar: "سيتم إيقاف ميزات الترويج فوراً وإرجاع الإعلان إلى حالته العادية.",
                  fr: "Les avantages du boost seront désactivés immédiatement et l'annonce retrouvera sa visibilité normale.",
                  en: "The boost features will be deactivated immediately and the listing will return to standard visibility.",
                })}
              </p>
              <p className="font-semibold text-destructive">
                {t({
                  ar: "تنبيه مهم: عند إزالة الترويج لا يتم استرجاع النقاط المستعملة إلى رصيدك.",
                  fr: "Attention importante : aucun jeton ne sera remboursé lors du retrait.",
                  en: "Important notice: used tokens will not be refunded upon removal.",
                })}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {t({ ar: "تراجع", fr: "Annuler", en: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleRemoveActiveBoost();
              }}
              disabled={busy}
            >
              {busy ? <Loader2 className="animate-spin size-4" /> : <Trash2 className="size-4 me-1" />}
              {t({ ar: "تأكيد الإزالة (دون استرجاع)", fr: "Confirmer le retrait (sans remboursement)", en: "Confirm removal (no refund)" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
