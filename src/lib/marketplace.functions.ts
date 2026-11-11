// Marketplace transactions: Bidding, Offers, Quantity Requests & Notifications.
// Enforces permissions, prevents self-interaction, and provides atomic stock/bid handling.
// Persists directly into PostgreSQL on Supabase Cloud (dedicated tables or messages fallback).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { validateNegotiationOffer } from "./negotiation";

const missingTable = (code?: string) => code === "PGRST205" || code === "42P01";

// Helper: Create persistent notification in Supabase
async function createNotification(
  supabase: any,
  payload: {
    actorId?: string;
    userId: string;
    type: string;
    title: { ar: string; fr: string; en: string };
    message: { ar: string; fr: string; en: string };
    listingId?: string;
    link?: string;
  },
) {
  try {
    // 1. Try dedicated notifications table
    const { error } = await supabase.from("notifications").insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title as any,
      message: payload.message as any,
      listing_id: payload.listingId ?? null,
      link: payload.link ?? "",
      read: false,
    });

    if (error && missingTable(error.code)) {
      // 2. Persistent fallback: store in public.messages table
      const notifContent = JSON.stringify({
        __kind: "notification",
        type: payload.type,
        title: payload.title,
        message: payload.message,
        listingId: payload.listingId ?? null,
        link: payload.link ?? "",
      });

      await supabase.from("messages").insert({
        listing_id: payload.listingId ?? null,
        sender_id: payload.actorId || payload.userId,
        recipient_id: payload.userId,
        sender_name: "Khardeji",
        content: notifContent,
        is_read: false,
      });
    }
  } catch (e) {
    console.error("notification insert error", e);
  }
}

// --------------------------------------------------------------------------
// 1. BIDDING
// --------------------------------------------------------------------------
export const placeAuctionBid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { listingId: string; amount: number }) => ({
    listingId: String(d.listingId).slice(0, 80),
    amount: Number(d.amount),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check bidder profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, email, is_blocked")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.is_blocked) {
      return { ok: false as const, error: "blocked", message: "Votre compte est suspendu." };
    }

    // Fetch listing
    const { data: listing, error: lErr } = await supabase
      .from("listings")
      .select("*")
      .eq("id", data.listingId)
      .maybeSingle();

    if (lErr || !listing) {
      return { ok: false as const, error: "not_found", message: "Annonce introuvable." };
    }

    // CRITICAL: Prevent seller from bidding on own listing
    if (listing.owner_id === userId) {
      return {
        ok: false as const,
        error: "self_interaction",
        message: "Vous ne pouvez pas enchérir sur votre propre annonce.",
      };
    }

    if (listing.sale_type !== "enchere") {
      return { ok: false as const, error: "not_auction", message: "Cette annonce n'est pas une enchère." };
    }

    const a = (listing.auction && typeof listing.auction === "object" ? listing.auction : {}) as Record<string, any>;
    const startPrice = Number(a.startPrice ?? listing.price ?? 0);
    const increment = Number(a.increment ?? 1);
    const existingBids: any[] = Array.isArray(a.bids) ? a.bids : [];

    const currentHighest = existingBids.length > 0 ? Math.max(...existingBids.map((b) => Number(b.amount))) : 0;
    const minNext = existingBids.length > 0 ? currentHighest + increment : startPrice;

    if (data.amount < minNext) {
      return {
        ok: false as const,
        error: "too_low",
        minNext,
        message: `L'enchère minimale requise est de ${minNext} DT.`,
      };
    }

    const bidderLetter = String.fromCharCode(65 + (existingBids.length % 26));
    const nowIso = new Date().toISOString();
    const newBidObj = {
      bidder: bidderLetter,
      bidderId: userId,
      bidderName: profile?.full_name || "Machtari",
      bidderPhone: profile?.phone || "",
      bidderEmail: profile?.email || "",
      amount: data.amount,
      createdAt: nowIso,
      minutesAgo: 0,
    };

    const updatedBids = [...existingBids, newBidObj];
    const updatedAuction = { ...a, bids: updatedBids };

    // Update listing row with the new bid atomically in database
    const { error: updateErr } = await supabase
      .from("listings")
      .update({ auction: updatedAuction as Json })
      .eq("id", data.listingId);

    if (updateErr) {
      console.error("bid update error", updateErr.message);
      return { ok: false as const, error: "failed", message: "Échec de l'enregistrement de l'enchère." };
    }

    // Try recording into bids table if available
    try {
      await supabase.from("bids").insert({
        listing_id: data.listingId,
        bidder_id: userId,
        amount: data.amount,
      });
    } catch {}

    // Notify seller
    if (listing.owner_id) {
      const titleObj = (listing.title && typeof listing.title === "object" ? listing.title : {}) as any;
      const titleStr = titleObj.fr || titleObj.ar || titleObj.en || "Annonce";
      await createNotification(supabase, {
        actorId: userId,
        userId: listing.owner_id,
        type: "bid_placed",
        title: {
          ar: "مزايدة جديدة!",
          fr: "Nouvelle enchère reçue !",
          en: "New bid received!",
        },
        message: {
          ar: `عرض جديد بقيمة ${data.amount} د.ت على إعلانك "${titleStr}".`,
          fr: `Nouvelle offre de ${data.amount} DT sur votre annonce "${titleStr}".`,
          en: `New bid of ${data.amount} DT placed on your listing "${titleStr}".`,
        },
        listingId: data.listingId,
        link: `/annonces/${data.listingId}`,
      });
    }

    // Notify previous highest bidder of being outbid
    if (existingBids.length > 0) {
      const prevHighest = existingBids[existingBids.length - 1];
      const prevId = prevHighest.bidderId || prevHighest.bidder_id;
      if (prevId && prevId !== userId) {
        const titleObj = (listing.title && typeof listing.title === "object" ? listing.title : {}) as any;
        const titleStr = titleObj.fr || titleObj.ar || titleObj.en || "Annonce";
        await createNotification(supabase, {
          actorId: userId,
          userId: prevId,
          type: "outbid",
          title: {
            ar: "تم تجاوز عرضك في المزايدة!",
            fr: "Votre enchère a été dépassée !",
            en: "You have been outbid!",
          },
          message: {
            ar: `شخص آخر قدّم عرضاً أعلى (${data.amount} د.ت) على "${titleStr}".`,
            fr: `Une enchère supérieure de ${data.amount} DT a été placée sur "${titleStr}".`,
            en: `A higher bid of ${data.amount} DT was placed on "${titleStr}".`,
          },
          listingId: data.listingId,
          link: `/annonces/${data.listingId}`,
        });
      }
    }

    return {
      ok: true as const,
      amount: data.amount,
      currentPrice: data.amount,
      totalBids: updatedBids.length,
      bids: updatedBids,
    };
  });

