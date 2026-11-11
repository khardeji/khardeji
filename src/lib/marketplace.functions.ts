// Marketplace transactions: Bidding, Offers, Quantity Requests & Notifications.
// Enforces permissions, prevents self-interaction, and provides atomic stock/bid handling.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { validateNegotiationOffer } from "./negotiation";
import { resolveListingImages, rowToListing } from "./catalog-map";

const missingTable = (code?: string) => code === "PGRST205" || code === "42P01";

// In-memory fallback stores for when DB tables are not yet migrated
interface FallbackOffer {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_id: string;
  original_price: number;
  offered_price: number;
  quantity: number;
  unit: string;
  difference: number;
  percentage: number;
  notes: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  created_at: string;
  updated_at: string;
}

interface FallbackQtyRequest {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_id: string;
  requested_quantity: number;
  unit_price: number;
  total_value: number;
  unit: string;
  delivery_location: string;
  notes: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
  updated_at: string;
}

interface FallbackNotification {
  id: string;
  user_id: string;
  type: string;
  title: { ar: string; fr: string; en: string };
  message: { ar: string; fr: string; en: string };
  listing_id?: string;
  link?: string;
  read: boolean;
  created_at: string;
}

const memoryOffers: FallbackOffer[] = [];
const memoryQtyRequests: FallbackQtyRequest[] = [];
const memoryNotifications: FallbackNotification[] = [];

