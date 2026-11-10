import { describe, expect, it } from "vitest";
import { getNegotiationRule, validateNegotiationOffer } from "./negotiation";

describe("minimum negotiation rules", () => {
  it("item listed for 100 DT requires a minimum difference of 5 DT (5%)", () => {
    const rule = getNegotiationRule(100);
    expect(rule.percentage).toBe(5);
    expect(rule.minDifference).toBe(5);
    expect(rule.maxAcceptableOffer).toBe(95);

    // Offer of 98 DT has diff 2 < 5 -> rejected
    const checkBad = validateNegotiationOffer(100, 98);
    expect(checkBad.ok).toBe(false);
    expect(checkBad.code).toBe("below_min_difference");

    // Offer of 95 DT has diff 5 >= 5 -> accepted
    const checkGood = validateNegotiationOffer(100, 95);
    expect(checkGood.ok).toBe(true);

    // Offer of 80 DT has diff 20 >= 5 -> accepted
    expect(validateNegotiationOffer(100, 80).ok).toBe(true);
  });

  it("item listed for 500 DT requires a minimum difference of 25 DT (5%)", () => {
    const rule = getNegotiationRule(500);
    expect(rule.percentage).toBe(5);
    expect(rule.minDifference).toBe(25);
    expect(rule.maxAcceptableOffer).toBe(475);

    expect(validateNegotiationOffer(500, 490).ok).toBe(false);
    expect(validateNegotiationOffer(500, 475).ok).toBe(true);
  });

  it("item listed for exactly 1,000 DT requires 5% (50 DT difference)", () => {
    const rule = getNegotiationRule(1000);
    expect(rule.percentage).toBe(5);
    expect(rule.minDifference).toBe(50);
    expect(rule.maxAcceptableOffer).toBe(950);

    expect(validateNegotiationOffer(1000, 980).ok).toBe(false);
    expect(validateNegotiationOffer(1000, 950).ok).toBe(true);
  });

  it("item listed for 1,500 DT requires a minimum difference of 15 DT (1%)", () => {
    const rule = getNegotiationRule(1500);
    expect(rule.percentage).toBe(1);
    expect(rule.minDifference).toBe(15);
    expect(rule.maxAcceptableOffer).toBe(1485);

    expect(validateNegotiationOffer(1500, 1490).ok).toBe(false);
    expect(validateNegotiationOffer(1500, 1485).ok).toBe(true);
  });

  it("item listed for 5,000 DT requires a minimum difference of 50 DT (1%)", () => {
    const rule = getNegotiationRule(5000);
    expect(rule.percentage).toBe(1);
    expect(rule.minDifference).toBe(50);
    expect(rule.maxAcceptableOffer).toBe(4950);

    expect(validateNegotiationOffer(5000, 4980).ok).toBe(false);
    expect(validateNegotiationOffer(5000, 4950).ok).toBe(true);
  });

  it("rejects non-positive offers", () => {
    expect(validateNegotiationOffer(100, 0).ok).toBe(false);
    expect(validateNegotiationOffer(100, -10).ok).toBe(false);
  });
});