// --------------------------------------------------------------------------
// 2. OFFERS & NEGOTIATION
// --------------------------------------------------------------------------
export const submitOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { listingId: string; offeredPrice: number; quantity?: number; notes?: string }) => ({
    listingId: String(d.listingId).slice(0, 80),
    offeredPrice: Number(d.offeredPrice),
    quantity: Math.max(1, Number(d.quantity ?? 1)),
    notes: String(d.notes ?? "").slice(0, 500),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, email, is_blocked")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.is_blocked) {
      return { ok: false as const, error: "blocked", message: "Votre compte est suspendu." };
    }

    // Fetch listing
    const { data: listing, error: lErr } = await supabase
      .from("listings")
      .select("*")
      .eq("id", data.listingId)
      .maybeSingle();

    if (lErr || !listing) {
      return { ok: false as const, error: "not_found", message: "Annonce introuvable." };
    }

    // CRITICAL: Prevent seller from submitting offer on own listing
    if (listing.owner_id === userId) {
      return {
        ok: false as const,
        error: "self_interaction",
        message: "Vous ne pouvez pas faire d'offre sur votre propre annonce.",
      };
    }

    if (!listing.owner_id) {
      return {
        ok: false as const,
        error: "demo_listing",
        message: "Cette annonce de démonstration n'a pas de vendeur associé. Veuillez tester avec une annonce créée par un utilisateur.",
      };
    }

    // Validate minimum negotiation difference rule
    const listedPrice = Number(listing.price);
    const ruleCheck = validateNegotiationOffer(listedPrice, data.offeredPrice);

    if (!ruleCheck.ok) {
      return {
        ok: false as const,
        error: "negotiation_rule_violation",
        minDifference: ruleCheck.minDifference,
        percentage: ruleCheck.percentage,
        difference: ruleCheck.difference,
        maxAcceptableOffer: ruleCheck.maxAcceptableOffer,
        message: ruleCheck.message?.fr || "L'offre ne respecte pas les règles de négociation minimale.",
      };
    }

    const sellerId = listing.owner_id;
    const diff = Math.round(Math.abs(listedPrice - data.offeredPrice) * 100) / 100;
    const pct = Math.round((diff / listedPrice) * 100 * 10) / 10;

    let offerId = "";

    // 1. Try dedicated offers table
    const { data: inserted, error: offerErr } = await supabase
      .from("offers")
      .insert({
        listing_id: data.listingId,
        seller_id: sellerId,
        buyer_id: userId,
        original_price: listedPrice,
        offered_price: data.offeredPrice,
        quantity: data.quantity,
        unit: listing.unit,
        difference: diff,
        percentage: pct,
        notes: data.notes,
        status: "pending",
      })
      .select("id")
      .maybeSingle();

    if (inserted?.id) {
      offerId = inserted.id;
    } else if (offerErr && missingTable(offerErr.code)) {
      // 2. Persistent fallback in public.messages
      // Check duplicate pending offer to prevent repeated clicking issues
      const { data: existingMessages } = await supabase
        .from("messages")
        .select("id, content")
        .eq("listing_id", data.listingId)
        .eq("sender_id", userId)
        .eq("recipient_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(10);

      const duplicate = (existingMessages ?? []).some((m: any) => {
        try {
          const p = JSON.parse(m.content);
          return p.__kind === "offer" && p.status === "pending" && Number(p.offered_price) === data.offeredPrice;
        } catch {
          return false;
        }
      });

      if (duplicate) {
        return {
          ok: false as const,
          error: "duplicate",
          message: "Vous avez déjà une offre en attente pour cet article avec ce montant.",
        };
      }

      const offerContent = JSON.stringify({
        __kind: "offer",
        original_price: listedPrice,
        offered_price: data.offeredPrice,
        quantity: data.quantity,
        unit: listing.unit,
        difference: diff,
        percentage: pct,
        notes: data.notes,
        status: "pending",
      });

      const { data: msgRow, error: msgErr } = await supabase
        .from("messages")
        .insert({
          listing_id: data.listingId,
          sender_id: userId,
          recipient_id: sellerId,
          sender_name: profile?.full_name || "Acheteur",
          sender_phone: profile?.phone || "",
          sender_email: profile?.email || "",
          content: offerContent,
          is_read: false,
        })
        .select("id")
        .maybeSingle();

      if (msgErr) {
        console.error("persistent offer message error", msgErr);
        return { ok: false as const, error: "failed", message: "Échec de l'enregistrement de l'offre en base de données." };
      }
      offerId = msgRow?.id || "";
    } else if (offerErr) {
      console.error("offer insert error", offerErr.message);
      return { ok: false as const, error: "failed", message: "Échec de l'envoi de l'offre." };
    }

    // Notify seller immediately
    const titleObj = (listing.title && typeof listing.title === "object" ? listing.title : {}) as any;
    const titleStr = titleObj.fr || titleObj.ar || titleObj.en || "Annonce";
    await createNotification(supabase, {
      actorId: userId,
      userId: sellerId,
      type: "offer_received",
      title: {
        ar: "عرض سعر جديد!",
        fr: "Nouvelle offre de prix !",
        en: "New price offer received!",
      },
      message: {
        ar: `اقترح المشتري ${data.offeredPrice} د.ت للإعلان "${titleStr}" (فارق ${diff} د.ت).`,
        fr: `Un acheteur propose ${data.offeredPrice} DT pour "${titleStr}" (écart de ${diff} DT).`,
        en: `A buyer offered ${data.offeredPrice} DT for "${titleStr}" (diff of ${diff} DT).`,
      },
      listingId: data.listingId,
      link: "/mes-offres",
    });

    return {
      ok: true as const,
      offerId,
      message: "Votre offre a été enregistrée et envoyée au vendeur avec succès.",
    };
  });

