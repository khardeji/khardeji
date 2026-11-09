import { describe, expect, it } from "vitest";
import { listingProblems, type ListingInput } from "./listing-rules";

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
});
