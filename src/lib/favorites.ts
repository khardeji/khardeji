import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { getMyFavorites, setFavorite, type FavoriteResult } from "./engagement.functions";

const EMPTY: string[] = [];

function getLocalFavs(userId: string): string[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(`khardeji:fav:${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? Array.from(new Set(parsed)) : [];
  } catch {
    return [];
  }
}

function setLocalFavs(userId: string, ids: string[]) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const unique = Array.from(new Set(ids));
    localStorage.setItem(`khardeji:fav:${userId}`, JSON.stringify(unique));
  } catch {}
}

/**
 * Favourites are saved on the member's account. Signed-out visitors get the
 * "account needed" prompt instead (render <AccountRequiredDialog open={needAccount} …/>).
 */
export function useFavorites() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const fetchFavorites = useServerFn(getMyFavorites);
  const save = useServerFn(setFavorite);
  const [needAccount, setNeedAccount] = useState(false);

  const userId = user?.id;
  const key = ["me", "favorites", userId ?? "signed-out"];

  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!userId) return EMPTY;
      const local = getLocalFavs(userId);
      try {
        const serverIds = await fetchFavorites();
        if (Array.isArray(serverIds) && serverIds.length > 0) {
          const merged = Array.from(new Set([...serverIds, ...local]));
          setLocalFavs(userId, merged);
          return merged;
        }
      } catch (err) {
        console.warn("fetch favorites server fallback to local", err);
      }
      return local;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const ids: string[] = userId ? q.data ?? getLocalFavs(userId) : EMPTY;

  const toggle = async (id: string) => {
    if (loading) return;
    if (!user || !userId) {
      setNeedAccount(true);
      return;
    }

    const isFav = ids.includes(id);
    const on = !isFav;
    const before = ids;
    const next = on ? Array.from(new Set([id, ...before])) : before.filter((x) => x !== id);

    // Immediate optimistic update
    qc.setQueryData(key, next);
    setLocalFavs(userId, next);

    toast.success(
      on
        ? t({ ar: "تزاد للمفضلة", fr: "Ajouté aux favoris", en: "Added to favourites" })
        : t({ ar: "تنحّى من المفضلة", fr: "Retiré des favoris", en: "Removed from favourites" }),
    );

    try {
      const res: FavoriteResult = await save({ data: { listingId: id, on } });
      if (!res.ok) {
        // Rollback only on actual error
        qc.setQueryData(key, before);
        setLocalFavs(userId, before);
        toast.error(t({ ar: "ما نجمناش نسجّلو. عاود جرّب.", fr: "Échec de l'enregistrement. Réessayez.", en: "Could not save. Try again." }));
      }
    } catch {
      // Keep local state if network is flaky
    }
  };

  const removeFavorite = (id: string) => {
    if (!userId) return;
    const next = ids.filter((x) => x !== id);
    qc.setQueryData(key, next);
    setLocalFavs(userId, next);
    void save({ data: { listingId: id, on: false } }).catch(() => {});
    toast.success(t({ ar: "تنحّى من المفضلة", fr: "Retiré des favoris", en: "Removed from favourites" }));
  };

  return {
    ids,
    loading: !!user && q.isPending,
    isFavorite: (id: string) => ids.includes(id),
    toggle,
    removeFavorite,
    needAccount,
    closeAccount: () => setNeedAccount(false),
  };
}
