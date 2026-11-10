// Site administration. Every function checks the caller holds the admin role before doing anything;
// database rules (admin policies) enforce the same thing a second time.
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import type { ListingStatus } from "@/data/catalog";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import type { Msg } from "@/lib/i18n";
import { resolveListingImages, rowToBoost, rowToCategory, rowToListing, rowToPack, rowToPlan, STORAGE_PREFIX } from "./catalog-map";

type Sb = SupabaseClient<Database>;

async function assertAdmin(supabase: Sb, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || data !== true) throw new Error("forbidden");
}

const admin = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]);
const adminGet = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]);

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const cleanMsg = (m: Msg): Msg => ({ ar: m.ar.trim().slice(0, 300), fr: m.fr.trim().slice(0, 300), en: m.en.trim().slice(0, 300) });

// ---------- Overview ----------
export const getAdminOverview = adminGet.handler(async ({ context }) => {
  const { supabase, userId } = context;
  await assertAdmin(supabase, userId);
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const head = { count: "exact" as const, head: true };
  const statuses: ListingStatus[] = ["pending", "approved", "rejected", "hidden", "sold"];
  const [users, blocked, auctions, categories, ...byStatus] = await Promise.all([
    count(supabase.from("profiles").select("id", head)),
    count(supabase.from("profiles").select("id", head).eq("is_blocked", true)),
    count(supabase.from("listings").select("id", head).eq("sale_type", "enchere").eq("status", "approved")),
    count(supabase.from("categories").select("slug", head)),
    ...statuses.map((s) => count(supabase.from("listings").select("id", head).eq("status", s))),
  ]);
  const listings = Object.fromEntries(statuses.map((s, i) => [s, byStatus[i] ?? 0])) as Record<ListingStatus, number>;
  const { data: recent } = await supabase.from("profiles").select("created_at").order("created_at", { ascending: false }).limit(500);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const newUsers = (recent ?? []).filter((r) => Date.parse(r.created_at) >= weekAgo).length;
  return { users, blocked, newUsers, auctions, categories, listings };
});

// ---------- Users ----------
export const listAdminUsers = adminGet.handler(async ({ context }) => {
  const { supabase, userId } = context;
  await assertAdmin(supabase, userId);
  const [profiles, roles, owners] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("listings").select("owner_id").not("owner_id", "is", null),
  ]);
  if (profiles.error) throw new Error("users_unavailable");
  const admins = new Set((roles.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
  const counts = new Map<string, number>();
  for (const o of owners.data ?? []) if (o.owner_id) counts.set(o.owner_id, (counts.get(o.owner_id) ?? 0) + 1);
  return profiles.data.map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    phone: p.phone,
    accountType: p.account_type,
    isBlocked: p.is_blocked,
    isAdmin: admins.has(p.id),
    isSelf: p.id === userId,
    listings: counts.get(p.id) ?? 0,
    createdAt: p.created_at,
  }));
});

export const setUserBlocked = admin
  .inputValidator((d: { userId: string; blocked: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.userId === userId) return { ok: false as const, error: "self" };
    const { error } = await supabase.from("profiles").update({ is_blocked: data.blocked }).eq("id", data.userId);
    if (!error && data.blocked) {
      // A blocked account's listings leave the site.
      await supabase.from("listings").update({ status: "hidden" }).eq("owner_id", data.userId).eq("status", "approved");
    }
    return error ? { ok: false as const, error: "failed" } : { ok: true as const };
  });

export const setUserAdmin = admin
  .inputValidator((d: { userId: string; admin: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.userId === userId) return { ok: false as const, error: "self" };
    const { error } = data.admin
      ? await supabase.from("user_roles").upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true })
      : await supabase.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    return error ? { ok: false as const, error: "failed" } : { ok: true as const };
  });

// ---------- Listings ----------
export const listAdminListings = adminGet.handler(async ({ context }) => {
  const { supabase, userId } = context;
  await assertAdmin(supabase, userId);
  const [rows, profiles] = await Promise.all([
    supabase.from("listings").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, email"),
  ]);
  if (rows.error) throw new Error("listings_unavailable");
  const emails = new Map((profiles.data ?? []).map((p) => [p.id, p.email]));
  const listings = await resolveListingImages(supabase, rows.data.map(rowToListing));
  return listings.map((l) => ({ ...l, ownerEmail: l.ownerId ? emails.get(l.ownerId) ?? "" : "" }));
});

