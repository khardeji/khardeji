// Public catalogue reads (listings, categories, prices) — safe for visitors and server rendering.
import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";
import {
  PUBLIC_LISTING_COLUMNS,
  resolveListingImages,
  rowToBoost,
  rowToCategory,
  rowToListing,
  rowToPack,
  rowToPlan,
} from "./catalog-map";

const DEFAULT_SUPABASE_URL = "https://pzjgadriuimximczqnfy.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_w3dlGMmx2g9u85yf4W-TAA_i7Wz6sTx";

function publicClient() {
  // Server env first; the build-time public values are a fallback so the published site keeps working.
  const url = (process.env["SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"] || DEFAULT_SUPABASE_URL) as string;
  const key = (process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || DEFAULT_SUPABASE_KEY) as string;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    // Opaque sb_ keys aren't JWTs; send only apikey, not the default Authorization bearer.
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [listings, categories] = await Promise.all([
    sb
      .from("listings")
      .select(PUBLIC_LISTING_COLUMNS)
      .eq("status", "approved")
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false }),
    sb.from("categories").select("*").eq("is_active", true).order("sort_order"),
  ]);
  if (listings.error || categories.error) {
    console.error("catalogue read failed", listings.error?.message, categories.error?.message);
    throw new Error("catalogue_unavailable");
  }
  return {
    listings: await resolveListingImages(sb, listings.data.map(rowToListing)),
    categories: categories.data.map(rowToCategory),
  };
});

/** Live home-page figures (counts only). */
export const getSiteStats = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient().rpc("site_stats");
  if (error) console.error("site stats read failed", error.message);
  const o = (data && typeof data === "object" && !Array.isArray(data) ? data : {}) as Record<string, unknown>;
  const n = (k: string) => (typeof o[k] === "number" ? (o[k] as number) : 0);
  return { listings: n("listings"), members: n("members"), auctions: n("auctions"), sales: n("sales") };
});

export const getPricing = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [packs, boosts, plans] = await Promise.all([
    sb.from("token_packs").select("*").eq("is_active", true).order("sort_order"),
    sb.from("boost_services").select("*").eq("is_active", true).order("sort_order"),
    sb.from("plans").select("*").eq("is_active", true).order("sort_order"),
  ]);
  if (packs.error || boosts.error || plans.error) {
    console.error("pricing read failed", packs.error?.message, boosts.error?.message, plans.error?.message);
    throw new Error("pricing_unavailable");
  }
  return { packs: packs.data.map(rowToPack), boosts: boosts.data.map(rowToBoost), plans: plans.data.map(rowToPlan) };
});