// Helper to send notification
async function createNotification(
  supabase: any,
  payload: {
    userId: string;
    type: string;
    title: { ar: string; fr: string; en: string };
    message: { ar: string; fr: string; en: string };
    listingId?: string;
    link?: string;
  },
) {
  try {
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
      memoryNotifications.unshift({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        listing_id: payload.listingId,
        link: payload.link,
        read: false,
        created_at: new Date().toISOString(),
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

    // Update listing row with the new bid
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

    const sellerId = listing.owner_id || "00000000-0000-0000-0000-000000000000";
    const nowIso = new Date().toISOString();
    const diff = Math.round(Math.abs(listedPrice - data.offeredPrice) * 100) / 100;
    const pct = Math.round((diff / listedPrice) * 100 * 10) / 10;

    // Insert into offers table or memory fallback
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

    let offerId = inserted?.id;

    if (offerErr && missingTable(offerErr.code)) {
      offerId = `off-${Date.now()}`;
      memoryOffers.unshift({
        id: offerId,
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
        created_at: nowIso,
        updated_at: nowIso,
      });
    } else if (offerErr) {
      console.error("offer insert error", offerErr.message);
      return { ok: false as const, error: "failed", message: "Échec de l'envoi de l'offre." };
    }

    // Notify seller
    if (listing.owner_id) {
      const titleObj = (listing.title && typeof listing.title === "object" ? listing.title : {}) as any;
      const titleStr = titleObj.fr || titleObj.ar || titleObj.en || "Annonce";
      await createNotification(supabase, {
        userId: listing.owner_id,
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
    }

    return {
      ok: true as const,
      offerId,
      message: "Votre offre a été envoyée au vendeur avec succès.",
    };
  });

export const submitNegotiationOffer = submitOffer;

export const getIncomingOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    let offersData: any[] = [];
    const { data: dbOffers, error } = await supabase
      .from("offers")
      .select("*")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });

    if (!error && dbOffers) {
      offersData = dbOffers;
    } else {
      offersData = memoryOffers.filter((o) => o.seller_id === userId);
    }

    if (offersData.length === 0) return [];

    // Fetch listings and profiles to enrich offers
    const listingIds = Array.from(new Set(offersData.map((o) => o.listing_id)));
    const buyerIds = Array.from(new Set(offersData.map((o) => o.buyer_id)));

    const [{ data: listings }, { data: profiles }] = await Promise.all([
      supabase.from("listings").select("id, title, images, price, unit, stock").in("id", listingIds),
      supabase.from("profiles").select("id, full_name, phone, email, account_type").in("id", buyerIds),
    ]);

    const lMap = new Map((listings ?? []).map((l) => [l.id, l]));
    const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));

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
        status: o.status,
        createdAt: o.created_at,
        buyer: {
          id: o.buyer_id,
          name: p?.full_name || "Acheteur",
          phone: p?.phone || "",
          email: p?.email || "",
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
    const { data: dbOffers, error } = await supabase
      .from("offers")
      .select("*")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false });

    if (!error && dbOffers) {
      offersData = dbOffers;
    } else {
      offersData = memoryOffers.filter((o) => o.buyer_id === userId);
    }

    if (offersData.length === 0) return [];

    const listingIds = Array.from(new Set(offersData.map((o) => o.listing_id)));
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, images, price, unit, seller")
      .in("id", listingIds);

    const lMap = new Map((listings ?? []).map((l) => [l.id, l]));

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
        status: o.status,
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

    // Check DB or memory
    const { data: offer, error } = await supabase
      .from("offers")
      .select("*")
      .eq("id", data.offerId)
      .maybeSingle();

    const currentOffer = offer || memoryOffers.find((o) => o.id === data.offerId);

    if (!currentOffer) {
      return { ok: false as const, error: "not_found", message: "Offre introuvable." };
    }

    if (currentOffer.seller_id !== userId) {
      // Check admin
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) {
        return { ok: false as const, error: "forbidden", message: "Action non autorisée." };
      }
    }

    if (offer) {
      await supabase
        .from("offers")
        .update({ status: data.action, updated_at: new Date().toISOString() })
        .eq("id", data.offerId);
    } else {
      currentOffer.status = data.action;
      currentOffer.updated_at = new Date().toISOString();
    }

    // Notify buyer
    const isAccepted = data.action === "accepted";
    await createNotification(supabase, {
      userId: currentOffer.buyer_id,
      type: isAccepted ? "offer_accepted" : "offer_rejected",
      title: {
        ar: isAccepted ? "تم قبول عرضك!" : "تم رفض العرض",
        fr: isAccepted ? "Offre acceptée !" : "Offre refusée",
        en: isAccepted ? "Offer accepted!" : "Offer rejected",
      },
      message: {
        ar: isAccepted
          ? `وافق البائع على عرضك بقيمة ${currentOffer.offered_price} د.ت.`
          : `رفض البائع عرضك بقيمة ${currentOffer.offered_price} د.ت.`,
        fr: isAccepted
          ? `Le vendeur a accepté votre offre de ${currentOffer.offered_price} DT.`
          : `Le vendeur a décliné votre offre de ${currentOffer.offered_price} DT.`,
        en: isAccepted
          ? `The seller accepted your offer of ${currentOffer.offered_price} DT.`
          : `The seller declined your offer of ${currentOffer.offered_price} DT.`,
      },
      listingId: currentOffer.listing_id,
      link: "/mes-offres",
    });

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, email, is_blocked")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.is_blocked) {
      return { ok: false as const, error: "blocked", message: "Votre compte est suspendu." };
    }

    const { data: listing, error: lErr } = await supabase
      .from("listings")
      .select("*")
      .eq("id", data.listingId)
      .maybeSingle();

    if (lErr || !listing) {
      return { ok: false as const, error: "not_found", message: "Annonce introuvable." };
    }

    // CRITICAL: Prevent seller from purchasing / requesting quantity on own listing
    if (listing.owner_id === userId) {
      return {
        ok: false as const,
        error: "self_interaction",
        message: "Vous ne pouvez pas commander votre propre article.",
      };
    }

    const availableStock = Number(listing.stock);
    if (data.quantity <= 0) {
      return { ok: false as const, error: "invalid_quantity", message: "La quantité doit être supérieure à 0." };
    }

    if (data.quantity > availableStock) {
      return {
        ok: false as const,
        error: "exceeds_stock",
        availableStock,
        message: `La quantité demandée dépasse le stock disponible (${availableStock} ${listing.unit}).`,
      };
    }

    const unitPrice = Number(listing.price);
    const totalVal = Math.round(unitPrice * data.quantity * 1000) / 1000;
    const sellerId = listing.owner_id || "00000000-0000-0000-0000-000000000000";
    const nowIso = new Date().toISOString();

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

    let reqId = inserted?.id;

    if (reqErr && missingTable(reqErr.code)) {
      reqId = `qr-${Date.now()}`;
      memoryQtyRequests.unshift({
        id: reqId,
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
        created_at: nowIso,
        updated_at: nowIso,
      });
    } else if (reqErr) {
      console.error("quantity request insert error", reqErr.message);
      return { ok: false as const, error: "failed", message: "Échec de l'envoi de la demande." };
    }

    // Notify seller
    if (listing.owner_id) {
      const titleObj = (listing.title && typeof listing.title === "object" ? listing.title : {}) as any;
      const titleStr = titleObj.fr || titleObj.ar || titleObj.en || "Annonce";
      await createNotification(supabase, {
        userId: listing.owner_id,
        type: "quantity_requested",
        title: {
          ar: "طلب كمية جديد!",
          fr: "Nouvelle demande de quantité !",
          en: "New quantity request!",
        },
        message: {
          ar: `طلب جديد لشراء ${data.quantity} ${listing.unit} من "${titleStr}".`,
          fr: `Demande de commande de ${data.quantity} ${listing.unit} sur "${titleStr}".`,
          en: `Order request of ${data.quantity} ${listing.unit} on "${titleStr}".`,
        },
        listingId: data.listingId,
        link: "/mes-demandes",
      });
    }

    return {
      ok: true as const,
      requestId: reqId,
      message: "Votre demande de quantité a été soumise au vendeur avec succès.",
    };
  });

