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

export type BidRejection = "closed" | "invalid" | "too_low";
export type BidCheck = { ok: true } | { ok: false; code: BidRejection; min: number };

export function validateBid(a: AuctionState, amount: number, now: number): BidCheck {
  const min = minimumNextBid(a);
  if (now >= a.endsAt) return { ok: false, code: "closed", min };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, code: "invalid", min };
  if (amount < min) return { ok: false, code: "too_low", min };
  return { ok: true };
}

export function participantCount(a: AuctionState): number {
  return new Set(a.bids.map((b) => b.bidder)).size;
}
