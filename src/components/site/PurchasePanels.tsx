import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Eye,
  Gavel,
  HandCoins,
  Minus,
  Package,
  Phone,
  Plus,
  ShieldAlert,
  ShoppingCart,
  Trophy,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Countdown } from "./Countdown";
import { AccountRequiredDialog, ConfirmActionDialog, ContactSellerDialog, useBuyFlow } from "./ActionDialogs";
import type { Listing } from "@/data/catalog";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { minimumNextBid, participantCount, validateBid, type AuctionState } from "@/lib/auction";
import { auctionEndsAt } from "@/lib/demo-clock";
import { getNegotiationRule, validateNegotiationOffer } from "@/lib/negotiation";
import { clampQuantity, quantityTotal, UNIT_LABEL } from "@/lib/quantity";
import {
  getListingBidders,
  placeAuctionBid,
  submitNegotiationOffer,
  submitQuantityRequest,
} from "@/lib/marketplace.functions";

const field =
  "h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-rust focus:ring-2 focus:ring-rust/25";

function OwnerWarningBanner() {
  const { t } = useI18n();
  return (
    <div className="flex items-start gap-3 rounded-lg border border-brass/40 bg-brass/10 p-4 text-sm text-foreground">
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-brass" />
      <div>
        <p className="font-semibold text-foreground">
          {t({ ar: "أنت صاحب هذا الإعلان", fr: "Vous êtes le vendeur de cette annonce", en: "You are the owner of this listing" })}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t({
            ar: "لا يمكنك تقديم عروض أو مزايدات أو شراء إعلانك الخاص.",
            fr: "Vous ne pouvez pas enchérir, faire d'offre ou acheter votre propre article.",
            en: "You cannot bid, submit offers, or purchase your own listing.",
          })}
        </p>
      </div>
    </div>
  );
}

function QuantityStepper({
  listing,
  value,
  onChange,
  disabled,
}: {
  listing: Listing;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const { t, num } = useI18n();
  const { step } = UNIT_LABEL[listing.unit];
  const short = t(UNIT_LABEL[listing.unit].short);
  return (
    <div>
      <label htmlFor="qty" className="label-stamp text-xs text-muted-foreground">
        {t({ ar: "الكمية المطلوبة", fr: "Quantité souhaitée", en: "Quantity wanted" })}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label={t({ ar: "نقّص", fr: "Diminuer", en: "Decrease" })}
          onClick={() => onChange(clampQuantity(value - step, listing.stock, step))}
          disabled={disabled || value <= step}
        >
          <Minus />
        </Button>
        <div className="relative flex-1">
          <input
            id="qty"
            type="number"
            inputMode="decimal"
            min={step}
            max={listing.stock}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(clampQuantity(Number(e.target.value), listing.stock, step))}
            className={`${field} pe-14 text-center font-display text-lg font-semibold disabled:opacity-50`}
          />
          <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {short}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label={t({ ar: "زيد", fr: "Augmenter", en: "Increase" })}
          onClick={() => onChange(clampQuantity(value + step, listing.stock, step))}
          disabled={disabled || value >= listing.stock}
        >
          <Plus />
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {t({ ar: "المخزون المتوفر:", fr: "Stock disponible :", en: "Available stock:" })} {num(listing.stock)} {short}
      </p>
    </div>
  );
}