export const updateAdminListing = admin
  .inputValidator(
    (d: { id: string; status?: ListingStatus | undefined; featured?: boolean | undefined; urgent?: boolean | undefined; note?: string | undefined }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const patch: Database["public"]["Tables"]["listings"]["Update"] = {};
    if (data.status) {
      patch.status = data.status;
      if (data.status === "approved") patch.published_at = new Date().toISOString().slice(0, 10);
    }
    if (data.featured !== undefined) patch.featured = data.featured;
    if (data.urgent !== undefined) patch.urgent = data.urgent;
    if (data.note !== undefined) patch.moderation_note = data.note.slice(0, 500);
    const { error } = await supabase.from("listings").update(patch).eq("id", data.id);
    return error ? { ok: false as const } : { ok: true as const };
  });

export const deleteAdminListing = admin
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: row } = await supabase.from("listings").select("images").eq("id", data.id).maybeSingle();
    const { error } = await supabase.from("listings").delete().eq("id", data.id);
    if (error) return { ok: false as const };
    const paths = (row?.images ?? []).filter((i) => i.startsWith(STORAGE_PREFIX)).map((i) => i.slice(STORAGE_PREFIX.length));
    if (paths.length) await supabase.storage.from("listing-photos").remove(paths);
    return { ok: true as const };
  });

// ---------- Categories ----------
export const listAdminCategories = adminGet.handler(async ({ context }) => {
  const { supabase, userId } = context;
  await assertAdmin(supabase, userId);
  const cats = await supabase.from("categories").select("*").order("sort_order");
  if (cats.error) throw new Error("categories_unavailable");
  return cats.data.map((c) => ({ ...rowToCategory(c), imageKey: c.image }));
});

export interface CategoryInput {
  slug: string;
  isNew: boolean;
  name: Msg;
  tagline: Msg;
  imageKey: string;
  subcategories: string[];
  sortOrder: number;
  isActive: boolean;
}

export const saveAdminCategory = admin
  .inputValidator((d: CategoryInput) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (!SLUG.test(data.slug)) return { ok: false as const, error: "slug" };
    const name = cleanMsg(data.name);
    if (!name.ar && !name.fr && !name.en) return { ok: false as const, error: "name" };
    const row = {
      slug: data.slug,
      name,
      tagline: cleanMsg(data.tagline),
      image: data.imageKey.slice(0, 200),
      subcategories: [...new Set(data.subcategories.map((s) => s.trim()).filter(Boolean))].slice(0, 40),
      sort_order: Math.round(data.sortOrder) || 0,
      is_active: data.isActive,
    };
    const { error } = data.isNew
      ? await supabase.from("categories").insert(row)
      : await supabase.from("categories").update(row).eq("slug", data.slug);
    if (error) return { ok: false as const, error: error.code === "23505" ? "exists" : "failed" };
    return { ok: true as const };
  });

export const deleteAdminCategory = admin
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("categories").delete().eq("slug", data.slug);
    if (error) return { ok: false as const, error: error.code === "23503" ? "in_use" : "failed" };
    return { ok: true as const };
  });

// ---------- Prices ----------
export const listAdminPricing = adminGet.handler(async ({ context }) => {
  const { supabase, userId } = context;
  await assertAdmin(supabase, userId);
  const [packs, boosts, plans] = await Promise.all([
    supabase.from("token_packs").select("*").order("sort_order"),
    supabase.from("boost_services").select("*").order("sort_order"),
    supabase.from("plans").select("*").order("sort_order"),
  ]);
  if (packs.error || boosts.error || plans.error) throw new Error("pricing_unavailable");
  return { packs: packs.data.map(rowToPack), boosts: boosts.data.map(rowToBoost), plans: plans.data.map(rowToPlan) };
});

