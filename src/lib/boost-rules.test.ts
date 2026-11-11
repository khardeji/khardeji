import { describe, expect, it } from "vitest";
import {
  BOOST_DURATIONS,
  BOOST_NAMES,
  boostPriority,
  getBoostTimeRemaining,
  isBoostActive,
  type ActiveBoost,
  type Listing,
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

  it("boostPriority returns correct tier scores", () => {
    const makeBoost = (boostId: ActiveBoost["boostId"]): ActiveBoost => ({
      boostId,
      appliedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000 * 5).toISOString(),
      cost: 1,
    });
    const withBoost = (boost: ActiveBoost) =>
      ({ activeBoost: boost } as unknown as Listing);

    expect(boostPriority(withBoost(makeBoost("a-la-une")))).toBe(4);
    expect(boostPriority(withBoost(makeBoost("premium-7j")))).toBe(3);
    expect(boostPriority(withBoost(makeBoost("urgent")))).toBe(2);
    expect(boostPriority(withBoost(makeBoost("remonter")))).toBe(1);
    expect(boostPriority({ activeBoost: null } as unknown as Listing)).toBe(0);
    expect(boostPriority({ activeBoost: undefined } as unknown as Listing)).toBe(0);

    // Expired boost → treated as no boost
    const expired: ActiveBoost = {
      boostId: "a-la-une",
      appliedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(), // already past
      cost: 15,
    };
    expect(boostPriority(withBoost(expired))).toBe(0);
  });

  it("boost sort order: a-la-une > premium-7j > urgent > remonter > none", () => {
    const makeActive = (boostId: ActiveBoost["boostId"]): ActiveBoost => ({
      boostId,
      appliedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000 * 5).toISOString(),
      cost: 1,
    });
    const toListing = (boost?: ActiveBoost) =>
      ({ activeBoost: boost ?? null } as unknown as Listing);

    const listings = [
      toListing(undefined),                        // no boost
      toListing(makeActive("urgent")),             // tier 2
      toListing(makeActive("a-la-une")),           // tier 4
      toListing(undefined),                        // no boost
      toListing(makeActive("remonter")),           // tier 1
      toListing(makeActive("premium-7j")),         // tier 3
    ];

    const sorted = [...listings].sort((a, b) => boostPriority(b) - boostPriority(a));
    const priorities = sorted.map(boostPriority);

    // Should be non-increasing (descending)
    for (let i = 0; i < priorities.length - 1; i++) {
      expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i + 1]!);
    }
    expect(priorities[0]).toBe(4); // a-la-une first
    expect(priorities[1]).toBe(3); // premium-7j second
    expect(priorities[2]).toBe(2); // urgent third
    expect(priorities[3]).toBe(1); // remonter fourth
    expect(priorities[4]).toBe(0); // no boost
    expect(priorities[5]).toBe(0); // no boost
  });
});