// --------------------------------------------------------------------------
// 1. FIXED PRICE & QUANTITY REQUEST
// --------------------------------------------------------------------------
export function FixedPricePanel({ listing }: { listing: Listing }) {
  const { t, dt, num } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isOwner = !!user && !!listing.ownerId && user.id === listing.ownerId;

  const { step } = UNIT_LABEL[listing.unit];
  const short = t(UNIT_LABEL[listing.unit].short);
  const [qty, setQty] = useState(() => clampQuantity(listing.unit === "kg" ? 25 : 1, listing.stock, step));
  const [delivery, setDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const total = quantityTotal(listing.price, qty);
  const flow = useBuyFlow();
  const sendQtyRequest = useServerFn(submitQuantityRequest);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const res = await sendQtyRequest({
        data: {
          listingId: listing.id,
          quantity: qty,
          deliveryLocation: delivery,
          notes,
        },
      });

      if (res.ok) {
        toast.success(t({ ar: "تم إرسال طلب الكمية للبائع!", fr: "Demande de quantité envoyée au vendeur !", en: "Quantity request sent to seller!" }));
        await qc.invalidateQueries({ queryKey: ["me", "qty_requests"] });
        flow.setStep("done");
      } else {
        toast.error(res.message || t({ ar: "فشلت العملية", fr: "Une erreur est survenue", en: "Request failed" }));
      }
    } catch {
      toast.error(t({ ar: "فشلت العملية", fr: "Une erreur est survenue", en: "Request failed" }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {isOwner && <OwnerWarningBanner />}

      {listing.stock > 1 && <QuantityStepper listing={listing} value={qty} onChange={setQty} disabled={isOwner} />}

      <dl className="space-y-2 rounded-lg bg-muted/70 p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t({ ar: "سعر الوحدة", fr: "Prix unitaire", en: "Unit price" })}</dt>
          <dd className="font-medium">{dt(listing.price)} / {short}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t({ ar: "الكمية", fr: "Quantité", en: "Quantity" })}</dt>
          <dd className="font-medium">{num(qty)} {short}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-border pt-2">
          <dt className="font-semibold">{t({ ar: "المجموع التقريبي", fr: "Total estimé", en: "Estimated total" })}</dt>
          <dd className="font-display text-2xl font-semibold text-rust">{dt(total)}</dd>
        </div>
      </dl>

      <div>
        <label htmlFor="delivery-loc" className="label-stamp text-xs text-muted-foreground">
          {t({ ar: "مكان التسليم (اختياري)", fr: "Lieu de livraison (optionnel)", en: "Delivery location (optional)" })}
        </label>
        <input
          id="delivery-loc"
          type="text"
          placeholder={t({ ar: "مثال: تونس، صفاقس، سوسة...", fr: "ex: Tunis, Sfax, Sousse...", en: "e.g. Tunis, Sfax, Sousse..." })}
          className={`${field} mt-1.5`}
          value={delivery}
          onChange={(e) => setDelivery(e.target.value)}
          disabled={isOwner}
        />
      </div>

      <Button
        variant="rust"
        size="lg"
        className="w-full"
        onClick={flow.start}
        disabled={isOwner || listing.stock <= 0}
      >
        <ShoppingCart /> {t({ ar: "اطلب هذه الكمية", fr: "Demander cette quantité", en: "Request this quantity" })}
      </Button>

      <AccountRequiredDialog open={flow.step === "account"} onClose={flow.close} />
      <ConfirmActionDialog
        open={flow.step === "confirm"}
        onClose={flow.close}
        title={{ ar: "تأكيد طلب الكمية؟", fr: "Confirmer la demande de quantité ?", en: "Confirm quantity request?" }}
        description={{ ar: "سيتم إرسال طلب رسمي للبائع بمواصفات الكمية.", fr: "Une demande officielle sera envoyée au vendeur avec ces détails.", en: "An official request will be sent to the seller." }}
        rows={[
          { label: { ar: "المنتوج", fr: "Article", en: "Item" }, value: t(listing.title) },
          { label: { ar: "البائع", fr: "Vendeur", en: "Seller" }, value: listing.seller.name },
          { label: { ar: "سعر الوحدة", fr: "Prix unitaire", en: "Unit price" }, value: `${dt(listing.price)} / ${short}` },
          { label: { ar: "الكمية المطلوبة", fr: "Quantité", en: "Quantity" }, value: `${num(qty)} ${short}` },
          { label: { ar: "المجموع الإجمالي", fr: "Total estimé", en: "Estimated total" }, value: dt(total), strong: true },
        ]}
        confirmLabel={{ ar: "إرسال الطلب", fr: "Envoyer la demande", en: "Send request" }}
        onConfirm={handleConfirm}
      />
      <ContactSellerDialog
        open={flow.step === "done"}
        onClose={flow.close}
        title={{ ar: "تم إرسال الطلب", fr: "Demande enregistrée", en: "Request sent" }}
        phone={listing.seller.phone}
      />
    </div>
  );
}

// --------------------------------------------------------------------------
// 2. NEGOTIABLE / OFFER PANEL
// --------------------------------------------------------------------------
export function OfferPanel({ listing }: { listing: Listing }) {
  const { t, dt, num } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isOwner = !!user && !!listing.ownerId && user.id === listing.ownerId;

  const { step } = UNIT_LABEL[listing.unit];
  const short = t(UNIT_LABEL[listing.unit].short);

  // Dynamic negotiation rule computation
  const rule = getNegotiationRule(listing.price);
  const [qty, setQty] = useState(() => clampQuantity(listing.unit === "kg" ? 50 : 1, listing.stock, step));
  const [offer, setOffer] = useState(String(rule.maxAcceptableOffer > 0 ? rule.maxAcceptableOffer : listing.price * 0.9));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const offerNum = Number(offer) || 0;
  const flow = useBuyFlow();
  const sendOffer = useServerFn(submitNegotiationOffer);

  const validation = validateNegotiationOffer(listing.price, offerNum);

  function onSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (isOwner) {
      toast.error(t({ ar: "لا يمكنك تقديم عرض على إعلانك الخاص.", fr: "Vous ne pouvez pas faire d'offre sur votre propre annonce.", en: "You cannot offer on your own listing." }));
      return;
    }
    if (!validation.ok) {
      const msg = validation.message ? t(validation.message) : "Offre invalide.";
      toast.error(msg);
      return;
    }
    flow.start();
  }

  async function handleConfirmOffer() {
    setSubmitting(true);
    try {
      const res = await sendOffer({
        data: {
          listingId: listing.id,
          offeredPrice: offerNum,
          quantity: qty,
          notes,
        },
      });

      if (res.ok) {
        toast.success(t({ ar: "تم إرسال عرضك للبائع بنجاح!", fr: "Votre offre a été transmise au vendeur !", en: "Your offer was sent to the seller!" }));
        await qc.invalidateQueries({ queryKey: ["me", "offers"] });
        flow.setStep("done");
      } else {
        toast.error(res.message || t({ ar: "فشلت العملية", fr: "Une erreur est survenue", en: "Offer submission failed" }));
      }
    } catch {
      toast.error(t({ ar: "فشلت العملية", fr: "Une erreur est survenue", en: "Offer submission failed" }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmitForm}>
      {isOwner && <OwnerWarningBanner />}

      {/* Dynamic Rule Info Banner */}
      <div className="rounded-lg border border-border bg-muted/60 p-3.5 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <HandCoins className="size-4 text-brass" />
          <span>{t({ ar: "قاعدة التفاوض الأدنى:", fr: "Règle de négociation minimale :", en: "Minimum negotiation rule:" })}</span>
        </div>
        <p className="mt-1 text-muted-foreground">
          {t({
            ar: `لهذا الإعلان، الفارق الأدنى للتفاوض هو ${rule.minDifference} د.ت (${rule.percentage}%). العرض الأقصى المقبول للتفاوض: ${rule.maxAcceptableOffer} د.ت.`,
            fr: `Pour cet article, la différence minimale requise est de ${rule.minDifference} DT (${rule.percentage}%). Offre maximale recommandée : ${rule.maxAcceptableOffer} DT.`,
            en: `For this item, minimum required difference is ${rule.minDifference} DT (${rule.percentage}%). Maximum negotiable offer: ${rule.maxAcceptableOffer} DT.`,
          })}
        </p>
      </div>

      {listing.stock > 1 && <QuantityStepper listing={listing} value={qty} onChange={setQty} disabled={isOwner} />}

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="offer" className="label-stamp text-xs text-muted-foreground">
            {t({ ar: "السعر المقترح للوحدة", fr: "Votre prix par unité", en: "Your price per unit" })} ({short})
          </label>
          {offerNum > 0 && (
            <span className={`text-xs font-semibold ${validation.ok ? "text-rust" : "text-destructive"}`}>
              {validation.ok
                ? `-${validation.difference} DT (${Math.round((validation.difference / listing.price) * 100)}%)`
                : t({ ar: "فارق غير كافٍ", fr: "Écart insuffisant", en: "Insufficient gap" })}
            </span>
          )}
        </div>
        <input
          id="offer"
          type="number"
          min={0.1}
          step="0.1"
          className={`${field} mt-1.5 ${!validation.ok && offerNum > 0 ? "border-destructive focus:ring-destructive/25" : ""}`}
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          disabled={isOwner}
        />
        {!validation.ok && offerNum > 0 && validation.message && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{t(validation.message)}</span>
          </p>
        )}
      </div>

      <div className="flex items-baseline justify-between rounded-lg bg-muted/70 p-4">
        <span className="font-semibold">{t({ ar: "المجموع المقترح", fr: "Total proposé", en: "Offered total" })}</span>
        <span className="font-display text-2xl font-semibold text-rust">
          {dt(quantityTotal(offerNum || 0, qty))}
        </span>
      </div>

      <Button type="submit" variant="rust" size="lg" className="w-full" disabled={isOwner || !validation.ok}>
        <HandCoins /> {t({ ar: "قدّم عرض", fr: "Faire une offre", en: "Make an offer" })}
      </Button>

      <AccountRequiredDialog open={flow.step === "account"} onClose={flow.close} />
      <ConfirmActionDialog
        open={flow.step === "confirm"}
        onClose={flow.close}
        title={{ ar: "تأكيد تقديم العرض؟", fr: "Confirmer l'offre ?", en: "Confirm the offer?" }}
        description={{
          ar: `سيتم إرسال عرضك بقيمة ${dt(offerNum)} للوحدة (فارق ${validation.difference} د.ت) إلى البائع.`,
          fr: `Votre offre de ${dt(offerNum)} / ${short} (écart de ${validation.difference} DT) sera envoyée au vendeur.`,
          en: `Your offer of ${dt(offerNum)} / ${short} (diff of ${validation.difference} DT) will be sent to the seller.`,
        }}
        rows={[
          { label: { ar: "المنتوج", fr: "Article", en: "Item" }, value: t(listing.title) },
          { label: { ar: "البائع", fr: "Vendeur", en: "Seller" }, value: listing.seller.name },
          { label: { ar: "السعر الأصلي", fr: "Prix initial", en: "Initial price" }, value: `${dt(listing.price)} / ${short}` },
          { label: { ar: "السعر المقترح", fr: "Votre prix", en: "Your price" }, value: `${dt(offerNum || 0)} / ${short}` },
          { label: { ar: "الفارق المحسوب", fr: "Différence", en: "Difference" }, value: `-${validation.difference} DT (${Math.round((validation.difference / listing.price) * 100)}%)` },
          { label: { ar: "الكمية", fr: "Quantité", en: "Quantity" }, value: `${num(qty)} ${short}` },
          { label: { ar: "المجموع المقترح", fr: "Total proposé", en: "Offered total" }, value: dt(quantityTotal(offerNum || 0, qty)), strong: true },
        ]}
        confirmLabel={{ ar: "نأكّد العرض", fr: "Envoyer l'offre", en: "Confirm offer" }}
        onConfirm={handleConfirmOffer}
      />
      <ContactSellerDialog
        open={flow.step === "done"}
        onClose={flow.close}
        title={{ ar: "تم تسجيل العرض", fr: "Offre enregistrée", en: "Offer recorded" }}
        phone={listing.seller.phone}
      />
    </form>
  );
}

// --------------------------------------------------------------------------
// 3. AUCTION PANEL WITH VISIBLE BIDDING & SELLER ACCESS
// --------------------------------------------------------------------------
export function AuctionPanel({ listing }: { listing: Listing }) {
  const a = listing.auction!;
  const { t, dt } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isOwner = !!user && !!listing.ownerId && user.id === listing.ownerId;

  const [bids, setBids] = useState(a.bids.map((b) => ({ ...b })));
  const [biddersModalOpen, setBiddersModalOpen] = useState(false);
  const [sellerBidders, setSellerBidders] = useState<any[]>([]);
  const [loadingBidders, setLoadingBidders] = useState(false);

  const fetchBidders = useServerFn(getListingBidders);
  const sendBid = useServerFn(placeAuctionBid);

  const current = bids.length ? Math.max(...bids.map((b) => b.amount)) : a.startPrice;
  const state: AuctionState = {
    startPrice: a.startPrice,
    increment: a.increment,
    endsAt: Number.POSITIVE_INFINITY,
    bids: bids.map((b) => ({ bidder: b.bidder, amount: b.amount, at: -b.minutesAgo })),
  };

  const minNext = bids.length ? current + a.increment : a.startPrice;
  const [amount, setAmount] = useState(String(minNext));
  const history = [...bids].sort((x, y) => y.amount - x.amount);
  const flow = useBuyFlow();

  const bidderName = (b: string) =>
    b === "me" ? t({ ar: "إنت", fr: "Vous", en: "You" }) : `${t({ ar: "مشارك", fr: "Enchérisseur", en: "Bidder" })} ${b}`;

  const ago = (min: number) => {
    if (min === 0) return t({ ar: "توّا", fr: "à l'instant", en: "just now" });
    if (min < 60) return t({ ar: `منذ ${min} دقيقة`, fr: `il y a ${min} min`, en: `${min} min ago` });
    const h = Math.round(min / 60);
    return t({ ar: `منذ ${h} ساعة`, fr: `il y a ${h} h`, en: `${h} h ago` });
  };

  function placeBid(e: React.FormEvent) {
    e.preventDefault();
    if (isOwner) {
      toast.error(t({ ar: "لا يمكنك المزايدة على إعلانك الخاص.", fr: "Vous ne pouvez pas enchérir sur votre propre annonce.", en: "You cannot bid on your own listing." }));
      return;
    }
    const check = validateBid({ ...state, endsAt: auctionEndsAt(a) }, Number(amount), Date.now());
    if (!check.ok) {
      toast.error(
        check.code === "closed"
          ? t({ ar: "المزايدة مغلقة.", fr: "L'enchère est clôturée.", en: "This auction is closed." })
          : check.code === "invalid"
            ? t({ ar: "المبلغ غير صالح.", fr: "Montant invalide.", en: "Invalid amount." })
            : `${t({ ar: "أقل عرض مسموح:", fr: "L'offre minimale est de", en: "The minimum bid is" })} ${dt(check.min)}`,
      );
      return;
    }
    flow.start();
  }

  async function commitBid() {
    flow.close();
    const bidVal = Number(amount);
    try {
      const res = await sendBid({ data: { listingId: listing.id, amount: bidVal } });
      if (res.ok) {
        setBids(res.bids);
        setAmount(String(bidVal + a.increment));
        toast.success(`${t({ ar: "تسجّل عرضك:", fr: "Enchère enregistrée :", en: "Bid placed:" })} ${dt(bidVal)}`, {
          description: t({ ar: "إنت توّا صاحب أعلى عرض.", fr: "Vous êtes le meilleur enchérisseur.", en: "You are the highest bidder." }),
        });
        await qc.invalidateQueries({ queryKey: ["catalog"] });
      } else {
        toast.error(res.message || t({ ar: "فشلت المزايدة", fr: "Échec de l'enchère", en: "Bid failed" }));
      }
    } catch {
      toast.error(t({ ar: "فشلت المزايدة", fr: "Échec de l'enchère", en: "Bid failed" }));
    }
  }

  async function openSellerBiddersDialog() {
    setBiddersModalOpen(true);
    setLoadingBidders(true);
    try {
      const data = await fetchBidders({ data: { listingId: listing.id } });
      setSellerBidders(data);
    } catch {
      toast.error("Impossible de charger les détails des enchérisseurs.");
    } finally {
      setLoadingBidders(false);
    }
  }

  return (
    <div className="space-y-5">
      {isOwner && <OwnerWarningBanner />}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-charcoal p-4 text-on-dark">
          <p className="text-xs text-on-dark-muted">{t({ ar: "السعر الحالي", fr: "Prix actuel", en: "Current price" })}</p>
          <p className="font-display text-2xl font-semibold text-brass">{dt(current)}</p>
        </div>
        <div className="rounded-lg bg-muted/70 p-4">
          <p className="text-xs text-muted-foreground">{t({ ar: "تتسكّر بعد", fr: "Clôture dans", en: "Closes in" })}</p>
          <Countdown auction={a} className="mt-1 text-lg" />
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
        <span>{t({ ar: "سعر الانطلاق:", fr: "Départ :", en: "Start:" })} {dt(a.startPrice)}</span>
        <span>{t({ ar: "أدنى زيادة:", fr: "Incrément min. :", en: "Min. increment:" })} {dt(a.increment)}</span>
        <span>{bids.length} {t({ ar: "عروض مسجلة", fr: "enchères", en: "bids" })}</span>
      </div>

      <form onSubmit={placeBid} className="space-y-3">
        <label htmlFor="bid" className="label-stamp text-xs text-muted-foreground">
          {t({ ar: "عرضك", fr: "Votre enchère", en: "Your bid" })} ({t({ ar: "الأدنى", fr: "min.", en: "min." })} {dt(minNext)})
        </label>
        <div className="flex gap-2">
          <input
            id="bid"
            type="number"
            min={minNext}
            step={a.increment}
            className={field}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isOwner}
          />
          <Button type="submit" variant="rust" size="lg" className="shrink-0" disabled={isOwner}>
            <Gavel /> {t({ ar: "زايد", fr: "Enchérir", en: "Bid" })}
          </Button>
        </div>

        {!isOwner && (
          <div className="flex gap-2">
            {[1, 2, 5].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setAmount(String(current + a.increment * m))}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:border-rust"
              >
                +{dt(a.increment * m)}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {t({ ar: "العرض المسجّل ما يتبدّلش وما يتلغاش.", fr: "Une enchère validée ne peut pas être modifiée ni annulée.", en: "A placed bid cannot be changed or cancelled." })}
        </p>
      </form>

      {/* Seller Specific View Button */}
      {isOwner && bids.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2 border-brass text-brass hover:bg-brass/10"
          onClick={openSellerBiddersDialog}
        >
          <Users className="size-4" />
          {t({ ar: "عرض بيانات المزايدين (خاص بالبائع)", fr: "Voir les enchérisseurs & contacts", en: "View bidders & contact info" })}
        </Button>
      )}

      <AccountRequiredDialog open={flow.step === "account"} onClose={flow.close} />
      <ConfirmActionDialog
        open={flow.step === "confirm"}
        onClose={flow.close}
        title={{ ar: "تأكّد المزايدة؟", fr: "Confirmer l'enchère ?", en: "Confirm the bid?" }}
        description={{ ar: "العرض المسجّل ما يتبدّلش وما يتلغاش.", fr: "Une enchère validée ne peut pas être modifiée ni annulée.", en: "A placed bid cannot be changed or cancelled." }}
        rows={[
          { label: { ar: "المنتوج", fr: "Article", en: "Item" }, value: t(listing.title) },
          { label: { ar: "السعر الحالي", fr: "Prix actuel", en: "Current price" }, value: dt(current) },
          { label: { ar: "عرضك", fr: "Votre enchère", en: "Your bid" }, value: dt(Number(amount)), strong: true },
        ]}
        confirmLabel={{ ar: "نزايد", fr: "J'enchéris", en: "Place bid" }}
        onConfirm={commitBid}
      />

      {/* Public Bidding History (Privacy Protected) */}
      <div>
        <p className="label-stamp mb-2 text-xs text-muted-foreground">
          {t({ ar: "تاريخ العروض", fr: "Historique des enchères", en: "Bid history" })}
        </p>
        <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {history.length === 0 ? (
            <li className="p-4 text-center text-xs text-muted-foreground">
              {t({ ar: "لا توجد عروض بعد. كن أول من يزايد!", fr: "Aucune enchère pour l'instant. Soyez le premier !", en: "No bids yet. Be the first to bid!" })}
            </li>
          ) : (
            history.map((b, i) => (
              <li key={`${b.bidder}-${b.amount}-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  {i === 0 ? <Trophy className="size-4 text-brass" /> : <span className="size-4" />}
                  <span className={i === 0 ? "font-semibold" : ""}>{bidderName(b.bidder)}</span>
                </span>
                <span className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">{ago(b.minutesAgo)}</span>
                  <span className="font-display font-semibold">{dt(b.amount)}</span>
                </span>
              </li>
            ))
          )}
        </ol>
      </div>

      {/* SELLER BIDDER CONTACTS MODAL */}
      <Dialog open={biddersModalOpen} onOpenChange={setBiddersModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-brass" />
              {t({ ar: "سجل المزايدين ومعلومات الاتصال", fr: "Enchérisseurs & Coordonnées", en: "Bidders & Contact Info" })}
            </DialogTitle>
            <DialogDescription>
              {t({
                ar: "هذه المعلومات خاصة بصاحب الإعلان فقط لتسهيل إتمام الصفقة.",
                fr: "Ces informations sont réservées au propriétaire de l'annonce pour finaliser la vente.",
                en: "This information is restricted to the listing owner to finalize the deal.",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 space-y-3 overflow-y-auto py-2">
            {loadingBidders ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chargement...</p>
            ) : sellerBidders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucun enchérisseur trouvé.</p>
            ) : (
              sellerBidders.map((b, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{b.bidderName || `Participant ${b.bidder}`}</span>
                      {idx === 0 && <span className="rounded bg-brass/20 px-1.5 py-0.5 text-[0.65rem] font-bold text-brass">MEILLEURE OFFRE</span>}
                    </div>
                    {b.bidderPhone && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-rust">
                        <Phone className="size-3" />
                        <a href={`tel:${b.bidderPhone}`} className="underline" dir="ltr">{b.bidderPhone}</a>
                      </p>
                    )}
                  </div>
                  <div className="text-end">
                    <p className="font-display text-lg font-bold text-rust">{dt(b.amount)}</p>
                    <p className="text-[0.7rem] text-muted-foreground">{ago(b.minutesAgo)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
