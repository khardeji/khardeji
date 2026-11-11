import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpCircle, BadgeCheck, Coins, Flame, Home, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/hooks/use-i18n";
import { getMyListings } from "@/lib/listings.functions";
import { applyBoost, BOOST_COSTS, getMyOverview, type BoostResult } from "@/lib/services.functions";
import type { Msg } from "@/lib/i18n";

type BoostType = "remonter" | "urgent" | "premium-7j" | "a-la-une";

interface BoostOption {
  id: BoostType;
  icon: typeof BadgeCheck;
  title: Msg;
  desc: Msg;
  cost: number;
}

const BOOST_OPTIONS: BoostOption[] = [
  {
    id: "remonter",
    icon: ArrowUpCircle,
    title: { ar: "طلّع الإعلان للفوق", fr: "Remonter l'annonce", en: "Bump the listing" },
    desc: { ar: "إعلانك يرجع في أوّل نتائج الصنف متاعو.", fr: "Votre annonce repasse en tête des résultats.", en: "Your listing returns to the top of its category." },
    cost: 2,
  },
  {
    id: "urgent",
    icon: Flame,
    title: { ar: "إعلان مستعجل", fr: "Annonce urgente", en: "Urgent listing" },
    desc: { ar: "علامة «مستعجل» تبان على البطاقة وفي صفحة الإعلان.", fr: "Badge « Urgent » visible sur la carte et la fiche.", en: "An “Urgent” badge visible on cards and pages." },
    cost: 3,
  },
  {
    id: "premium-7j",
    icon: BadgeCheck,
    title: { ar: "إعلان مميّز — 7 أيام", fr: "Annonce Premium — 7 jours", en: "Premium listing — 7 days" },
    desc: { ar: "بلاصة في الأولوية وإطار ذهبي في القوائم.", fr: "Position prioritaire et cadre doré dans les listes.", en: "Priority position and gold border in search." },
    cost: 8,
  },
  {
    id: "a-la-une",
    icon: Home,
    title: { ar: "في الواجهة — الصفحة الرئيسية", fr: "À la une — page d'accueil", en: "Featured — home page" },
    desc: { ar: "يظهر في اختيارات الصفحة الرئيسية لمدّة 3 أيام.", fr: "Affichage dans la sélection de la page d'accueil pendant 3 jours.", en: "Displayed in the homepage featured section for 3 days." },
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
  const { t, num, dir } = useI18n();
  const qc = useQueryClient();
  const fetchMine = useServerFn(getMyListings);
  const fetchOverview = useServerFn(getMyOverview);
  const executeBoost = useServerFn(applyBoost);

  const { data: listings } = useQuery({ queryKey: ["me", "listings"], queryFn: () => fetchMine(), enabled: open });
  const { data: overview } = useQuery({ queryKey: ["me", "overview"], queryFn: () => fetchOverview(), enabled: open });

  const approvedListings = (listings ?? []).filter((l) => l.status === "approved");
  const [selectedListingId, setSelectedListingId] = useState<string>(initialListingId || (approvedListings[0]?.id ?? ""));
  const [selectedBoost, setSelectedBoost] = useState<BoostType>("remonter");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialListingId) {
      setSelectedListingId(initialListingId);
    } else if (approvedListings[0]?.id && !selectedListingId) {
      setSelectedListingId(approvedListings[0].id);
    }
  }, [initialListingId, open, approvedListings]);

  const currentTokens = overview?.tokensBalance ?? 0;
  const cost = BOOST_COSTS[selectedBoost] ?? 2;
  const hasEnough = currentTokens >= cost;

  const handleApply = async () => {
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
      data: { listingId: targetId, boostId: selectedBoost },
    }).catch(() => ({ ok: false, error: "failed" }) as const);
    setBusy(false);

    if (res.ok) {
      toast.success(t({ ar: "تم تفعيل الترويج بنجاح!", fr: "Boost appliqué avec succès !", en: "Boost applied successfully!" }), {
        description: t({
          ar: `تم خصم ${cost} نقطة. رصيدك المتبقي: ${res.newBalance} نقطة.`,
          fr: `${cost} jetons déduits. Nouveau solde : ${res.newBalance} jetons.`,
          en: `${cost} tokens deducted. Remaining balance: ${res.newBalance} tokens.`,
        }),
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["me", "listings"] }),
        qc.invalidateQueries({ queryKey: ["me", "overview"] }),
        qc.invalidateQueries({ queryKey: ["me", "boosts"] }),
        qc.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
      onClose();
    } else if (res.error === "insufficient_tokens") {
      toast.error(t({ ar: "رصيدك غير كافٍ.", fr: "Solde de jetons insuffisant.", en: "Insufficient tokens." }));
    } else {
      toast.error(t({ ar: "فشل تفعيل الترويج.", fr: "Échec du boost.", en: "Failed to apply boost." }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent dir={dir} className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="size-6 text-rust" />
            {t({ ar: "ترويج إعلان (Boost)", fr: "Booster une annonce", en: "Boost a listing" })}
          </DialogTitle>
          <DialogDescription>
            {t({
              ar: "ارفع من ظهور إعلاناتك لجلب المزيد من المشترين والبيع بسرعة.",
              fr: "Augmentez la visibilité de votre annonce pour vendre plus vite.",
              en: "Increase your listing visibility to sell faster.",
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
              <Label>{t({ ar: "اختار الإعلان المراد ترويجه", fr: "Choisir l'annonce à booster", en: "Choose listing to boost" })}</Label>
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

          {/* Boost Options */}
          <div className="space-y-2">
            <Label>{t({ ar: "اختار نوع الترويج", fr: "Choisir le type de boost", en: "Choose boost type" })}</Label>
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
                        <span className="font-semibold text-foreground">{t(opt.title)}</span>
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
            onClick={() => void handleApply()}
            disabled={busy || !hasEnough || approvedListings.length === 0}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Rocket />}
            {t({ ar: `تطبيق (${cost} نقطة)`, fr: `Appliquer (${cost} jetons)`, en: `Apply (${cost} tokens)` })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

