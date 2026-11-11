// Member actions on their own listings. Every call runs as the signed-in user (database rules apply).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { resolveListingImages, rowToListing, STORAGE_PREFIX } from "./catalog-map";
import { listingProblems, type ListingInput, type ListingProblem } from "./listing-rules";

export type CreateListingResult = { ok: true; id: string } | { ok: false; error: ListingProblem | "blocked" | "failed" };

export const createListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListingInput) => d)
  .handler(async ({ data, context }): Promise<CreateListingResult> => {
    const { supabase, userId } = context;
    const problems = listingProblems(data);
    if (problems.length) return { ok: false, error: problems[0]! };
    if (data.photos.some((p) => !p.startsWith(`${userId}/`))) return { ok: false, error: "photos" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, account_type, is_blocked, created_at, tokens_balance")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.is_blocked) return { ok: false, error: "blocked" };

    let tokenCost = 0;
    if (data.urgent) tokenCost += 3;
    if (data.featured) tokenCost += 15;

    if (tokenCost > 0) {
      const balance = (profile as any)?.tokens_balance ?? 0;
      if (balance < tokenCost) {
        return { ok: false, error: "insufficient_tokens" };
      }
      await supabase
        .from("profiles")
        .update({ tokens_balance: balance - tokenCost } as any)
        .eq("id", userId);
    }

    const { data: cat } = await supabase.from("categories").select("subcategories").eq("slug", data.category).eq("is_active", true).maybeSingle();
    if (!cat || !cat.subcategories.includes(data.subcategory)) return { ok: false, error: "category" };

    const same = (s: string) => ({ ar: s.trim(), fr: s.trim(), en: s.trim() });
    const auction = data.saleType === "enchere";
    const { data: row, error } = await supabase
      .from("listings")
      .insert({
        owner_id: userId,
        title: same(data.title),
        description: same(data.description.slice(0, 4000)),
        category: data.category,
        subcategory: data.subcategory,
        governorate: data.governorate,
        city: same(data.city.slice(0, 80)),
        price: auction ? data.startPrice : data.price,
        unit: data.unit,
        stock: data.unit === "libre" ? 0 : data.stock,
        sale_type: data.saleType,
        images: data.photos.map((p) => STORAGE_PREFIX + p),
        urgent: Boolean(data.urgent),
        featured: Boolean(data.featured),
        seller: {
          name: profile?.full_name || "—",
          kind: profile?.account_type ?? "particulier",
          verified: false,
          memberSince: (profile?.created_at ?? new Date().toISOString()).slice(0, 4),
          phone: profile?.phone ?? "",
        },
        auction: auction
          ? ({
              startPrice: data.startPrice,
              increment: data.increment,
              startsAt: new Date(data.startAt).toISOString(),
              endsAt: new Date(data.endAt).toISOString(),
              bids: [],
            } as Json)
          : null,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !row) {
      console.error("listing insert failed", error?.message);
      return { ok: false, error: "failed" };
    }
    if (auction && data.reservePrice && data.reservePrice > 0) {
      await supabase.from("listing_private").insert({ listing_id: row.id, owner_id: userId, reserve_price: data.reservePrice });
    }
    return { ok: true, id: row.id };
  });

export const getMyListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("listings").select("*").eq("owner_id", userId).order("created_at", { ascending: false });
    if (error) throw new Error("my_listings_unavailable");
    return resolveListingImages(supabase, data.map(rowToListing));
  });

export const deleteMyListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase.from("listings").select("images").eq("id", data.id).eq("owner_id", userId).maybeSingle();
    if (!row) return { ok: false as const };
    const { error } = await supabase.from("listings").delete().eq("id", data.id).eq("owner_id", userId);
    if (error) return { ok: false as const };
    const paths = row.images.filter((i) => i.startsWith(STORAGE_PREFIX)).map((i) => i.slice(STORAGE_PREFIX.length));
    if (paths.length) await supabase.storage.from("listing-photos").remove(paths);
    return { ok: true as const };
  });

/** Mark a listing as sold so it immediately disappears from public view. */
export const markListingSold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error: fetchErr } = await supabase
      .from("listings")
      .select("id, owner_id")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchErr || !row) return { ok: false, error: "not_found" } as const;
    if (row.owner_id !== userId) return { ok: false, error: "not_owner" } as const;

    const { error } = await supabase
      .from("listings")
      .update({ status: "sold" } as any)
      .eq("id", data.id)
      .eq("owner_id", userId);

    if (error) {
      console.error("markListingSold failed", error.message);
      return { ok: false, error: "failed" } as const;
    }
    return { ok: true } as const;
  });

/**
 * Update listing details.
 * Setting status to 'pending' ensures the modified listing undergoes
 * admin re-moderation before going live again.
 */
export const updateMyListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      title: string;
      description: string;
      category: string;
      subcategory: string;
      governorate: string;
      city: string;
      price: number;
      unit: string;
      stock: number;
    }) => d
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error: fetchErr } = await supabase
      .from("listings")
      .select("id, owner_id")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchErr || !row) return { ok: false, error: "not_found" } as const;
    if (row.owner_id !== userId) return { ok: false, error: "not_owner" } as const;

    const same = (s: string) => ({ ar: s.trim(), fr: s.trim(), en: s.trim() });

    const { error } = await supabase
      .from("listings")
      .update({
        title: same(data.title),
        description: same(data.description.slice(0, 4000)),
        category: data.category,
        subcategory: data.subcategory,
        governorate: data.governorate,
        city: same(data.city.slice(0, 80)),
        price: data.price,
        unit: data.unit as any,
        stock: data.unit === "libre" ? 0 : data.stock,
        status: "pending", // Re-moderation required by admin
        moderation_note: "Modification soumise par le vendeur — en attente de validation admin",
      } as any)
      .eq("id", data.id)
      .eq("owner_id", userId);

    if (error) {
      console.error("updateMyListing failed", error.message);
      return { ok: false, error: "failed" } as const;
    }
    return { ok: true } as const;
  });