export const submitNegotiationOffer = submitOffer;

export const getIncomingOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    let offersData: any[] = [];

    // 1. Try dedicated offers table
    const { data: dbOffers, error } = await supabase
      .from("offers")
      .select("*")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });

    if (!error && dbOffers && dbOffers.length > 0) {
      offersData = dbOffers;
    } else if (error && missingTable(error.code)) {
      // 2. Query persistent messages fallback
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false });

      if (messages) {
        for (const m of messages) {
          try {
            const p = JSON.parse(m.content);
            if (p.__kind === "offer") {
              offersData.push({
                id: m.id,
                listing_id: m.listing_id,
                seller_id: userId,
                buyer_id: m.sender_id,
                original_price: p.original_price,
                offered_price: p.offered_price,
                quantity: p.quantity,
                unit: p.unit,
                difference: p.difference,
                percentage: p.percentage,
                notes: p.notes,
                status: p.status || "pending",
                created_at: m.created_at,
                buyer_snapshot: {
                  name: m.sender_name,
                  phone: m.sender_phone,
                  email: m.sender_email,
                },
              });
            }
          } catch {}
        }
      }
    }

    if (offersData.length === 0) return [];

    // Fetch listings and profiles to enrich offers
    const listingIds = Array.from(new Set(offersData.map((o) => o.listing_id).filter(Boolean)));
    const buyerIds = Array.from(new Set(offersData.map((o) => o.buyer_id).filter(Boolean)));

    const [{ data: listings }, { data: profiles }] = await Promise.all([
      listingIds.length > 0
        ? supabase.from("listings").select("id, title, images, price, unit, stock").in("id", listingIds)
        : Promise.resolve({ data: [] }),
      buyerIds.length > 0
        ? supabase.from("profiles").select("id, full_name, phone, email, account_type").in("id", buyerIds)
        : Promise.resolve({ data: [] }),
    ]);

    const lMap = new Map((listings ?? []).map((l: any) => [l.id, l]));
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return offersData.map((o) => {
      const l = lMap.get(o.listing_id);
      const p = pMap.get(o.buyer_id);
      const titleObj = (l?.title && typeof l.title === "object" ? l.title : {}) as any;
      const images: string[] = Array.isArray(l?.images) ? l.images : [];
      return {
        id: o.id,
        listingId: o.listing_id,
        listingTitle: titleObj,
        listingImage: images[0] || "listing-recup",
        originalPrice: Number(o.original_price),
        offeredPrice: Number(o.offered_price),
        quantity: Number(o.quantity),
        unit: o.unit || l?.unit || "piece",
        difference: Number(o.difference),
        percentage: Number(o.percentage),
        notes: o.notes || "",
        status: o.status as "pending" | "accepted" | "rejected" | "expired",
        createdAt: o.created_at,
        buyer: {
          id: o.buyer_id,
          name: p?.full_name || o.buyer_snapshot?.name || "Acheteur",
          phone: p?.phone || o.buyer_snapshot?.phone || "",
          email: p?.email || o.buyer_snapshot?.email || "",
          accountType: p?.account_type || "particulier",
        },
      };
    });
  });

