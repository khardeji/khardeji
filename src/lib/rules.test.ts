import { describe, expect, it } from "vitest";
import { clampQuantity, quantityTotal } from "./quantity";
import { minimumNextBid, validateBid, type AuctionState } from "./auction";

describe("quantity purchase", () => {
  it("never exceeds the available stock (150 kg copper)", () => {
    expect(clampQuantity(200, 150)).toBe(150);
  });

  it("computes 25 kg × 28 DT = 700 DT", () => {
    expect(quantityTotal(28, 25)).toBe(700);
  });

  it("computes 5 pieces × 40 DT = 200 DT", () => {
    expect(quantityTotal(40, 5)).toBe(200);
  });
});

describe("auction bidding", () => {
  const now = 1_000_000;
  const base: AuctionState = { startPrice: 1500, increment: 50, endsAt: now + 3600_000, bids: [] };

  it("first bid must be at least the 1 500 DT start price", () => {
    expect(validateBid(base, 1499, now).ok).toBe(false);
    expect(validateBid(base, 1500, now).ok).toBe(true);
  });

  it("next bid must respect the 50 DT minimum increment", () => {
    const a = { ...base, bids: [{ bidder: "C", amount: 1650, at: now }] };
    expect(minimumNextBid(a)).toBe(1700);
    expect(validateBid(a, 1690, now).ok).toBe(false);
    expect(validateBid(a, 1700, now).ok).toBe(true);
  });

  it("rejects bids after the auction closes", () => {
    expect(validateBid(base, 5000, base.endsAt).ok).toBe(false);
  });
});
