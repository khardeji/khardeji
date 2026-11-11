import { describe, expect, it } from "vitest";
import { getEffectivePlan, listingProblems, PLAN_CONFIG, type ListingInput } from "./listing-rules";

const base: ListingInput = {
  title: "Cuivre récupéré",
  description: "",
  category: "metaux",
  subcategory: "Cuivre",
  governorate: "Sfax",
  city: "",
  photos: [],
  saleType: "fixe",
  unit: "kg",
  price: 28,
  stock: 150,
  startPrice: 0,
  reservePrice: null,
  increment: 50,
  startAt: "",
  endAt: "",
};

describe("new listing checks", () => {
  it("accepts a complete fixed-price listing", () => {
    expect(listingProblems(base)).toEqual([]);
  });

  it("refuses more than 12 photos", () => {
    expect(listingProblems({ ...base, photos: Array.from({ length: 13 }, (_, i) => `u/${i}.jpg`) })).toContain("photos");
  });

  it("refuses an auction whose end is before its start", () => {
    const p = listingProblems({ ...base, saleType: "enchere", startPrice: 100, startAt: "2026-12-02T10:00", endAt: "2026-12-01T10:00" });
    expect(p).toContain("dates");
  });

  it("free quantity needs no stock", () => {
    expect(listingProblems({ ...base, unit: "libre", stock: 0 })).toEqual([]);
  });

  it("checks plan limits and fallback for expired subscriptions", () => {
    expect(PLAN_CONFIG.basique.maxListings).toBe(5);
    expect(PLAN_CONFIG.pro.maxListings).toBe(50);
    expect(PLAN_CONFIG.pro.monthlyTokens).toBe(40);
    expect(PLAN_CONFIG.entreprise.monthlyTokens).toBe(150);
    expect(PLAN_CONFIG.entreprise.hasShop).toBe(true);

    expect(getEffectivePlan("basique", null)).toBe("basique");
    expect(getEffectivePlan("pro", null)).toBe("pro");
    expect(getEffectivePlan("entreprise", null)).toBe("entreprise");

    // Expired subscription falls back to basic
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(getEffectivePlan("pro", pastDate)).toBe("basique");

    // Active subscription stays pro
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(getEffectivePlan("pro", futureDate)).toBe("pro");
  });
});