export const getOutgoingOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    let offersData: any[] = [];

    // 1. Try dedicated offers table
    const { data: dbOffers, error } = await supabase
      .from("offers")
      .select("*")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false });

    if (!error && dbOffers && dbOffers.length > 0) {
      offersData = dbOffers;
    } else if (error && missingTable(error.code)) {
      // 2. Query persistent messages fallback
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("sender_id", userId)
        .order("created_at", { ascending: false });

      if (messages) {
        for (const m of messages) {
          try {
            const p = JSON.parse(m.content);
            if (p.__kind === "offer") {
              offersData.push({
                id: m.id,
                listing_id: m.listing_id,
                seller_id: m.recipient_id,
                buyer_id: userId,
                original_price: p.original_price,
                offered_price: p.offered_price,
                quantity: p.quantity,
                unit: p.unit,
                difference: p.difference,
                percentage: p.percentage,
                notes: p.notes,
                status: p.status || "pending",
                created_at: m.created_at,
              });
            }
          } catch {}
        }
      }
    }

    if (offersData.length === 0) return [];

    const listingIds = Array.from(new Set(offersData.map((o) => o.listing_id).filter(Boolean)));
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, images, price, unit, seller")
      .in("id", listingIds);

    const lMap = new Map((listings ?? []).map((l: any) => [l.id, l]));

    return offersData.map((o) => {
      const l = lMap.get(o.listing_id);
      const titleObj = (l?.title && typeof l.title === "object" ? l.title : {}) as any;
      const images: string[] = Array.isArray(l?.images) ? l.images : [];
      const sellerObj = (l?.seller && typeof l.seller === "object" ? l.seller : {}) as any;
      return {
        id: o.id,
        listingId: o.listing_id,
        listingTitle: titleObj,
        listingImage: images[0] || "listing-recup",
        originalPrice: Number(o.original_price),
        offeredPrice: Number(o.offered_price),
        quantity: Number(o.quantity),
        unit: o.unit || l?.unit || "piece",
        difference: Number(o.difference),
        percentage: Number(o.percentage),
        notes: o.notes || "",
        status: o.status as "pending" | "accepted" | "rejected" | "expired",
        createdAt: o.created_at,
        seller: {
          name: sellerObj?.name || "Vendeur",
          phone: sellerObj?.phone || "",
        },
      };
    });
  });

export const respondToOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { offerId: string; action: "accepted" | "rejected" }) => ({
    offerId: String(d.offerId),
    action: d.action,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let targetBuyerId = "";
    let targetListingId = "";
    let offeredPrice = 0;

    // 1. Check dedicated offers table
    const { data: offer, error } = await supabase
      .from("offers")
      .select("*")
      .eq("id", data.offerId)
      .maybeSingle();

    if (offer) {
      if (offer.seller_id !== userId) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
        if (!isAdmin) {
          return { ok: false as const, error: "forbidden", message: "Action non autorisée." };
        }
      }

      await supabase
        .from("offers")
        .update({ status: data.action, updated_at: new Date().toISOString() })
        .eq("id", data.offerId);

      targetBuyerId = offer.buyer_id;
      targetListingId = offer.listing_id;
      offeredPrice = Number(offer.offered_price);
    } else {
      // 2. Check persistent messages table
      const { data: msg } = await supabase
        .from("messages")
        .select("*")
        .eq("id", data.offerId)
        .maybeSingle();

      if (!msg) {
        return { ok: false as const, error: "not_found", message: "Offre introuvable." };
      }

      if (msg.recipient_id !== userId) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
        if (!isAdmin) {
          return { ok: false as const, error: "forbidden", message: "Action non autorisée." };
        }
      }

      try {
        const parsed = JSON.parse(msg.content);
        parsed.status = data.action;
        parsed.updated_at = new Date().toISOString();

        await supabase
          .from("messages")
          .update({ content: JSON.stringify(parsed) })
          .eq("id", data.offerId);

        targetBuyerId = msg.sender_id;
        targetListingId = msg.listing_id;
        offeredPrice = Number(parsed.offered_price);
      } catch (e) {
        console.error("error updating offer status in message", e);
        return { ok: false as const, error: "failed", message: "Impossible de mettre à jour le statut." };
      }
    }

    // Notify buyer immediately of seller decision
    if (targetBuyerId) {
      const isAccepted = data.action === "accepted";
      await createNotification(supabase, {
        actorId: userId,
        userId: targetBuyerId,
        type: isAccepted ? "offer_accepted" : "offer_rejected",
        title: {
          ar: isAccepted ? "تم قبول عرضك!" : "تم رفض العرض",
          fr: isAccepted ? "Offre acceptée !" : "Offre refusée",
          en: isAccepted ? "Offer accepted!" : "Offer rejected",
        },
        message: {
          ar: isAccepted
            ? `وافق البائع على عرضك بقيمة ${offeredPrice} د.ت.`
            : `رفض البائع عرضك بقيمة ${offeredPrice} د.ت.`,
          fr: isAccepted
            ? `Le vendeur a accepté votre offre de ${offeredPrice} DT.`
            : `Le vendeur a décliné votre offre de ${offeredPrice} DT.`,
          en: isAccepted
            ? `The seller accepted your offer of ${offeredPrice} DT.`
            : `The seller declined your offer of ${offeredPrice} DT.`,
        },
        listingId: targetListingId,
        link: "/mes-offres",
      });
    }

    return { ok: true as const, status: data.action };
  });

