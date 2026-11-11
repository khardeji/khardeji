// What a new listing must contain before it can be sent for review. Used by the publish form and the server.
import type { SaleType } from "@/data/catalog";
import type { SaleUnit } from "@/lib/quantity";

export const MAX_PHOTOS = 12;
export const SALE_UNITS: SaleUnit[] = ["piece", "kg", "g", "tonne", "lot", "libre"];
export const SALE_TYPES: SaleType[] = ["fixe", "negociable", "enchere"];

export interface PlanLimit {
  maxListings: number;
  maxPhotos: number;
  monthlyTokens: number;
  hasShop: boolean;
  name: { ar: string; fr: string; en: string };
  price: number;
}

export const PLAN_CONFIG: Record<string, PlanLimit> = {
  basique: {
    maxListings: 5,
    maxPhotos: 12,
    monthlyTokens: 0,
    hasShop: false,
    name: { ar: "أساسي", fr: "Basique", en: "Basic" },
    price: 0,
  },
  pro: {
    maxListings: 50,
    maxPhotos: 12,
    monthlyTokens: 40,
    hasShop: false,
    name: { ar: "محترف خردة", fr: "Pro Ferrailleur", en: "Scrap Pro" },
    price: 49,
  },
  entreprise: {
    maxListings: 999999,
    maxPhotos: 12,
    monthlyTokens: 150,
    hasShop: true,
    name: { ar: "شركة", fr: "Entreprise", en: "Enterprise" },
    price: 149,
  },
};

export function getEffectivePlan(plan?: string | null, expiresAt?: string | null): "basique" | "pro" | "entreprise" {
  if (!plan || plan === "basique") return "basique";
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return "basique";
  }
  return plan === "entreprise" ? "entreprise" : "pro";
}

export interface ListingInput {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  governorate: string;
  city: string;
  /** Storage paths of uploaded photos. */
  photos: string[];
  saleType: SaleType;
  unit: SaleUnit;
  price: number;
  stock: number;
  startPrice: number;
  reservePrice: number | null;
  increment: number;
  /** ISO dates, auctions only. */
  startAt: string;
  endAt: string;
  urgent?: boolean;
  featured?: boolean;
}

export type ListingProblem =
  | "title"
  | "category"
  | "governorate"
  | "photos"
  | "sale"
  | "price"
  | "start_price"
  | "increment"
  | "dates"
  | "stock"
  | "insufficient_tokens"
  | "plan_limit_reached";

/** Problems found on the first step (details) vs. the pricing step. */
export const DETAILS_PROBLEMS: ListingProblem[] = ["title", "category", "governorate", "photos"];

export function listingProblems(d: ListingInput): ListingProblem[] {
  const out: ListingProblem[] = [];
  if (d.title.trim().length < 5 || d.title.trim().length > 90) out.push("title");
  if (!d.category || !d.subcategory) out.push("category");
  if (!d.governorate) out.push("governorate");
  if (d.photos.length > MAX_PHOTOS) out.push("photos");
  if (!SALE_TYPES.includes(d.saleType) || !SALE_UNITS.includes(d.unit)) out.push("sale");
  if (d.saleType === "enchere") {
    if (!(d.startPrice > 0)) out.push("start_price");
    if (!(d.increment > 0)) out.push("increment");
    const start = Date.parse(d.startAt);
    const end = Date.parse(d.endAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) out.push("dates");
  } else if (!(d.price > 0)) {
    out.push("price");
  }
  if (d.unit !== "libre" && !(d.stock > 0)) out.push("stock");
  return out;
}
