import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

/** Synchronize the current session access token to Supabase Realtime WebSocket */
async function syncRealtimeAuth() {
  try {
    if (typeof window === "undefined" || !supabase) return;
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      await supabase.realtime.setAuth(data.session.access_token);
    }
  } catch (err) {
    console.warn("Could not sync realtime auth:", err);
  }
}

/**
 * Hook to listen for realtime changes on the `messages` table.
 * Automatically invalidates messages and overview queries.
 */
export function useRealtimeMessages(onUpdate?: () => void) {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined" || !supabase) return;

    void syncRealtimeAuth();

    const channelName = `rt-messages-${user?.id || "guest"}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["me", "messages"] });
          void qc.invalidateQueries({ queryKey: ["me", "overview"] });
          onUpdate?.();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, user?.id, onUpdate]);
}

/**
 * Hook to listen for realtime changes on the `offers` table.
 * Automatically invalidates offers, notifications, purchases and overview queries.
 */
export function useRealtimeOffers(onUpdate?: () => void) {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined" || !supabase) return;

    void syncRealtimeAuth();

    const channelName = `rt-offers-${user?.id || "guest"}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "offers",
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["me", "offers"] });
          void qc.invalidateQueries({ queryKey: ["me", "purchases"] });
          void qc.invalidateQueries({ queryKey: ["me", "notifications"] });
          void qc.invalidateQueries({ queryKey: ["me", "overview"] });
          onUpdate?.();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, user?.id, onUpdate]);
}

/**
 * Hook to listen for realtime changes on the `quantity_requests` table.
 * Automatically invalidates quantity requests, purchases, listings and catalog.
 */
export function useRealtimeQuantityRequests(onUpdate?: () => void) {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined" || !supabase) return;

    void syncRealtimeAuth();

    const channelName = `rt-qty-reqs-${user?.id || "guest"}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quantity_requests",
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["me", "qty_requests"] });
          void qc.invalidateQueries({ queryKey: ["me", "purchases"] });
          void qc.invalidateQueries({ queryKey: ["me", "listings"] });
          void qc.invalidateQueries({ queryKey: ["catalog"] });
          void qc.invalidateQueries({ queryKey: ["me", "overview"] });
          onUpdate?.();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, user?.id, onUpdate]);
}

/**
 * Hook to listen for realtime changes on the `notifications` table.
 * Automatically invalidates notification queries in real-time.
 */
export function useRealtimeNotifications(onUpdate?: () => void) {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined" || !supabase || !user?.id) return;

    void syncRealtimeAuth();

    const channelName = `rt-notifs-${user.id}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["me", "notifications"] });
          onUpdate?.();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, user?.id, onUpdate]);
}

/**
 * Hook to listen for all realtime events relevant to the Member Dashboard:
 * messages, offers, quantity requests, token pack / subscription approvals, token balance.
 * Includes both instant WebSocket subscriptions and an ultra-fast resilient polling sync.
 */
export function useRealtimeDashboard() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined" || !supabase || !user?.id) return;

    void syncRealtimeAuth();

    const invalidateAllDashboard = () => {
      void qc.invalidateQueries({ queryKey: ["me", "messages"] });
      void qc.invalidateQueries({ queryKey: ["me", "offers"] });
      void qc.invalidateQueries({ queryKey: ["me", "qty_requests"] });
      void qc.invalidateQueries({ queryKey: ["me", "purchases"] });
      void qc.invalidateQueries({ queryKey: ["me", "listings"] });
      void qc.invalidateQueries({ queryKey: ["me", "requests"] });
      void qc.invalidateQueries({ queryKey: ["me", "boosts"] });
      void qc.invalidateQueries({ queryKey: ["me", "notifications"] });
      void qc.invalidateQueries({ queryKey: ["me", "overview"] });
    };

    const channelName = `rt-dashboard-${user.id}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      // 1. Messages
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        invalidateAllDashboard
      )
      // 2. Offres de négociation
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers" },
        invalidateAllDashboard
      )
      // 3. Demandes de quantité
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quantity_requests" },
        invalidateAllDashboard
      )
      // 4. Enchères & achats
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bids" },
        invalidateAllDashboard
      )
      // 5. Notifications
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        invalidateAllDashboard
      )
      // 6. Demandes d'abonnement / packs de jetons validés par l'admin
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscription_requests", filter: `user_id=eq.${user.id}` },
        invalidateAllDashboard
      )
      // 7. Profil (Solde de jetons en direct)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        invalidateAllDashboard
      )
      // 8. Mes annonces (statut approuvé, vendu, etc.)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings", filter: `owner_id=eq.${user.id}` },
        invalidateAllDashboard
      )
      .subscribe();

    // Secondary resilient sync: polls every 3.5 seconds when active
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        invalidateAllDashboard();
      }
    }, 3500);

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [qc, user?.id]);
}

/**
 * Hook to listen for live bids and listing updates on a single listing detail page.
 */
export function useRealtimeListing(listingId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined" || !supabase || !listingId) return;

    const channelName = `rt-listing-${listingId}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bids", filter: `listing_id=eq.${listingId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["catalog", "detail", listingId] });
          void qc.invalidateQueries({ queryKey: ["catalog", "bids", listingId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "listings", filter: `id=eq.${listingId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["catalog", "detail", listingId] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, listingId]);
}

