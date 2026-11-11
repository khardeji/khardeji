import { describe, expect, it } from "vitest";
import {
  BOOST_DURATIONS,
  BOOST_NAMES,
  getBoostTimeRemaining,
  isBoostActive,
  type ActiveBoost,
} from "@/data/catalog";

describe("Boost Rules & Time Calculations", () => {
  it("determines if a boost is active correctly", () => {
    const futureBoost: ActiveBoost = {
      boostId: "urgent",
      appliedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600 * 1000 * 24 * 3).toISOString(), // 3 days in future
      cost: 3,
    };
    expect(isBoostActive(futureBoost)).toBe(true);

    const expiredBoost: ActiveBoost = {
      boostId: "urgent",
      appliedAt: new Date(Date.now() - 3600 * 1000 * 24 * 8).toISOString(),
      expiresAt: new Date(Date.now() - 3600 * 1000 * 24 * 1).toISOString(), // 1 day in past
      cost: 3,
    };
    expect(isBoostActive(expiredBoost)).toBe(false);
    expect(isBoostActive(null)).toBe(false);
    expect(isBoostActive(undefined)).toBe(false);
  });

  it("calculates remaining days and hours accurately", () => {
    // 5 days remaining
    const in5Days = new Date(Date.now() + 5 * 24 * 3600 * 1000 + 2 * 3600 * 1000).toISOString();
    const res5 = getBoostTimeRemaining(in5Days);
    expect(res5.isExpired).toBe(false);
    expect(res5.days).toBe(5);
    expect(res5.label.fr).toContain("5 jours restants");

    // 1 day remaining
    const in1Day = new Date(Date.now() + 26 * 3600 * 1000).toISOString();
    const res1 = getBoostTimeRemaining(in1Day);
    expect(res1.isExpired).toBe(false);
    expect(res1.days).toBe(1);
    expect(res1.label.fr).toContain("1 jour");

    // 5 hours remaining
    const in5Hours = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
    const resH = getBoostTimeRemaining(in5Hours);
    expect(resH.isExpired).toBe(false);
    expect(resH.days).toBe(0);
    expect(resH.hours).toBe(5);
    expect(resH.label.fr).toContain("5 heures restantes");

    // Expired
    const past = new Date(Date.now() - 1000).toISOString();
    const resExp = getBoostTimeRemaining(past);
    expect(resExp.isExpired).toBe(true);
    expect(resExp.label.fr).toBe("Expiré");
  });

  it("has valid configuration for all boost options", () => {
    expect(BOOST_DURATIONS.remonter.hours).toBe(24);
    expect(BOOST_DURATIONS.urgent.days).toBe(7);
    expect(BOOST_DURATIONS["premium-7j"].days).toBe(7);
    expect(BOOST_DURATIONS["a-la-une"].days).toBe(3);

    expect(BOOST_NAMES.urgent.fr).toBe("Urgent");
    expect(BOOST_NAMES["a-la-une"].fr).toBe("À la une");
  });
});
