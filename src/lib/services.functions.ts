import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Msg } from "./i18n";

const missingRelation = (code?: string) => code === "PGRST205" || code === "42P01" || code === "42703";

export interface AccountOverview {
  tokensBalance: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  accountType: string;
  fullName: string;
  phone: string;
  email: string;
  listingsCount: {
    total: number;
    approved: number;
    pending: number;
    sold: number;
  };
  messagesCount: {
    total: number;
    unread: number;
  };
}

/** Get member overview stats: tokens, subscription, listings & unread messages. */
export const getMyOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountOverview> => {
    const { supabase, userId } = context;

    // Default fallback
    const fallback: AccountOverview = {
      tokensBalance: 0,
      subscriptionPlan: "basique",
      subscriptionStatus: "active",
      subscriptionExpiresAt: null,
      accountType: "particulier",
      fullName: "",
      phone: "",
      email: "",
      listingsCount: { total: 0, approved: 0, pending: 0, sold: 0 },
      messagesCount: { total: 0, unread: 0 },
    };

    try {
      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profile) {
        fallback.fullName = (profile as any).full_name || "";
        fallback.phone = (profile as any).phone || "";
        fallback.email = (profile as any).email || "";
        fallback.accountType = (profile as any).account_type || "particulier";
        fallback.tokensBalance = Number((profile as any).tokens_balance ?? 0);
        fallback.subscriptionPlan = (profile as any).subscription_plan || "basique";
        fallback.subscriptionStatus = (profile as any).subscription_status || "active";
        fallback.subscriptionExpiresAt = (profile as any).subscription_expires_at || null;
      }

      // 2. Fetch Listings Counts
      const { data: listings } = await supabase.from("listings").select("status").eq("owner_id", userId);
      if (listings) {
        fallback.listingsCount.total = listings.length;
        fallback.listingsCount.approved = listings.filter((l) => l.status === "approved").length;
        fallback.listingsCount.pending = listings.filter((l) => l.status === "pending").length;
        fallback.listingsCount.sold = listings.filter((l) => l.status === "sold").length;
      }

      // 3. Fetch Messages Counts
      const { data: msgs, error: msgErr } = await supabase.from("messages").select("id, is_read").eq("recipient_id", userId);
      if (msgs && !msgErr) {
        fallback.messagesCount.total = msgs.length;
        fallback.messagesCount.unread = msgs.filter((m) => !m.is_read).length;
      }
    } catch (e) {
      console.warn("getMyOverview error", e);
    }

    return fallback;
  });

export interface MessageItem {
  id: string;
  listingId: string | null;
  listingTitle: Msg | null;
  senderId: string;
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  isMine: boolean;
}