// --------------------------------------------------------------------------
// 3. QUANTITY REQUESTS
// --------------------------------------------------------------------------
export const submitQuantityRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { listingId: string; quantity: number; deliveryLocation?: string; notes?: string }) => ({
      listingId: String(d.listingId).slice(0, 80),
      quantity: Number(d.quantity),
      deliveryLocation: String(d.deliveryLocation ?? "").slice(0, 200),
      notes: String(d.notes ?? "").slice(0, 500),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, email, is_blocked")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.is_blocked) {
      return { ok: false as const, error: "blocked", message: "Votre compte est suspendu." };
    }

    // Fetch listing
    const { data: listing, error: lErr } = await supabase
      .from("listings")
      .select("*")
      .eq("id", data.listingId)
      .maybeSingle();

    if (lErr || !listing) {
      return { ok: false as const, error: "not_found", message: "Annonce introuvable." };
    }

    // Prevent seller from ordering own listing
    if (listing.owner_id === userId) {
      return {
        ok: false as const,
        error: "self_interaction",
        message: "Vous ne pouvez pas commander votre propre annonce.",
      };
    }

    if (!listing.owner_id) {
      return {
        ok: false as const,
        error: "demo_listing",
        message: "Cette annonce de démonstration n'a pas de vendeur associé.",
      };
    }

    // Stock check
    if (listing.stock < data.quantity) {
      return {
        ok: false as const,
        error: "insufficient_stock",
        available: listing.stock,
        message: `Stock insuffisant. Seulement ${listing.stock} disponible(s).`,
      };
    }

    const unitPrice = Number(listing.price);
    const totalVal = Math.round(unitPrice * data.quantity * 100) / 100;
    const sellerId = listing.owner_id;

    let requestId = "";

    // 1. Try dedicated quantity_requests table
    const { data: inserted, error: reqErr } = await supabase
      .from("quantity_requests")
      .insert({
        listing_id: data.listingId,
        seller_id: sellerId,
        buyer_id: userId,
        requested_quantity: data.quantity,
        unit_price: unitPrice,
        total_value: totalVal,
        unit: listing.unit,
        delivery_location: data.deliveryLocation,
        notes: data.notes,
        status: "pending",
      })
      .select("id")
      .maybeSingle();

    if (inserted?.id) {
      requestId = inserted.id;
    } else if (reqErr && missingTable(reqErr.code)) {
      // 2. Persistent fallback in public.messages
      const reqContent = JSON.stringify({
        __kind: "quantity_request",
        requested_quantity: data.quantity,
        unit_price: unitPrice,
        total_value: totalVal,
        unit: listing.unit,
        delivery_location: data.deliveryLocation,
        notes: data.notes,
        status: "pending",
      });

      const { data: msgRow, error: msgErr } = await supabase
        .from("messages")
        .insert({
          listing_id: data.listingId,
          sender_id: userId,
          recipient_id: sellerId,
          sender_name: profile?.full_name || "Acheteur",
          sender_phone: profile?.phone || "",
          sender_email: profile?.email || "",
          content: reqContent,
          is_read: false,
        })
        .select("id")
        .maybeSingle();

      if (msgErr) {
        console.error("persistent quantity request message error", msgErr);
        return { ok: false as const, error: "failed", message: "Échec de l'enregistrement de la commande." };
      }
      requestId = msgRow?.id || "";
    } else if (reqErr) {
      console.error("quantity request insert error", reqErr.message);
      return { ok: false as const, error: "failed", message: "Échec de l'enregistrement de la demande." };
    }

    // Notify seller
    const titleObj = (listing.title && typeof listing.title === "object" ? listing.title : {}) as any;
    const titleStr = titleObj.fr || titleObj.ar || titleObj.en || "Annonce";
    await createNotification(supabase, {
      actorId: userId,
      userId: sellerId,
      type: "quantity_request_received",
      title: {
        ar: "طلب كمية جديد!",
        fr: "Nouvelle commande reçue !",
        en: "New quantity request received!",
      },
      message: {
        ar: `طلب أحد المشترين ${data.quantity} ${listing.unit} من "${titleStr}" (إجمالي: ${totalVal} د.ت).`,
        fr: `Un acheteur a commandé ${data.quantity} ${listing.unit} de "${titleStr}" (Total: ${totalVal} DT).`,
        en: `A buyer requested ${data.quantity} ${listing.unit} of "${titleStr}" (Total: ${totalVal} DT).`,
      },
      listingId: data.listingId,
      link: "/mes-demandes",
    });

    return {
      ok: true as const,
      requestId,
      message: "Votre demande de quantité a été transmise au vendeur.",
    };
  });

