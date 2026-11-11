import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { type ActiveBoost, type BoostType, BOOST_DURATIONS } from "@/data/catalog";
import type { Msg } from "./i18n";

const missingRelation = (code?: string) => code === "PGRST205" || code === "42P01" || code === "42703";

const DEFAULT_SUPABASE_URL = "https://pzjgadriuimximczqnfy.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_w3dlGMmx2g9u85yf4W-TAA_i7Wz6sTx";

function getPublicSupabase(token?: string | null) {
  const url = (
    process.env["SUPABASE_URL"] ||
    import.meta.env?.["VITE_SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"] ||
    DEFAULT_SUPABASE_URL
  ) as string;
  const key = (
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    import.meta.env?.["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_ANON_KEY"] ||
    DEFAULT_SUPABASE_KEY
  ) as string;
  return createClient<Database>(url, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (input, init) => {
        const h = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined
        );
        if (init?.headers) {
          new Headers(init.headers).forEach((v, k) => h.set(k, v));
        }
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        if (token) {
          h.set("Authorization", `Bearer ${token}`);
        }
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

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
      const { data: listings } = await supabase.from("listings").select("status, moderation_note").eq("owner_id", userId);
      if (listings) {
        const kept = listings.filter((l) => (l as { moderation_note?: string }).moderation_note !== "owner_deleted");
        // Total is every post the account has published, including ones later deleted.
        fallback.listingsCount.total = listings.length;
        fallback.listingsCount.approved = kept.filter((l) => l.status === "approved").length;
        fallback.listingsCount.pending = kept.filter((l) => l.status === "pending").length;
        fallback.listingsCount.sold = kept.filter((l) => l.status === "sold").length;
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

      const hiddenIds = await hiddenMessageIds(supabase, userId, rawMessages.map((m) => m.id));
      const visibleMessages = hiddenIds.size
        ? rawMessages.filter((m) => !hiddenIds.has(m.id))
        : rawMessages;

      const listingIds = [...new Set(visibleMessages.map((m) => m.listing_id).filter(Boolean))] as string[];
      const userIds = [...new Set(visibleMessages.map((m) => (m.sender_id === userId ? m.recipient_id : m.sender_id)).filter(Boolean))] as string[];

      const [listingsRes, profilesRes, rolesRes] = await Promise.all([
        listingIds.length ? supabase.from("listings").select("id, title").in("id", listingIds) : Promise.resolve({ data: [] }),
        userIds.length ? supabase.from("profiles").select("id, full_name, phone, email").in("id", userIds) : Promise.resolve({ data: [] }),
        userIds.length ? supabase.from("user_roles").select("user_id, role").in("user_id", userIds).eq("role", "admin") : Promise.resolve({ data: [] }),
      ]);

      const listingsMap = new Map((listingsRes.data ?? []).map((l) => [l.id, l.title as Msg]));
      const profilesMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
      const adminSet = new Set((rolesRes.data ?? []).map((r) => r.user_id));

      return visibleMessages.map((m) => {
        const otherUserId = m.sender_id === userId ? m.recipient_id : m.sender_id;
        const otherProfile = otherUserId ? profilesMap.get(otherUserId) : null;
        const otherIsAdmin = otherUserId ? adminSet.has(otherUserId) : false;
        const customName = (m as any).sender_name;

        let displayName = customName;
        if (m.sender_id === userId) {
          displayName = "Moi";
        } else if (otherIsAdmin) {
          displayName = "Administrateur" + (otherProfile?.full_name ? ` (${otherProfile.full_name})` : "");
        } else if (otherProfile?.full_name) {
          // Dynamic profile name (if user changed name/profile to "charika", stay up to date!)
          displayName = otherProfile.full_name;
        } else if (!displayName || displayName === "Visiteur") {
          displayName = otherProfile?.email ? otherProfile.email.split("@")[0] : (m.sender_id ? "Membre" : "Visiteur");
        }

        return {
          id: m.id,
          listingId: m.listing_id,
          listingTitle: m.listing_id ? listingsMap.get(m.listing_id) ?? null : null,
          senderId: m.sender_id,
          senderName: displayName,
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

/** Send a message to a seller regarding a listing (supports both members and visitors). */
export const sendMessageToSeller = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      listingId: string;
      content: string;
      phone?: string;
      email?: string;
      name?: string;
    }) => ({
      listingId: String(d.listingId),
      content: String(d.content).trim().slice(0, 2000),
      phone: String(d.phone ?? "").trim().slice(0, 30),
      email: String(d.email ?? "").trim().slice(0, 100),
      name: String(d.name ?? "").trim().slice(0, 120),
    })
  )
  .handler(async ({ data }): Promise<SendMessageResult> => {
    if (!data.content) return { ok: false, error: "empty" };

    // Extract Bearer token if user is signed in
    let token: string | null = null;
    try {
      const request = getRequest();
      const authHeader = request?.headers?.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.replace("Bearer ", "");
      }
    } catch {
      // Unauthenticated visitor
    }

    const sb = getPublicSupabase(token);

    let userId: string | null = null;
    let userProfile: { email?: string; phone?: string; full_name?: string } | null = null;
    let isAdmin = false;

    if (token) {
      let sub: string | null = null;
      try {
        const claims = await sb.auth.getClaims(token);
        sub = claims?.data?.claims?.sub ?? null;
      } catch {}
      if (!sub) {
        try {
          const u = await sb.auth.getUser(token);
          sub = u?.data?.user?.id ?? null;
        } catch {}
      }
      if (sub) {
        userId = sub;
        const [profRes, roleRes] = await Promise.all([
          sb.from("profiles").select("email, phone, full_name").eq("id", userId).maybeSingle(),
          sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
        ]);
        userProfile = profRes.data;
        isAdmin = !!roleRes.data;
      }
    }

    const { data: listing, error: listErr } = await sb
      .from("listings")
      .select("owner_id")
      .eq("id", data.listingId)
      .maybeSingle();

    if (listErr || !listing || !listing.owner_id) return { ok: false, error: "not_found" };
    if (userId && listing.owner_id === userId) return { ok: false, error: "self" };

    let senderName = data.name;
    if (isAdmin) {
      senderName = "Administrateur" + (userProfile?.full_name ? ` (${userProfile.full_name})` : "");
    } else if (!senderName || senderName === "Visiteur") {
      senderName = userProfile?.full_name || (userProfile?.email ? userProfile.email.split("@")[0] : (userId ? "Membre" : "Visiteur"));
    }
    const senderPhone = data.phone || userProfile?.phone || "";
    const senderEmail = data.email || userProfile?.email || "";

    const payload: any = {
      listing_id: data.listingId,
      sender_id: userId,
      recipient_id: listing.owner_id,
      sender_name: senderName,
      sender_phone: senderPhone,
      sender_email: senderEmail,
      content: data.content,
      is_read: false,
    };

    let { error } = await sb.from("messages").insert(payload);

    // Fallback if sender_name column does not exist yet in database
    if (error && (error.message?.includes("sender_name") || error.code === "42703" || error.code === "PGRST204")) {
      delete payload.sender_name;
      const retry = await sb.from("messages").insert(payload);
      error = retry.error;
    }

    if (!error) return { ok: true };
    if (missingRelation(error.code)) return { ok: false, error: "not_ready" };
    console.error("send message error:", error.code, error.message);
    return { ok: false, error: "failed" };
  });

/** Reply to a discussion thread as the seller/member. */
export const replyToConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      listingId: string;
      recipientId?: string | null;
      content: string;
      recipientPhone?: string;
      recipientEmail?: string;
    }) => ({
      listingId: String(d.listingId),
      recipientId: d.recipientId ? String(d.recipientId) : null,
      content: String(d.content).trim().slice(0, 2000),
      recipientPhone: String(d.recipientPhone ?? "").trim().slice(0, 30),
      recipientEmail: String(d.recipientEmail ?? "").trim().slice(0, 100),
    })
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.content) return { ok: false as const, error: "empty" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, email")
      .eq("id", userId)
      .maybeSingle();

    const targetRecipient = data.recipientId && data.recipientId !== userId ? data.recipientId : userId;

    const replyPayload: any = {
      listing_id: data.listingId || null,
      sender_id: userId,
      recipient_id: targetRecipient,
      sender_name: profile?.full_name || "Vendeur",
      sender_phone: data.recipientPhone || profile?.phone || "",
      sender_email: data.recipientEmail || profile?.email || "",
      content: data.content,
      is_read: false,
    };

    let { error } = await supabase.from("messages").insert(replyPayload);

    if (error && (error.message?.includes("sender_name") || error.code === "42703" || error.code === "PGRST204")) {
      delete replyPayload.sender_name;
      const retry = await supabase.from("messages").insert(replyPayload);
      error = retry.error;
    }

    if (error) {
      console.error("replyToConversation error:", error.message);
      return { ok: false as const, error: "failed" };
    }
    return { ok: true as const };
  });

