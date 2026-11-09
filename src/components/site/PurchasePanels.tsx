import { Gavel, HandCoins, Minus, Plus, ShoppingCart, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Countdown } from "./Countdown";
import type { Listing } from "@/data/catalog";
import { minimumNextBid, participantCount, validateBid, type AuctionState } from "@/lib/auction";
import { demoEndsAt } from "@/lib/demo-clock";
import { formatDT, formatNumber } from "@/lib/format";
import { clampQuantity, quantityTotal, UNIT_LABEL } from "@/lib/quantity";

const field =
  "h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-rust focus:ring-2 focus:ring-rust/25";

function QuantityStepper({ listing, value, onChange }: { listing: Listing; value: number; onChange: (n: number) => void }) {
  const { step, short } = UNIT_LABEL[listing.unit];
  return (
    <div>
      <label htmlFor="qty" className="label-stamp text-xs text-muted-foreground">Quantité souhaitée</label>
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Diminuer" onClick={() => onChange(clampQuantity(value - step, listing.stock, step))} disabled={value <= step}>
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
            className={`${field} pr-14 text-center font-display text-lg font-semibold`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{short}</span>
        </div>
        <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Augmenter" onClick={() => onChange(clampQuantity(value + step, listing.stock, step))} disabled={value >= listing.stock}>
          <Plus />
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Stock disponible : {formatNumber(listing.stock)} {short}
      </p>
    </div>
  );
}

export function FixedPricePanel({ listing }: { listing: Listing }) {
  const { short, step } = UNIT_LABEL[listing.unit];
  const [qty, setQty] = useState(() => clampQuantity(listing.unit === "kg" ? 25 : 1, listing.stock, step));
  const total = quantityTotal(listing.price, qty);

  return (
    <div className="space-y-5">
      {listing.stock > 1 && <QuantityStepper listing={listing} value={qty} onChange={setQty} />}
      <dl className="space-y-2 rounded-lg bg-muted/70 p-4 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">Prix unitaire</dt><dd className="font-medium">{formatDT(listing.price)} / {short}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Quantité</dt><dd className="font-medium">{formatNumber(qty)} {short}</dd></div>
        <div className="flex items-baseline justify-between border-t border-border pt-2">
          <dt className="font-semibold">Total estimé</dt>
          <dd className="font-display text-2xl font-semibold text-rust">{formatDT(total)}</dd>
        </div>
      </dl>
      <Button
        variant="rust"
        size="lg"
        className="w-full"
        onClick={() => toast.success(`Demande de ${formatNumber(qty)} ${short} envoyée`, { description: "Le vendeur pourra confirmer ou refuser votre demande." })}
      >
        <ShoppingCart /> Demander cette quantité
      </Button>
    </div>
  );
}

export function OfferPanel({ listing }: { listing: Listing }) {
  const { short, step } = UNIT_LABEL[listing.unit];
  const [qty, setQty] = useState(() => clampQuantity(listing.unit === "kg" ? 50 : 1, listing.stock, step));
  const [offer, setOffer] = useState(String(Math.round(listing.price * 0.9 * 100) / 100));
  const offerNum = Number(offer);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!(offerNum > 0)) {
          toast.error("Indiquez un prix valide.");
          return;
        }
        toast.success("Offre envoyée au vendeur", { description: `${formatDT(offerNum)} / ${short} pour ${formatNumber(qty)} ${short}.` });
      }}
    >
      <p className="text-sm text-muted-foreground">
        Prix indicatif : <span className="font-semibold text-foreground">{formatDT(listing.price)} / {short}</span>. Proposez votre prix.
      </p>
      {listing.stock > 1 && <QuantityStepper listing={listing} value={qty} onChange={setQty} />}
      <div>
        <label htmlFor="offer" className="label-stamp text-xs text-muted-foreground">Votre prix ({short})</label>
        <input id="offer" type="number" min={0} step="0.1" className={`${field} mt-2`} value={offer} onChange={(e) => setOffer(e.target.value)} />
      </div>
      <div className="flex items-baseline justify-between rounded-lg bg-muted/70 p-4">
        <span className="font-semibold">Total proposé</span>
        <span className="font-display text-2xl font-semibold text-rust">{formatDT(quantityTotal(offerNum || 0, qty))}</span>
      </div>
      <Button type="submit" variant="rust" size="lg" className="w-full"><HandCoins /> Faire une offre</Button>
    </form>
  );
}

export function AuctionPanel({ listing }: { listing: Listing }) {
  const a = listing.auction!;
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

  function placeBid(e: React.FormEvent) {
    e.preventDefault();
    const check = validateBid({ ...state, endsAt: demoEndsAt(a.endsInHours) }, Number(amount), Date.now());
    if (!check.ok) {
      toast.error(check.reason);
      return;
    }
    const next = [...bids, { bidder: "Vous", amount: Number(amount), minutesAgo: 0 }];
    setBids(next);
    setAmount(String(Number(amount) + a.increment));
    toast.success(`Enchère de ${formatDT(Number(amount))} enregistrée`, { description: "Vous êtes le meilleur enchérisseur." });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-charcoal p-4 text-on-dark">
          <p className="text-xs text-on-dark-muted">Prix actuel</p>
          <p className="font-display text-2xl font-semibold text-brass">{formatDT(current)}</p>
        </div>
        <div className="rounded-lg bg-muted/70 p-4">
          <p className="text-xs text-muted-foreground">Clôture dans</p>
          <Countdown endsInHours={a.endsInHours} className="mt-1 text-lg" />
        </div>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Départ : {formatDT(a.startPrice)}</span>
        <span>Incrément min. : {formatDT(a.increment)}</span>
        <span>{participantCount(state)} participants</span>
      </div>

      <form onSubmit={placeBid} className="space-y-3">
        <label htmlFor="bid" className="label-stamp text-xs text-muted-foreground">Votre enchère (min. {formatDT(minNext)})</label>
        <div className="flex gap-2">
          <input id="bid" type="number" min={minNext} step={a.increment} className={field} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button type="submit" variant="rust" size="lg" className="shrink-0"><Gavel /> Enchérir</Button>
        </div>
        <div className="flex gap-2">
          {[1, 2, 5].map((m) => (
            <button key={m} type="button" onClick={() => setAmount(String(current + a.increment * m))} className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:border-rust">
              +{formatDT(a.increment * m)}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Une enchère validée ne peut pas être modifiée ni annulée.</p>
      </form>

      <div>
        <p className="label-stamp mb-2 text-xs text-muted-foreground">Historique des enchères</p>
        <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {history.map((b, i) => (
            <li key={`${b.bidder}-${b.amount}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2">
                {i === 0 ? <Trophy className="size-4 text-brass" /> : <span className="size-4" />}
                <span className={i === 0 ? "font-semibold" : ""}>{b.bidder}</span>
              </span>
              <span className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">
                  {b.minutesAgo === 0 ? "à l'instant" : b.minutesAgo < 60 ? `il y a ${b.minutesAgo} min` : `il y a ${Math.round(b.minutesAgo / 60)} h`}
                </span>
                <span className="font-display font-semibold">{formatDT(b.amount)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