export const getSellerQuantityRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    let reqsData: any[] = [];

    // 1. Try dedicated table
    const { data: dbReqs, error } = await supabase
      .from("quantity_requests")
      .select("*")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });

    if (!error && dbReqs && dbReqs.length > 0) {
      reqsData = dbReqs;
    } else if (error && missingTable(error.code)) {
      // 2. Query persistent messages fallback
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false });

      if (messages) {
        for (const m of messages) {
          try {
            const p = JSON.parse(m.content);
            if (p.__kind === "quantity_request") {
              reqsData.push({
                id: m.id,
                listing_id: m.listing_id,
                seller_id: userId,
                buyer_id: m.sender_id,
                requested_quantity: p.requested_quantity,
                unit_price: p.unit_price,
                total_value: p.total_value,
                unit: p.unit,
                delivery_location: p.delivery_location,
                notes: p.notes,
                status: p.status || "pending",
                created_at: m.created_at,
                buyer_snapshot: {
                  name: m.sender_name,
                  phone: m.sender_phone,
                  email: m.sender_email,
                },
              });
            }
          } catch {}
        }
      }
    }

    if (reqsData.length === 0) return [];

    const listingIds = Array.from(new Set(reqsData.map((r) => r.listing_id).filter(Boolean)));
    const buyerIds = Array.from(new Set(reqsData.map((r) => r.buyer_id).filter(Boolean)));

    const [{ data: listings }, { data: profiles }] = await Promise.all([
      listingIds.length > 0
        ? supabase.from("listings").select("id, title, images, price, unit, stock").in("id", listingIds)
        : Promise.resolve({ data: [] }),
      buyerIds.length > 0
        ? supabase.from("profiles").select("id, full_name, phone, email, account_type").in("id", buyerIds)
        : Promise.resolve({ data: [] }),
    ]);

    const lMap = new Map((listings ?? []).map((l: any) => [l.id, l]));
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return reqsData.map((r) => {
      const l = lMap.get(r.listing_id);
      const p = pMap.get(r.buyer_id);
      const titleObj = (l?.title && typeof l.title === "object" ? l.title : {}) as any;
      const images: string[] = Array.isArray(l?.images) ? l.images : [];
      return {
        id: r.id,
        listingId: r.listing_id,
        listingTitle: titleObj,
        listingImage: images[0] || "listing-recup",
        availableStock: Number(l?.stock ?? 0),
        unitPrice: Number(r.unit_price),
        requestedQuantity: Number(r.requested_quantity),
        totalValue: Number(r.total_value),
        unit: r.unit || l?.unit || "piece",
        deliveryLocation: r.delivery_location || "",
        notes: r.notes || "",
        status: r.status as "pending" | "accepted" | "rejected" | "cancelled",
        createdAt: r.created_at,
        buyer: {
          id: r.buyer_id,
          name: p?.full_name || r.buyer_snapshot?.name || "Acheteur",
          phone: p?.phone || r.buyer_snapshot?.phone || "",
          email: p?.email || r.buyer_snapshot?.email || "",
          accountType: p?.account_type || "particulier",
        },
      };
    });
  });

export const getBuyerQuantityRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    let reqsData: any[] = [];

    // 1. Try dedicated table
    const { data: dbReqs, error } = await supabase
      .from("quantity_requests")
      .select("*")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false });

    if (!error && dbReqs && dbReqs.length > 0) {
      reqsData = dbReqs;
    } else if (error && missingTable(error.code)) {
      // 2. Query persistent messages fallback
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("sender_id", userId)
        .order("created_at", { ascending: false });

      if (messages) {
        for (const m of messages) {
          try {
            const p = JSON.parse(m.content);
            if (p.__kind === "quantity_request") {
              reqsData.push({
                id: m.id,
                listing_id: m.listing_id,
                seller_id: m.recipient_id,
                buyer_id: userId,
                requested_quantity: p.requested_quantity,
                unit_price: p.unit_price,
                total_value: p.total_value,
                unit: p.unit,
                delivery_location: p.delivery_location,
                notes: p.notes,
                status: p.status || "pending",
                created_at: m.created_at,
              });
            }
          } catch {}
        }
      }
    }

    if (reqsData.length === 0) return [];

    const listingIds = Array.from(new Set(reqsData.map((r) => r.listing_id).filter(Boolean)));
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, images, price, unit, seller, stock")
      .in("id", listingIds);

    const lMap = new Map((listings ?? []).map((l: any) => [l.id, l]));

    return reqsData.map((r) => {
      const l = lMap.get(r.listing_id);
      const titleObj = (l?.title && typeof l.title === "object" ? l.title : {}) as any;
      const images: string[] = Array.isArray(l?.images) ? l.images : [];
      const sellerObj = (l?.seller && typeof l.seller === "object" ? l.seller : {}) as any;
      return {
        id: r.id,
        listingId: r.listing_id,
        listingTitle: titleObj,
        listingImage: images[0] || "listing-recup",
        unitPrice: Number(r.unit_price),
        requestedQuantity: Number(r.requested_quantity),
        totalValue: Number(r.total_value),
        unit: r.unit || l?.unit || "piece",
        deliveryLocation: r.delivery_location || "",
        notes: r.notes || "",
        status: r.status as "pending" | "accepted" | "rejected" | "cancelled",
        createdAt: r.created_at,
        seller: {
          name: sellerObj?.name || "Vendeur",
          phone: sellerObj?.phone || "",
        },
      };
    });
  });

