// Database rows → the app's catalogue shapes. Shared by public, member and admin server functions.
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveImage, type Category, type Listing, type ListingStatus, type SaleType, type Seller, type SellerKind } from "@/data/catalog";
import type { Database, Json } from "@/integrations/supabase/types";
import type { Msg } from "@/lib/i18n";
import type { SaleUnit } from "@/lib/quantity";

type Tables = Database["public"]["Tables"];
export type ListingRow = Tables["listings"]["Row"];
export type CategoryRow = Tables["categories"]["Row"];
export type TokenPackRow = Tables["token_packs"]["Row"];
export type BoostRow = Tables["boost_services"]["Row"];
export type PlanRow = Tables["plans"]["Row"];

export const PHOTO_BUCKET = "listing-photos";
/** Uploaded photos are stored in listing rows as "storage:<path>"; demo photos as a bundled key. */
export const STORAGE_PREFIX = "storage:";
const FALLBACK_IMAGE = "listing-recup";

/** Columns safe to show to anyone (no owner id, no moderation note). */
export const PUBLIC_LISTING_COLUMNS =
  "id, title, description, category, subcategory, governorate, city, price, unit, stock, sale_type, images, seller, featured, urgent, auction, status, published_at, owner_id";

function obj(v: Json | null | undefined): Record<string, Json | undefined> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, Json | undefined>) : {};
}

/** Any JSON value → { ar, fr, en }, filling empty languages from the others. */
export function toMsg(v: Json | null | undefined): Msg {
  const o = obj(v);
  const ar = typeof o["ar"] === "string" ? o["ar"] : "";
  const fr = typeof o["fr"] === "string" ? o["fr"] : "";
  const en = typeof o["en"] === "string" ? o["en"] : "";
  const any = ar || fr || en;
  return { ar: ar || any, fr: fr || any, en: en || fr || any };
}

const num = (v: Json | undefined, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v: Json | undefined, d = "") => (typeof v === "string" ? v : d);

function toSeller(v: Json): Seller {
  const o = obj(v);
  const kind = str(o["kind"], "particulier");
  return {
    name: str(o["name"], "—"),
    kind: (["particulier", "pro", "entreprise"].includes(kind) ? kind : "particulier") as SellerKind,
    verified: o["verified"] === true,
    memberSince: str(o["memberSince"]),
    phone: str(o["phone"]),
  };
}

function toAuction(v: Json | null): Listing["auction"] {
  if (!v) return undefined;
  const o = obj(v);
  const bids = Array.isArray(o["bids"]) ? o["bids"] : [];
  return {
    startPrice: num(o["startPrice"]),
    increment: num(o["increment"], 1),
    endsInHours: typeof o["endsInHours"] === "number" ? o["endsInHours"] : undefined,
    endsAt: typeof o["endsAt"] === "string" ? o["endsAt"] : undefined,
    bids: bids.map((b) => {
      const x = obj(b);
      return {
        bidder: str(x["bidder"], "?"),
        bidderId: str(x["bidderId"] || x["bidder_id"]),
        bidderName: str(x["bidderName"] || x["bidder_name"]),
        bidderPhone: str(x["bidderPhone"] || x["bidder_phone"]),
        bidderEmail: str(x["bidderEmail"] || x["bidder_email"]),
        amount: num(x["amount"]),
        minutesAgo: num(x["minutesAgo"]),
        createdAt: str(x["createdAt"] || x["created_at"]),
      };
    }),
  };
}

export function rowToListing(r: Partial<ListingRow> & Pick<ListingRow, "id">): Listing {
  const images = (r.images ?? []).length ? r.images! : [FALLBACK_IMAGE];
  return {
    id: r.id,
    title: toMsg(r.title),
    description: toMsg(r.description),
    category: r.category ?? "",
    subcategory: r.subcategory ?? "",
    governorate: r.governorate ?? "",
    city: toMsg(r.city),
    price: Number(r.price ?? 0),
    unit: (r.unit ?? "piece") as SaleUnit,
    stock: Number(r.stock ?? 0),
    saleType: (r.sale_type ?? "fixe") as SaleType,
    images,
    publishedAt: r.published_at ?? "",
    seller: toSeller(r.seller ?? {}),
    featured: r.featured ?? false,
    urgent: r.urgent ?? false,
    boostedAt: (r as any).boosted_at ?? null,
    auction: toAuction(r.auction ?? null),
    status: (r.status ?? "approved") as ListingStatus,
    ownerId: r.owner_id ?? null,
    moderationNote: r.moderation_note ?? "",
  };
}

export function rowToCategory(r: CategoryRow): Category {
  return {
    slug: r.slug,
    name: toMsg(r.name),
    tagline: toMsg(r.tagline),
    image: resolveImage(r.image || FALLBACK_IMAGE),
    subcategories: r.subcategories ?? [],
    sortOrder: r.sort_order,
    isActive: r.is_active,
  };
}

export interface TokenPack { id: string; tokens: number; price: number; tag: Msg | null; sortOrder: number; isActive: boolean }
export interface Boost { id: string; name: Msg; description: Msg; cost: number; icon: string; sortOrder: number; isActive: boolean }
export interface Plan { id: string; name: Msg; price: number; features: Msg[]; highlight: boolean; sortOrder: number; isActive: boolean }

export const rowToPack = (r: TokenPackRow): TokenPack => ({
  id: r.id, tokens: r.tokens, price: Number(r.price), tag: r.tag ? toMsg(r.tag) : null, sortOrder: r.sort_order, isActive: r.is_active,
});
export const rowToBoost = (r: BoostRow): Boost => ({
  id: r.id, name: toMsg(r.name), description: toMsg(r.description), cost: r.cost, icon: r.icon, sortOrder: r.sort_order, isActive: r.is_active,
});
export const rowToPlan = (r: PlanRow): Plan => ({
  id: r.id, name: toMsg(r.name), price: Number(r.price), features: Array.isArray(r.features) ? r.features.map((f) => toMsg(f)) : [],
  highlight: r.highlight, sortOrder: r.sort_order, isActive: r.is_active,
});

/** Turn stored image refs into displayable URLs: demo keys → bundled files, uploads → signed links. */
export async function resolveListingImages(sb: SupabaseClient<Database>, listings: Listing[]): Promise<Listing[]> {
  const paths = [...new Set(listings.flatMap((l) => l.images.filter((i) => i.startsWith(STORAGE_PREFIX)).map((i) => i.slice(STORAGE_PREFIX.length))))];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data, error } = await sb.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60 * 24 * 7);
    if (error) console.error("listing photo signing failed", error.message);
    for (const d of data ?? []) if (d.path && d.signedUrl) signed.set(d.path, d.signedUrl);
  }
  return listings.map((l) => {
    const images = l.images
      .map((ref) => (ref.startsWith(STORAGE_PREFIX) ? signed.get(ref.slice(STORAGE_PREFIX.length)) ?? "" : resolveImage(ref)))
      .filter(Boolean);
    return { ...l, images: images.length ? images : [resolveImage(FALLBACK_IMAGE)] };
  });
}