export const saveTokenPack = admin
  .inputValidator((d: { id: string | null; tokens: number; price: number; tag: Msg | null; sortOrder: number; isActive: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (!(data.tokens > 0) || !(data.price >= 0)) return { ok: false as const };
    const tag = data.tag && (data.tag.ar || data.tag.fr || data.tag.en) ? cleanMsg(data.tag) : null;
    const row = { tokens: Math.round(data.tokens), price: data.price, tag, sort_order: Math.round(data.sortOrder) || 0, is_active: data.isActive };
    const { error } = data.id
      ? await supabase.from("token_packs").update(row).eq("id", data.id)
      : await supabase.from("token_packs").insert(row);
    return error ? { ok: false as const } : { ok: true as const };
  });

export const deleteTokenPack = admin
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("token_packs").delete().eq("id", data.id);
    return error ? { ok: false as const } : { ok: true as const };
  });

export const saveBoost = admin
  .inputValidator((d: { id: string; name: Msg; description: Msg; cost: number; isActive: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (!(data.cost >= 0)) return { ok: false as const };
    const { error } = await supabase
      .from("boost_services")
      .update({ name: cleanMsg(data.name), description: cleanMsg(data.description), cost: Math.round(data.cost), is_active: data.isActive })
      .eq("id", data.id);
    return error ? { ok: false as const } : { ok: true as const };
  });

export const savePlan = admin
  .inputValidator((d: { id: string; name: Msg; price: number; features: Msg[]; highlight: boolean; isActive: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (!(data.price >= 0)) return { ok: false as const };
    const features = data.features.map(cleanMsg).filter((f) => f.ar || f.fr || f.en).slice(0, 12);
    const { error } = await supabase
      .from("plans")
      .update({ name: cleanMsg(data.name), price: data.price, features: features as unknown as Json, highlight: data.highlight, is_active: data.isActive })
      .eq("id", data.id);
    return error ? { ok: false as const } : { ok: true as const };
  });

// ---------- Reports ----------
export type ReportStatus = "open" | "resolved" | "dismissed";

export const listAdminReports = adminGet.handler(async ({ context }) => {
  const { supabase, userId } = context;
  await assertAdmin(supabase, userId);
  const { data, error } = await supabase.from("listing_reports").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) {
    // Table not created yet (SQL file not run): show an explanation instead of an error.
    if (error.code === "PGRST205" || error.code === "42P01") return { ready: false as const, reports: [] };
    throw new Error("reports_unavailable");
  }
  const listingIds = [...new Set(data.map((r) => r.listing_id))];
  const reporterIds = [...new Set(data.map((r) => r.reporter_id))];
  const [listings, profiles] = await Promise.all([
    listingIds.length ? supabase.from("listings").select("id, title, status").in("id", listingIds) : Promise.resolve({ data: [] }),
    reporterIds.length ? supabase.from("profiles").select("id, email, full_name").in("id", reporterIds) : Promise.resolve({ data: [] }),
  ]);
  const listingById = new Map((listings.data ?? []).map((l) => [l.id, l]));
  const profileById = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  return {
    ready: true as const,
    reports: data.map((r) => {
      const l = listingById.get(r.listing_id);
      const p = profileById.get(r.reporter_id);
      return {
        id: r.id,
        listingId: r.listing_id,
        listingTitle: (l?.title as Msg | undefined) ?? null,
        listingStatus: (l?.status as ListingStatus | undefined) ?? null,
        reporterEmail: p?.email ?? "",
        reporterName: p?.full_name ?? "",
        reason: r.reason,
        details: r.details,
        status: r.status as ReportStatus,
        adminNote: r.admin_note,
        createdAt: r.created_at,
      };
    }),
  };
});

export const updateAdminReport = admin
  .inputValidator((d: { id: string; status: ReportStatus; note?: string | undefined }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (!["open", "resolved", "dismissed"].includes(data.status)) return { ok: false as const };
    const { error } = await supabase
      .from("listing_reports")
      .update({
        status: data.status,
        reviewed_at: data.status === "open" ? null : new Date().toISOString(),
        ...(data.note !== undefined ? { admin_note: data.note.trim().slice(0, 500) } : {}),
      })
      .eq("id", data.id);
    return error ? { ok: false as const } : { ok: true as const };
  });

export const deleteAdminReport = admin
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("listing_reports").delete().eq("id", data.id);
    return error ? { ok: false as const } : { ok: true as const };
  });
