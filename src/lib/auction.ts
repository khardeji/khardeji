// Auction bidding rules (client mirror — the server will re-validate every bid).
export interface Bid {
  bidder: string;
  amount: number;
  at: number; // epoch ms
}

export interface AuctionState {
  startPrice: number;
  increment: number;
  endsAt: number; // epoch ms
  bids: Bid[];
}

export function currentPrice(a: AuctionState): number {
  return a.bids.length ? Math.max(...a.bids.map((b) => b.amount)) : a.startPrice;
}

/** First bid must be at least the start price; later bids at least current + increment. */
export function minimumNextBid(a: AuctionState): number {
  return a.bids.length ? currentPrice(a) + a.increment : a.startPrice;
}

export type BidCheck = { ok: true } | { ok: false; reason: string };

export function validateBid(a: AuctionState, amount: number, now: number): BidCheck {
  if (now >= a.endsAt) return { ok: false, reason: "L'enchère est clôturée." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "Montant invalide." };
  const min = minimumNextBid(a);
  if (amount < min) return { ok: false, reason: `L'offre minimale est de ${min} DT.` };
  return { ok: true };
}

export function participantCount(a: AuctionState): number {
  return new Set(a.bids.map((b) => b.bidder)).size;
}
