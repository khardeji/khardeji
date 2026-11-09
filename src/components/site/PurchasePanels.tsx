import { Gavel, HandCoins, Minus, Plus, ShoppingCart, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Countdown } from "./Countdown";
import type { Listing } from "@/data/catalog";
import { minimumNextBid, participantCount, validateBid, type AuctionState } from "@/lib/auction";
import { demoEndsAt } from "@/lib/demo-clock";
import { useI18n } from "@/hooks/use-i18n";
import { clampQuantity, quantityTotal, UNIT_LABEL } from "@/lib/quantity";

const field =
  "h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-rust focus:ring-2 focus:ring-rust/25";

const ME = "me";

function QuantityStepper({ listing, value, onChange }: { listing: Listing; value: number; onChange: (n: number) => void }) {
  const { t, num } = useI18n();
  const { step } = UNIT_LABEL[listing.unit];
  const short = t(UNIT_LABEL[listing.unit].short);
  return (
    <div>
      <label htmlFor="qty" className="label-stamp text-xs text-muted-foreground">
        {t({ ar: "الكمية المطلوبة", fr: "Quantité souhaitée", en: "Quantity wanted" })}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" className="size-11" aria-label={t({ ar: "نقّص", fr: "Diminuer", en: "Decrease" })} onClick={() => onChange(clampQuantity(value - step, listing.stock, step))} disabled={value <= step}>
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
            onChange={(e) => onChange(clampQuantity(Number(e.target.value), listing.stock, step))}
            className={`${field} pe-14 text-center font-display text-lg font-semibold`}
          />
          <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{short}</span>
        </div>
        <Button type="button" variant="outline" size="icon" className="size-11" aria-label={t({ ar: "زيد", fr: "Augmenter", en: "Increase" })} onClick={() => onChange(clampQuantity(value + step, listing.stock, step))} disabled={value >= listing.stock}>
          <Plus />
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {t({ ar: "المخزون المتوفر:", fr: "Stock disponible :", en: "Available stock:" })} {num(listing.stock)} {short}
      </p>
    </div>
  );
}

export function FixedPricePanel({ listing }: { listing: Listing }) {
  const { t, dt, num } = useI18n();
  const { step } = UNIT_LABEL[listing.unit];
  const short = t(UNIT_LABEL[listing.unit].short);
  const [qty, setQty] = useState(() => clampQuantity(listing.unit === "kg" ? 25 : 1, listing.stock, step));
  const total = quantityTotal(listing.price, qty);

  return (
    <div className="space-y-5">
      {listing.stock > 1 && <QuantityStepper listing={listing} value={qty} onChange={setQty} />}
      <dl className="space-y-2 rounded-lg bg-muted/70 p-4 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">{t({ ar: "سعر الوحدة", fr: "Prix unitaire", en: "Unit price" })}</dt><dd className="font-medium">{dt(listing.price)} / {short}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">{t({ ar: "الكمية", fr: "Quantité", en: "Quantity" })}</dt><dd className="font-medium">{num(qty)} {short}</dd></div>
        <div className="flex items-baseline justify-between border-t border-border pt-2">
          <dt className="font-semibold">{t({ ar: "المجموع التقريبي", fr: "Total estimé", en: "Estimated total" })}</dt>
          <dd className="font-display text-2xl font-semibold text-rust">{dt(total)}</dd>
        </div>
      </dl>
      <Button
        variant="rust"
        size="lg"
        className="w-full"
        onClick={() =>
          toast.success(`${t({ ar: "تبعث طلب", fr: "Demande envoyée :", en: "Request sent:" })} ${num(qty)} ${short}`, {
            description: t({ ar: "البائع ينجم يقبل ولا يرفض طلبك.", fr: "Le vendeur pourra confirmer ou refuser votre demande.", en: "The seller can confirm or decline your request." }),
          })
        }
      >
        <ShoppingCart /> {t({ ar: "اطلب هذه الكمية", fr: "Demander cette quantité", en: "Request this quantity" })}
      </Button>
    </div>
  );
}

export function OfferPanel({ listing }: { listing: Listing }) {
  const { t, dt, num } = useI18n();
  const { step } = UNIT_LABEL[listing.unit];
  const short = t(UNIT_LABEL[listing.unit].short);
  const [qty, setQty] = useState(() => clampQuantity(listing.unit === "kg" ? 50 : 1, listing.stock, step));
  const [offer, setOffer] = useState(String(Math.round(listing.price * 0.9 * 100) / 100));
  const offerNum = Number(offer);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!(offerNum > 0)) {
          toast.error(t({ ar: "اكتب سعر صحيح.", fr: "Indiquez un prix valide.", en: "Enter a valid price." }));
          return;
        }
        toast.success(t({ ar: "تبعث العرض للبائع", fr: "Offre envoyée au vendeur", en: "Offer sent to the seller" }), {
          description: `${dt(offerNum)} / ${short} — ${num(qty)} ${short}`,
        });
      }}
    >
      <p className="text-sm text-muted-foreground">
        {t({ ar: "السعر المقترح:", fr: "Prix indicatif :", en: "Asking price:" })}{" "}
        <span className="font-semibold text-foreground">{dt(listing.price)} / {short}</span>.{" "}
        {t({ ar: "اقترح السعر متاعك.", fr: "Proposez votre prix.", en: "Make your offer." })}
      </p>
      {listing.stock > 1 && <QuantityStepper listing={listing} value={qty} onChange={setQty} />}
      <div>
        <label htmlFor="offer" className="label-stamp text-xs text-muted-foreground">
          {t({ ar: "السعر متاعك", fr: "Votre prix", en: "Your price" })} ({short})
        </label>
        <input id="offer" type="number" min={0} step="0.1" className={`${field} mt-2`} value={offer} onChange={(e) => setOffer(e.target.value)} />
      </div>
      <div className="flex items-baseline justify-between rounded-lg bg-muted/70 p-4">
        <span className="font-semibold">{t({ ar: "المجموع المقترح", fr: "Total proposé", en: "Offered total" })}</span>
        <span className="font-display text-2xl font-semibold text-rust">{dt(quantityTotal(offerNum || 0, qty))}</span>
      </div>
      <Button type="submit" variant="rust" size="lg" className="w-full">
        <HandCoins /> {t({ ar: "قدّم عرض", fr: "Faire une offre", en: "Make an offer" })}
      </Button>
    </form>
  );
}