/** Get user messages (incoming and outgoing). */
export const getMyMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MessageItem[]> => {
    try {
      const { supabase, userId } = context;

      const { data: rawMessages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`recipient_id.eq.${userId},sender_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error || !rawMessages) {
        if (!missingRelation(error?.code)) console.error("fetch messages failed", error?.message);
        return [];
      }

      const listingIds = [...new Set(rawMessages.map((m) => m.listing_id).filter(Boolean))] as string[];
      const userIds = [...new Set(rawMessages.map((m) => (m.sender_id === userId ? m.recipient_id : m.sender_id)))];

      const [listingsRes, profilesRes] = await Promise.all([
        listingIds.length ? supabase.from("listings").select("id, title").in("id", listingIds) : Promise.resolve({ data: [] }),
        userIds.length ? supabase.from("profiles").select("id, full_name, phone, email").in("id", userIds) : Promise.resolve({ data: [] }),
      ]);

      const listingsMap = new Map((listingsRes.data ?? []).map((l) => [l.id, l.title as Msg]));
      const profilesMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));

      return rawMessages.map((m) => {
        const otherProfile = profilesMap.get(m.sender_id === userId ? m.recipient_id : m.sender_id);
        return {
          id: m.id,
          listingId: m.listing_id,
          listingTitle: m.listing_id ? listingsMap.get(m.listing_id) ?? null : null,
          senderId: m.sender_id,
          senderName: otherProfile?.full_name || (m.sender_id === userId ? "Moi" : "Visiteur"),
          senderPhone: m.sender_phone || otherProfile?.phone || "",
          senderEmail: m.sender_email || otherProfile?.email || "",
          recipientId: m.recipient_id,
          content: m.content,
          isRead: m.is_read,
          createdAt: m.created_at,
          isMine: m.sender_id === userId,
        };
      });
    } catch (e) {
      console.warn("getMyMessages error", e);
      return [];
    }
  });

/** Mark a message as read. */
export const markMessageRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messageId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("messages").update({ is_read: true }).eq("id", data.messageId).eq("recipient_id", userId);
    return { ok: !error };
  });

export type SendMessageResult = { ok: true } | { ok: false; error: "empty" | "self" | "not_found" | "not_ready" | "failed" };

/** Send a message to a seller regarding a listing. */
export const sendMessageToSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { listingId: string; content: string; phone?: string }) => ({
    listingId: String(d.listingId),
    content: String(d.content).trim().slice(0, 2000),
    phone: String(d.phone ?? "").trim().slice(0, 30),
  }))
  .handler(async ({ data, context }): Promise<SendMessageResult> => {
    const { supabase, userId } = context;
    if (!data.content) return { ok: false, error: "empty" };

    const { data: listing, error: listErr } = await supabase.from("listings").select("owner_id").eq("id", data.listingId).maybeSingle();
    if (listErr || !listing) return { ok: false, error: "not_found" };
    if (!listing.owner_id || listing.owner_id === userId) return { ok: false, error: "self" };

    const { data: profile } = await supabase.from("profiles").select("email, phone").eq("id", userId).maybeSingle();

    const { error } = await supabase.from("messages").insert({
      listing_id: data.listingId,
      sender_id: userId,
      recipient_id: listing.owner_id,
      content: data.content,
      sender_phone: data.phone || profile?.phone || "",
      sender_email: profile?.email || "",
      is_read: false,
    });

    if (!error) return { ok: true };
    if (missingRelation(error.code)) return { ok: false, error: "not_ready" };
    console.error("send message error", error.message);
    return { ok: false, error: "failed" };
  });

export const BOOST_COSTS: Record<string, number> = {
  remonter: 2,
  urgent: 3,
  "premium-7j": 8,
  "a-la-une": 15,
};

export type BoostResult = { ok: true; newBalance: number } | { ok: false; error: "not_owner" | "insufficient_tokens" | "not_ready" | "failed" };

/** Apply a boost service to an approved listing using tokens. */
export const applyBoost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { listingId: string; boostId: "remonter" | "urgent" | "premium-7j" | "a-la-une" }) => d)
  .handler(async ({ data, context }): Promise<BoostResult> => {
    const { supabase, userId } = context;
    const cost = BOOST_COSTS[data.boostId];
    if (!cost) return { ok: false, error: "failed" };

    // 1. Check user token balance
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("tokens_balance")
      .eq("id", userId)
      .maybeSingle();

    if (profErr && missingRelation(profErr.code)) return { ok: false, error: "not_ready" };
    const currentTokens = (profile as any)?.tokens_balance ?? 0;
    if (currentTokens < cost) return { ok: false, error: "insufficient_tokens" };

    // 2. Check listing ownership
    const { data: listing, error: listErr } = await supabase
      .from("listings")
      .select("id, owner_id, status")
      .eq("id", data.listingId)
      .maybeSingle();

    if (listErr || !listing || listing.owner_id !== userId) return { ok: false, error: "not_owner" };

    // 3. Deduct tokens
    const newBalance = currentTokens - cost;
    const { error: updateProfErr } = await supabase
      .from("profiles")
      .update({ tokens_balance: newBalance } as any)
      .eq("id", userId);

    if (updateProfErr) {
      if (missingRelation(updateProfErr.code)) return { ok: false, error: "not_ready" };
      return { ok: false, error: "failed" };
    }

    // 4. Apply boost to listing
    const patch: any = { boosted_at: new Date().toISOString() };
    if (data.boostId === "remonter") {
      patch.published_at = new Date().toISOString().slice(0, 10);
      patch.created_at = new Date().toISOString();
    } else if (data.boostId === "urgent") {
      patch.urgent = true;
    } else if (data.boostId === "premium-7j" || data.boostId === "a-la-une") {
      patch.featured = true;
    }

    await supabase.from("listings").update(patch).eq("id", data.listingId);

    // 5. Log in listing_boosts (best effort)
    await supabase.from("listing_boosts").insert({
      listing_id: data.listingId,
      user_id: userId,
      boost_id: data.boostId,
      cost,
    } as any);

    return { ok: true, newBalance };
  });

export type RequestOrderResult = { ok: true } | { ok: false; error: "not_ready" | "failed" };

/** Request an account plan subscription or renewal. */
export const requestSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: "pro" | "entreprise"; isRenewal?: boolean; notes?: string }) => d)
  .handler(async ({ data, context }): Promise<RequestOrderResult> => {
    try {
      const { supabase, userId } = context;
      const amount = data.planId === "pro" ? 49 : 149;
      const type = data.isRenewal ? "renewal" : "subscription";

      const { error } = await supabase.from("subscription_requests").insert({
        user_id: userId,
        type,
        plan_id: data.planId,
        amount,
        notes: data.notes?.trim() || "",
        status: "pending",
      } as any);

      if (!error) return { ok: true };
      if (missingRelation(error.code)) return { ok: false, error: "not_ready" };
      console.error("request subscription failed", error.message);
      return { ok: false, error: "failed" };
    } catch (e) {
      console.error("requestSubscription exception", e);
      return { ok: false, error: "failed" };
    }
  });

/** Request a token pack purchase. */
export const buyTokenPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { packId: string; tokensCount: number; amount: number; notes?: string }) => d)
  .handler(async ({ data, context }): Promise<RequestOrderResult> => {
    try {
      const { supabase, userId } = context;

      const { error } = await supabase.from("subscription_requests").insert({
        user_id: userId,
        type: "token_pack",
        pack_id: data.packId,
        tokens_count: data.tokensCount,
        amount: data.amount,
        notes: data.notes?.trim() || "",
        status: "pending",
      } as any);

      if (!error) return { ok: true };
      if (missingRelation(error.code)) return { ok: false, error: "not_ready" };
      console.error("buy token pack failed", error.message);
      return { ok: false, error: "failed" };
    } catch (e) {
      console.error("buyTokenPack exception", e);
      return { ok: false, error: "failed" };
    }
  });

export interface UserRequestItem {
  id: string;
  type: "subscription" | "renewal" | "token_pack";
  planId: string | null;
  packId: string | null;
  tokensCount: number;
  amount: number;
  status: "pending" | "approved" | "rejected";
  notes: string;
  adminNotes: string;
  createdAt: string;
}

/** Get member's pending and completed requests. */
export const getMyRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserRequestItem[]> => {
    try {
      const { supabase, userId } = context;
      const { data, error } = await supabase
        .from("subscription_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data.map((r: any) => ({
        id: String(r.id),
        type: r.type,
        planId: r.plan_id ?? null,
        packId: r.pack_id ?? null,
        tokensCount: Number(r.tokens_count ?? 0),
        amount: Number(r.amount ?? 0),
        status: r.status,
        notes: String(r.notes ?? ""),
        adminNotes: String(r.admin_notes ?? ""),
        createdAt: String(r.created_at ?? ""),
      }));
    } catch (e) {
      console.warn("getMyRequests error", e);
      return [];
    }
  });

export interface UserBoostItem {
  id: string;
  listingId: string;
  listingTitle: Msg;
  boostId: string;
  cost: number;
  createdAt: string;
}

/** Get member's boost history. */
export const getMyBoosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserBoostItem[]> => {
    try {
      const { supabase, userId } = context;
      const { data, error } = await supabase
        .from("listing_boosts")
        .select("id, listing_id, boost_id, cost, created_at, listings(id, title)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !data) return [];
      return data.map((b: any) => ({
        id: String(b.id),
        listingId: String(b.listing_id),
        listingTitle: b.listings?.title ?? { ar: "إعلان", fr: "Annonce", en: "Listing" },
        boostId: String(b.boost_id),
        cost: Number(b.cost ?? 0),
        createdAt: String(b.created_at ?? ""),
      }));
    } catch (e) {
      console.warn("getMyBoosts error", e);
      return [];
    }
  });