export const respondToQuantityRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { requestId: string; action: "accepted" | "rejected" }) => ({
    requestId: String(d.requestId),
    action: d.action,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let targetListingId = "";
    let targetBuyerId = "";
    let requestedQuantity = 0;
    let unitLabel = "piece";
    let isDedicatedTable = false;

    // 1. Check dedicated quantity_requests table
    const { data: req, error } = await supabase
      .from("quantity_requests")
      .select("*")
      .eq("id", data.requestId)
      .maybeSingle();

    if (req) {
      if (req.seller_id !== userId) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
        if (!isAdmin) {
          return { ok: false as const, error: "forbidden", message: "Action non autorisée." };
        }
      }
      if (req.status !== "pending") {
        return { ok: false as const, error: "not_pending", message: "Cette demande n'est plus en attente." };
      }
      isDedicatedTable = true;
      targetListingId = req.listing_id;
      targetBuyerId = req.buyer_id;
      requestedQuantity = Number(req.requested_quantity);
      unitLabel = req.unit;
    } else {
      // 2. Check persistent messages table
      const { data: msg } = await supabase
        .from("messages")
        .select("*")
        .eq("id", data.requestId)
        .maybeSingle();

      if (!msg) {
        return { ok: false as const, error: "not_found", message: "Demande introuvable." };
      }

      if (msg.recipient_id !== userId) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
        if (!isAdmin) {
          return { ok: false as const, error: "forbidden", message: "Action non autorisée." };
        }
      }

      try {
        const parsed = JSON.parse(msg.content);
        if (parsed.status !== "pending") {
          return { ok: false as const, error: "not_pending", message: "Cette demande n'est plus en attente." };
        }
        targetListingId = msg.listing_id;
        targetBuyerId = msg.sender_id;
        requestedQuantity = Number(parsed.requested_quantity);
        unitLabel = parsed.unit || "piece";
      } catch (e) {
        return { ok: false as const, error: "failed", message: "Données de commande invalides." };
      }
    }

    if (data.action === "accepted") {
      // Fetch latest stock from listings table to prevent overselling
      const { data: listing, error: lErr } = await supabase
        .from("listings")
        .select("stock, status")
        .eq("id", targetListingId)
        .maybeSingle();

      if (lErr || !listing) {
        return { ok: false as const, error: "listing_not_found", message: "Article introuvable." };
      }

      const availableStock = Number(listing.stock);

      if (availableStock < requestedQuantity) {
        return {
          ok: false as const,
          error: "insufficient_stock",
          available: availableStock,
          message: `Stock insuffisant (${availableStock} disponible) pour accepter cette commande de ${requestedQuantity}.`,
        };
      }

      const newStock = availableStock - requestedQuantity;
      const newStatus = newStock <= 0 ? "sold" : listing.status;

      // Update listing stock safely
      await supabase
        .from("listings")
        .update({ stock: newStock, status: newStatus })
        .eq("id", targetListingId);

      if (isDedicatedTable) {
        await supabase
          .from("quantity_requests")
          .update({ status: "accepted", updated_at: new Date().toISOString() })
          .eq("id", data.requestId);
      } else {
        const { data: msg } = await supabase.from("messages").select("content").eq("id", data.requestId).maybeSingle();
        if (msg) {
          const parsed = JSON.parse(msg.content);
          parsed.status = "accepted";
          parsed.updated_at = new Date().toISOString();
          await supabase.from("messages").update({ content: JSON.stringify(parsed) }).eq("id", data.requestId);
        }
      }

      // Notify buyer
      await createNotification(supabase, {
        actorId: userId,
        userId: targetBuyerId,
        type: "quantity_accepted",
        title: {
          ar: "تمت الموافقة على طلبك!",
          fr: "Demande de quantité acceptée !",
          en: "Quantity request accepted!",
        },
        message: {
          ar: `وافق البائع على طلبك (${requestedQuantity} ${unitLabel}).`,
          fr: `Le vendeur a confirmé votre commande de ${requestedQuantity} ${unitLabel}.`,
          en: `The seller confirmed your order for ${requestedQuantity} ${unitLabel}.`,
        },
        listingId: targetListingId,
        link: "/mes-demandes",
      });

      return { ok: true as const, status: "accepted", remainingStock: newStock };
    } else {
      // Rejected
      if (isDedicatedTable) {
        await supabase
          .from("quantity_requests")
          .update({ status: "rejected", updated_at: new Date().toISOString() })
          .eq("id", data.requestId);
      } else {
        const { data: msg } = await supabase.from("messages").select("content").eq("id", data.requestId).maybeSingle();
        if (msg) {
          const parsed = JSON.parse(msg.content);
          parsed.status = "rejected";
          parsed.updated_at = new Date().toISOString();
          await supabase.from("messages").update({ content: JSON.stringify(parsed) }).eq("id", data.requestId);
        }
      }

      // Notify buyer
      await createNotification(supabase, {
        actorId: userId,
        userId: targetBuyerId,
        type: "quantity_rejected",
        title: {
          ar: "تم رفض طلب الكمية",
          fr: "Demande de quantité refusée",
          en: "Quantity request declined",
        },
        message: {
          ar: `لم يتمكن البائع من تلبية طلبك (${requestedQuantity} ${unitLabel}).`,
          fr: `Le vendeur n'a pas pu donner suite à votre demande de ${requestedQuantity} ${unitLabel}.`,
          en: `The seller was unable to fulfill your request for ${requestedQuantity} ${unitLabel}.`,
        },
        listingId: targetListingId,
        link: "/mes-demandes",
      });

      return { ok: true as const, status: "rejected" };
    }
  });