export function AuctionPanel({ listing }: { listing: Listing }) {
  const a = listing.auction!;
  const { t, dt } = useI18n();
  const [bids, setBids] = useState(a.bids.map((b) => ({ ...b })));
  const state: AuctionState = {
    startPrice: a.startPrice,
    increment: a.increment,
    endsAt: Number.POSITIVE_INFINITY,
    bids: bids.map((b) => ({ bidder: b.bidder, amount: b.amount, at: -b.minutesAgo })),
  };
  const minNext = minimumNextBid(state);
  const [amount, setAmount] = useState(String(minNext));
  const current = bids.length ? Math.max(...bids.map((b) => b.amount)) : a.startPrice;
  const history = [...bids].sort((x, y) => y.amount - x.amount);

  const bidderName = (b: string) =>
    b === ME ? t({ ar: "إنت", fr: "Vous", en: "You" }) : `${t({ ar: "مشتري", fr: "Acheteur", en: "Buyer" })} ${b}`;

  const ago = (min: number) => {
    if (min === 0) return t({ ar: "توّا", fr: "à l'instant", en: "just now" });
    if (min < 60) return t({ ar: `منذ ${min} دقيقة`, fr: `il y a ${min} min`, en: `${min} min ago` });
    const h = Math.round(min / 60);
    return t({ ar: `منذ ${h} ساعة`, fr: `il y a ${h} h`, en: `${h} h ago` });
  };

  function placeBid(e: React.FormEvent) {
    e.preventDefault();
    const check = validateBid({ ...state, endsAt: demoEndsAt(a.endsInHours) }, Number(amount), Date.now());
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
    const next = [...bids, { bidder: ME, amount: Number(amount), minutesAgo: 0 }];
    setBids(next);
    setAmount(String(Number(amount) + a.increment));
    toast.success(`${t({ ar: "تسجّل عرضك:", fr: "Enchère enregistrée :", en: "Bid placed:" })} ${dt(Number(amount))}`, {
      description: t({ ar: "إنت توّا صاحب أعلى عرض.", fr: "Vous êtes le meilleur enchérisseur.", en: "You are the highest bidder." }),
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-charcoal p-4 text-on-dark">
          <p className="text-xs text-on-dark-muted">{t({ ar: "السعر الحالي", fr: "Prix actuel", en: "Current price" })}</p>
          <p className="font-display text-2xl font-semibold text-brass">{dt(current)}</p>
        </div>
        <div className="rounded-lg bg-muted/70 p-4">
          <p className="text-xs text-muted-foreground">{t({ ar: "تتسكّر بعد", fr: "Clôture dans", en: "Closes in" })}</p>
          <Countdown endsInHours={a.endsInHours} className="mt-1 text-lg" />
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
        <span>{t({ ar: "سعر الانطلاق:", fr: "Départ :", en: "Start:" })} {dt(a.startPrice)}</span>
        <span>{t({ ar: "أدنى زيادة:", fr: "Incrément min. :", en: "Min. increment:" })} {dt(a.increment)}</span>
        <span>{participantCount(state)} {t({ ar: "مشاركين", fr: "participants", en: "bidders" })}</span>
      </div>

      <form onSubmit={placeBid} className="space-y-3">
        <label htmlFor="bid" className="label-stamp text-xs text-muted-foreground">
          {t({ ar: "عرضك", fr: "Votre enchère", en: "Your bid" })} ({t({ ar: "الأدنى", fr: "min.", en: "min." })} {dt(minNext)})
        </label>
        <div className="flex gap-2">
          <input id="bid" type="number" min={minNext} step={a.increment} className={field} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button type="submit" variant="rust" size="lg" className="shrink-0"><Gavel /> {t({ ar: "زايد", fr: "Enchérir", en: "Bid" })}</Button>
        </div>
        <div className="flex gap-2">
          {[1, 2, 5].map((m) => (
            <button key={m} type="button" onClick={() => setAmount(String(current + a.increment * m))} className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:border-rust">
              +{dt(a.increment * m)}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {t({ ar: "العرض المسجّل ما يتبدّلش وما يتلغاش.", fr: "Une enchère validée ne peut pas être modifiée ni annulée.", en: "A placed bid cannot be changed or cancelled." })}
        </p>
      </form>

      <div>
        <p className="label-stamp mb-2 text-xs text-muted-foreground">{t({ ar: "تاريخ العروض", fr: "Historique des enchères", en: "Bid history" })}</p>
        <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {history.map((b, i) => (
            <li key={`${b.bidder}-${b.amount}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2">
                {i === 0 ? <Trophy className="size-4 text-brass" /> : <span className="size-4" />}
                <span className={i === 0 ? "font-semibold" : ""}>{bidderName(b.bidder)}</span>
              </span>
              <span className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">{ago(b.minutesAgo)}</span>
                <span className="font-display font-semibold">{dt(b.amount)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
