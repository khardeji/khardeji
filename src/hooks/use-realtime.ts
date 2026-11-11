import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to listen for realtime changes on the `messages` table.
 * Automatically invalidates messages and overview queries.
 */
export function useRealtimeMessages(onUpdate?: () => void) {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    // Only subscribe in browser environment
    if (typeof window === "undefined" || !supabase) return;

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
 * Automatically invalidates offers, notifications and overview queries.
 */
export function useRealtimeOffers(onUpdate?: () => void) {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined" || !supabase) return;

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
 * Automatically invalidates quantity requests, listings and catalog.
 */
export function useRealtimeQuantityRequests(onUpdate?: () => void) {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined" || !supabase) return;

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
 */
export function useRealtimeDashboard() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined" || !supabase || !user?.id) return;

    const channelName = `rt-dashboard-${user.id}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      // 1. Messages
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          void qc.invalidateQueries({ queryKey: ["me", "messages"] });
          void qc.invalidateQueries({ queryKey: ["me", "overview"] });
        }
      )
      // 2. Offres de négociation
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers" },
        () => {
          void qc.invalidateQueries({ queryKey: ["me", "offers"] });
          void qc.invalidateQueries({ queryKey: ["me", "overview"] });
        }
      )
      // 3. Demandes de quantité
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quantity_requests" },
        () => {
          void qc.invalidateQueries({ queryKey: ["me", "qty_requests"] });
          void qc.invalidateQueries({ queryKey: ["me", "listings"] });
          void qc.invalidateQueries({ queryKey: ["me", "overview"] });
        }
      )
      // 4. Demandes d'abonnement / packs de jetons validés par l'admin
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscription_requests", filter: `user_id=eq.${user.id}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["me", "requests"] });
          void qc.invalidateQueries({ queryKey: ["me", "overview"] });
        }
      )
      // 5. Profil (Solde de jetons en direct)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["me", "overview"] });
        }
      )
      // 6. Mes annonces (statut approuvé, vendu, etc.)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings", filter: `owner_id=eq.${user.id}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["me", "listings"] });
          void qc.invalidateQueries({ queryKey: ["me", "overview"] });
        }
      )
      .subscribe();

    return () => {
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