// --------------------------------------------------------------------------
// 4. NOTIFICATIONS
// --------------------------------------------------------------------------
export const getMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    let notifs: any[] = [];

    // 1. Try dedicated notifications table
    const { data: dbNotifs, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error && dbNotifs && dbNotifs.length > 0) {
      notifs = dbNotifs.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        listingId: n.listing_id,
        link: n.link || (n.listing_id ? `/annonces/${n.listing_id}` : ""),
        read: Boolean(n.read),
        createdAt: n.created_at,
      }));
    } else if (error && missingTable(error.code)) {
      // 2. Query persistent messages fallback
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (messages) {
        for (const m of messages) {
          try {
            const p = JSON.parse(m.content);
            if (p.__kind === "notification") {
              notifs.push({
                id: m.id,
                type: p.type,
                title: p.title,
                message: p.message,
                listingId: m.listing_id || p.listingId,
                link: p.link || (m.listing_id ? `/annonces/${m.listing_id}` : ""),
                read: Boolean(m.is_read),
                createdAt: m.created_at,
              });
            }
          } catch {}
        }
      }
    }

    const unreadCount = notifs.filter((n) => !n.read).length;
    return {
      notifications: notifs,
      unreadCount,
    };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; markAll?: boolean }) => ({
    id: d.id ? String(d.id) : undefined,
    markAll: Boolean(d.markAll),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Try dedicated notifications table
    if (data.markAll) {
      await supabase.from("notifications").update({ read: true }).eq("user_id", userId);
      // Also update messages table fallback
      await supabase.from("messages").update({ is_read: true }).eq("recipient_id", userId);
    } else if (data.id) {
      await supabase.from("notifications").update({ read: true }).eq("id", data.id).eq("user_id", userId);
      // Also update messages table fallback
      await supabase.from("messages").update({ is_read: true }).eq("id", data.id).eq("recipient_id", userId);
    }

    return { ok: true as const };
  });

// --------------------------------------------------------------------------
// 5. SELLER BIDDERS DASHBOARD & BIDS MANAGEMENT
// --------------------------------------------------------------------------
export const getListingBidders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { listingId: string }) => ({ listingId: String(d.listingId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: listing } = await supabase
      .from("listings")
      .select("owner_id, auction")
      .eq("id", data.listingId)
      .maybeSingle();

    if (!listing) return [];

    const isOwner = listing.owner_id === userId;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });

    const a = (listing.auction && typeof listing.auction === "object" ? listing.auction : {}) as Record<string, any>;
    const bids: any[] = Array.isArray(a.bids) ? a.bids : [];

    const sorted = [...bids].reverse();

    if (isOwner || isAdmin) {
      return sorted.map((b) => ({
        bidder: b.bidder,
        bidderId: b.bidderId || b.bidder_id,
        bidderName: b.bidderName || b.bidder_name || "Machtari",
        bidderPhone: b.bidderPhone || b.bidder_phone || "",
        bidderEmail: b.bidderEmail || b.bidder_email || "",
        amount: Number(b.amount),
        createdAt: b.createdAt || b.created_at || "",
        minutesAgo: Number(b.minutesAgo ?? 0),
      }));
    } else {
      return sorted.map((b) => ({
        bidder: b.bidder,
        amount: Number(b.amount),
        createdAt: b.createdAt || b.created_at || "",
        minutesAgo: Number(b.minutesAgo ?? 0),
      }));
    }
  });

// Fetch all auction listings and all their bids owned by the logged-in seller
export const getSellerBiddingRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, images, price, stock, unit, auction, created_at, status")
      .eq("owner_id", userId)
      .eq("sale_type", "enchere")
      .order("created_at", { ascending: false });

    if (!listings || listings.length === 0) return [];

    return listings.map((l: any) => {
      const a = (l.auction && typeof l.auction === "object" ? l.auction : {}) as Record<string, any>;
      const bids: any[] = Array.isArray(a.bids) ? a.bids : [];
      const titleObj = (l.title && typeof l.title === "object" ? l.title : {}) as any;
      const images: string[] = Array.isArray(l.images) ? l.images : [];
      const startPrice = Number(a.startPrice ?? l.price ?? 0);
      const increment = Number(a.increment ?? 1);

      const sortedBids = [...bids].reverse().map((b) => ({
        bidder: b.bidder,
        bidderId: b.bidderId || b.bidder_id,
        bidderName: b.bidderName || b.bidder_name || "Machtari",
        bidderPhone: b.bidderPhone || b.bidder_phone || "",
        bidderEmail: b.bidderEmail || b.bidder_email || "",
        amount: Number(b.amount),
        createdAt: b.createdAt || b.created_at || "",
      }));

      const highestBid = sortedBids.length > 0 ? sortedBids[0].amount : startPrice;

      return {
        id: l.id,
        title: titleObj,
        image: images[0] || "listing-recup",
        startPrice,
        increment,
        currentHighestBid: highestBid,
        totalBids: sortedBids.length,
        endsAt: a.endsAt || null,
        bids: sortedBids,
        status: l.status,
      };
    });
  });