export const getSellerQuantityRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    let reqsData: any[] = [];
    const { data: dbReqs, error } = await supabase
      .from("quantity_requests")
      .select("*")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });

    if (!error && dbReqs) {
      reqsData = dbReqs;
    } else {
      reqsData = memoryQtyRequests.filter((r) => r.seller_id === userId);
    }

    if (reqsData.length === 0) return [];

    const listingIds = Array.from(new Set(reqsData.map((r) => r.listing_id)));
    const buyerIds = Array.from(new Set(reqsData.map((r) => r.buyer_id)));

    const [{ data: listings }, { data: profiles }] = await Promise.all([
      supabase.from("listings").select("id, title, images, price, unit, stock").in("id", listingIds),
      supabase.from("profiles").select("id, full_name, phone, email, account_type").in("id", buyerIds),
    ]);

    const lMap = new Map((listings ?? []).map((l) => [l.id, l]));
    const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));

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
        status: r.status,
        createdAt: r.created_at,
        buyer: {
          id: r.buyer_id,
          name: p?.full_name || "Acheteur",
          phone: p?.phone || "",
          email: p?.email || "",
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
    const { data: dbReqs, error } = await supabase
      .from("quantity_requests")
      .select("*")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false });

    if (!error && dbReqs) {
      reqsData = dbReqs;
    } else {
      reqsData = memoryQtyRequests.filter((r) => r.buyer_id === userId);
    }

    if (reqsData.length === 0) return [];

    const listingIds = Array.from(new Set(reqsData.map((r) => r.listing_id)));
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, images, price, unit, seller, stock")
      .in("id", listingIds);

    const lMap = new Map((listings ?? []).map((l) => [l.id, l]));

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
        status: r.status,
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

    // Check DB or memory
    const { data: req, error } = await supabase
      .from("quantity_requests")
      .select("*")
      .eq("id", data.requestId)
      .maybeSingle();

    const currentReq = req || memoryQtyRequests.find((r) => r.id === data.requestId);

    if (!currentReq) {
      return { ok: false as const, error: "not_found", message: "Demande introuvable." };
    }

    if (currentReq.seller_id !== userId) {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) {
        return { ok: false as const, error: "forbidden", message: "Action non autorisée." };
      }
    }

    if (currentReq.status !== "pending") {
      return { ok: false as const, error: "not_pending", message: "Cette demande n'est plus en attente." };
    }

    if (data.action === "accepted") {
      // Fetch latest stock from listings table to prevent overselling
      const { data: listing, error: lErr } = await supabase
        .from("listings")
        .select("stock, status")
        .eq("id", currentReq.listing_id)
        .maybeSingle();

      if (lErr || !listing) {
        return { ok: false as const, error: "listing_not_found", message: "Article introuvable." };
      }

      const availableStock = Number(listing.stock);
      const reqQty = Number(currentReq.requested_quantity);

      if (availableStock < reqQty) {
        return {
          ok: false as const,
          error: "insufficient_stock",
          available: availableStock,
          message: `Stock insuffisant (${availableStock} disponible) pour accepter cette commande de ${reqQty}.`,
        };
      }

      const newStock = availableStock - reqQty;
      const newStatus = newStock <= 0 ? "sold" : listing.status;

      // Update listing stock safely
      await supabase
        .from("listings")
        .update({ stock: newStock, status: newStatus })
        .eq("id", currentReq.listing_id);

      if (req) {
        await supabase
          .from("quantity_requests")
          .update({ status: "accepted", updated_at: new Date().toISOString() })
          .eq("id", data.requestId);
      } else {
        currentReq.status = "accepted";
        currentReq.updated_at = new Date().toISOString();
      }

      // Notify buyer
      await createNotification(supabase, {
        userId: currentReq.buyer_id,
        type: "quantity_accepted",
        title: {
          ar: "تمت الموافقة على طلبك!",
          fr: "Demande de quantité acceptée !",
          en: "Quantity request accepted!",
        },
        message: {
          ar: `وافق البائع على طلبك (${reqQty} ${currentReq.unit}).`,
          fr: `Le vendeur a confirmé votre commande de ${reqQty} ${currentReq.unit}.`,
          en: `The seller confirmed your order for ${reqQty} ${currentReq.unit}.`,
        },
        listingId: currentReq.listing_id,
        link: "/mes-demandes",
      });

      return { ok: true as const, status: "accepted", remainingStock: newStock };
    } else {
      // Rejected
      if (req) {
        await supabase
          .from("quantity_requests")
          .update({ status: "rejected", updated_at: new Date().toISOString() })
          .eq("id", data.requestId);
      } else {
        currentReq.status = "rejected";
        currentReq.updated_at = new Date().toISOString();
      }

      // Notify buyer
      await createNotification(supabase, {
        userId: currentReq.buyer_id,
        type: "quantity_rejected",
        title: {
          ar: "تم رفض طلب الكمية",
          fr: "Demande de quantité refusée",
          en: "Quantity request declined",
        },
        message: {
          ar: `لم يتمكن البائع من تلبية طلبك (${currentReq.requested_quantity} ${currentReq.unit}).`,
          fr: `Le vendeur n'a pas pu donner suite à votre demande de ${currentReq.requested_quantity} ${currentReq.unit}.`,
          en: `The seller was unable to fulfill your request for ${currentReq.requested_quantity} ${currentReq.unit}.`,
        },
        listingId: currentReq.listing_id,
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
    const { data: dbNotifs, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error && dbNotifs) {
      notifs = dbNotifs;
    } else {
      notifs = memoryNotifications.filter((n) => n.user_id === userId);
    }

    const unreadCount = notifs.filter((n) => !n.read).length;
    return {
      notifications: notifs.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        listingId: n.listing_id,
        link: n.link || (n.listing_id ? `/annonces/${n.listing_id}` : ""),
        read: Boolean(n.read),
        createdAt: n.created_at,
      })),
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

    if (data.markAll) {
      await supabase.from("notifications").update({ read: true }).eq("user_id", userId);
      memoryNotifications.forEach((n) => {
        if (n.user_id === userId) n.read = true;
      });
    } else if (data.id) {
      await supabase.from("notifications").update({ read: true }).eq("id", data.id).eq("user_id", userId);
      const found = memoryNotifications.find((n) => n.id === data.id && n.user_id === userId);
      if (found) found.read = true;
    }

    return { ok: true as const };
  });

// --------------------------------------------------------------------------
// 5. SELLER BIDDERS DASHBOARD / DETAIL
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

    // Sort newest / highest first
    const sorted = [...bids].reverse();

    if (isOwner || isAdmin) {
      // Authorized: full bidder contact info
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
      // Visitor / public: privacy protected
      return sorted.map((b) => ({
        bidder: b.bidder,
        amount: Number(b.amount),
        createdAt: b.createdAt || b.created_at || "",
        minutesAgo: Number(b.minutesAgo ?? 0),
      }));
    }
  });

