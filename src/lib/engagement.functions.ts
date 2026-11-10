// Favourites and listing reports. Every call runs as the signed-in member (database rules apply).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reportProblem, type ReportProblem } from "./report-rules";

/** The tables come from khardeji-favoris-signalements.sql; until it is run they don't exist yet. */
const missingTable = (code?: string) => code === "PGRST205" || code === "42P01";

export const getMyFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("favorites").select("listing_id").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) {
      if (!missingTable(error.code)) console.error("favorites read failed", error.message);
      return [] as string[];
    }
    return data.map((r) => r.listing_id);
  });

export type FavoriteResult = { ok: true } | { ok: false; error: "not_ready" | "failed" };

export const setFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { listingId: string; on: boolean }) => ({ listingId: String(d.listingId).slice(0, 80), on: Boolean(d.on) }))
  .handler(async ({ data, context }): Promise<FavoriteResult> => {
    const { supabase, userId } = context;
    const { error } = data.on
      ? await supabase.from("favorites").upsert({ user_id: userId, listing_id: data.listingId }, { onConflict: "user_id,listing_id", ignoreDuplicates: true })
      : await supabase.from("favorites").delete().eq("user_id", userId).eq("listing_id", data.listingId);
    if (!error) return { ok: true };
    if (missingTable(error.code)) return { ok: false, error: "not_ready" };
    console.error("favorite update failed", error.message);
    return { ok: false, error: "failed" };
  });

export type ReportResult = { ok: true } | { ok: false; error: ReportProblem | "already" | "blocked" | "not_ready" | "failed" };

export const reportListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { listingId: string; reason: string; details: string }) => ({
    listingId: String(d.listingId).slice(0, 80),
    reason: String(d.reason),
    details: String(d.details ?? ""),
  }))
  .handler(async ({ data, context }): Promise<ReportResult> => {
    const { supabase, userId } = context;
    const problem = reportProblem(data);
    if (problem) return { ok: false, error: problem };
    const { data: profile } = await supabase.from("profiles").select("is_blocked").eq("id", userId).maybeSingle();
    if (profile?.is_blocked) return { ok: false, error: "blocked" };
    const { error } = await supabase
      .from("listing_reports")
      .insert({ listing_id: data.listingId, reporter_id: userId, reason: data.reason, details: data.details.trim() });
    if (!error) return { ok: true };
    if (error.code === "23505") return { ok: false, error: "already" };
    if (missingTable(error.code)) return { ok: false, error: "not_ready" };
    console.error("report insert failed", error.message);
    return { ok: false, error: "failed" };
  });