const PURCHASE_KINDS = new Set(["quantity_request", "offer"]);

function isPurchaseRecord(content: string | null | undefined): boolean {
  const text = String(content ?? "").trim();
  if (!text.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(text) as { __kind?: unknown };
    return typeof parsed.__kind === "string" && PURCHASE_KINDS.has(parsed.__kind);
  } catch {
    return false;
  }
}

async function hiddenMessageIds(
  supabase: { from: (table: string) => any },
  userId: string,
  messageIds: string[],
): Promise<Set<string>> {
  if (!messageIds.length) return new Set();
  const { data, error } = await supabase
    .from("message_hidden")
    .select("message_id")
    .eq("user_id", userId)
    .in("message_id", messageIds);
  if (error) return new Set();
  return new Set((data ?? []).map((row: { message_id: string }) => row.message_id));
}

/**
 * Remove a conversation from this account only.
 * Purchase and offer payloads stay in the database so both histories keep the sale.
 */
export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messageIds: string[] }) => ({
    messageIds: Array.isArray(d.messageIds) ? d.messageIds.map(String).filter(Boolean) : [],
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.messageIds.length) return { ok: false as const, error: "empty" };

    const { data: rows, error: readError } = await supabase
      .from("messages")
      .select("id, content, sender_id, recipient_id")
      .in("id", data.messageIds);

    if (readError || !rows) {
      console.error("deleteConversation read error:", readError?.message);
      return { ok: false as const, error: "failed" };
    }

    const mine = rows.filter((m) => m.sender_id === userId || m.recipient_id === userId);
    if (!mine.length) return { ok: false as const, error: "failed" };

    const purchaseIds = new Set(mine.filter((m) => isPurchaseRecord(m.content)).map((m) => m.id));
    const chatIds = mine.filter((m) => !purchaseIds.has(m.id)).map((m) => m.id);

    const { error: hideError } = await supabase.from("message_hidden").upsert(
      mine.map((m) => ({ user_id: userId, message_id: m.id })),
      { onConflict: "user_id,message_id" },
    );

    if (!hideError) return { ok: true as const };

    if (!missingRelation(hideError.code)) {
      console.error("deleteConversation hide error:", hideError.message);
    }

    // Table not applied yet: drop chat text only. Never delete the order/offer row.
    if (chatIds.length) {
      const { error } = await supabase.from("messages").delete().in("id", chatIds);
      if (error) {
        console.error("deleteConversation error:", error.message);
        return { ok: false as const, error: "failed" };
      }
    }
    return { ok: true as const };
  });

export const BOOST_COSTS: Record<string, number> = {
  remonter: 2,
  urgent: 3,
  "premium-7j": 8,
  "a-la-une": 15,
};

export type BoostResult =
  | { ok: true; newBalance: number; activeBoost: ActiveBoost }
  | { ok: false; error: "not_owner" | "insufficient_tokens" | "already_boosted" | "not_ready" | "failed"; message?: string; activeBoost?: ActiveBoost };

/** Apply a boost service to an approved listing using tokens. Enforces 1 active boost per listing. */
export const applyBoost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { listingId: string; boostId: BoostType; replace?: boolean }) => d)
  .handler(async ({ data, context }): Promise<BoostResult> => {
    const { supabase, userId } = context;
    const cost = BOOST_COSTS[data.boostId];
    if (!cost) return { ok: false, error: "failed", message: "Type de boost invalide." };

    // 1. Check user token balance
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("tokens_balance")
      .eq("id", userId)
      .maybeSingle();

    if (profErr && missingRelation(profErr.code)) return { ok: false, error: "not_ready" };
    const currentTokens = (profile as any)?.tokens_balance ?? 0;
    if (currentTokens < cost) return { ok: false, error: "insufficient_tokens", message: "Solde de jetons insuffisant." };

    // 2. Check listing ownership & existing active boost
    const { data: listing, error: listErr } = await supabase
      .from("listings")
      .select("id, owner_id, status, seller, urgent, featured, published_at")
      .eq("id", data.listingId)
      .maybeSingle();

    if (listErr || !listing || listing.owner_id !== userId) {
      return { ok: false, error: "not_owner", message: "Vous n'êtes pas le propriétaire de cette annonce." };
    }

    // Check if there is an active boost already
    const sellerObj = (listing.seller && typeof listing.seller === "object" ? listing.seller : {}) as any;
    const existingBoost = sellerObj.activeBoost as ActiveBoost | undefined;
    if (existingBoost && existingBoost.expiresAt && new Date(existingBoost.expiresAt).getTime() > Date.now()) {
      if (!data.replace) {
        return {
          ok: false,
          error: "already_boosted",
          message: "Cette annonce a déjà un boost actif. Vous pouvez le retirer ou choisir de re-booster pour le remplacer.",
          activeBoost: existingBoost,
        };
      }
      // Re-boosting: previous tokens are NOT refunded!
    }

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

    // 4. Calculate new duration & expiration
    const appliedAt = new Date().toISOString();
    const durationHours = BOOST_DURATIONS[data.boostId].hours;
    const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();

    const newActiveBoost: ActiveBoost = {
      boostId: data.boostId,
      appliedAt,
      expiresAt,
      cost,
    };

    const updatedSeller = {
      ...sellerObj,
      activeBoost: newActiveBoost,
    };

    const patch: any = {
      seller: updatedSeller,
      boosted_at: appliedAt,
    };

    if (data.boostId === "remonter") {
      patch.published_at = appliedAt.slice(0, 10);
      patch.created_at = appliedAt;
      patch.urgent = false;
      patch.featured = false;
    } else if (data.boostId === "urgent") {
      patch.urgent = true;
      patch.featured = false;
    } else if (data.boostId === "premium-7j" || data.boostId === "a-la-une") {
      patch.featured = true;
      patch.urgent = false;
    }

    await supabase.from("listings").update(patch).eq("id", data.listingId);

    // 5. Log in listing_boosts (best effort)
    await supabase.from("listing_boosts").insert({
      listing_id: data.listingId,
      user_id: userId,
      boost_id: data.boostId,
      cost,
      created_at: appliedAt,
    } as any);

    return { ok: true, newBalance, activeBoost: newActiveBoost };
  });

/** Remove an active boost from a listing. Note: tokens are NOT refunded when removed. */
export const removeBoost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { listingId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: listing, error: listErr } = await supabase
      .from("listings")
      .select("id, owner_id, seller, urgent, featured")
      .eq("id", data.listingId)
      .maybeSingle();

    if (listErr || !listing || listing.owner_id !== userId) {
      return { ok: false as const, error: "not_owner" as const, message: "Action non autorisée." };
    }

    const sellerObj = (listing.seller && typeof listing.seller === "object" ? listing.seller : {}) as any;
    const updatedSeller = {
      ...sellerObj,
      activeBoost: null,
    };

    // Remove boost: tokens are NOT refunded!
    await supabase
      .from("listings")
      .update({
        seller: updatedSeller,
        urgent: false,
        featured: false,
      })
      .eq("id", data.listingId);

    return {
      ok: true as const,
      message: "Le boost a été retiré. Vous pouvez désormais appliquer un nouveau boost.",
    };
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

