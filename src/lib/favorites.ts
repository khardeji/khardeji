import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { getMyFavorites, setFavorite, type FavoriteResult } from "./engagement.functions";

const EMPTY: string[] = [];

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
  const key = ["me", "favorites", user?.id ?? "signed-out"];
  const q = useQuery({ queryKey: key, queryFn: () => fetchFavorites(), enabled: !!user, staleTime: 60_000 });
  const ids = user ? (q.data ?? EMPTY) : EMPTY;

  const toggle = async (id: string) => {
    if (loading) return;
    if (!user) {
      setNeedAccount(true);
      return;
    }
    const on = !ids.includes(id);
    const before = ids;
    qc.setQueryData(key, on ? [id, ...before] : before.filter((x) => x !== id));
    const res: FavoriteResult = await save({ data: { listingId: id, on } }).catch(() => ({ ok: false, error: "failed" }) as const);
    if (res.ok) {
      toast.success(
        on
          ? t({ ar: "تزاد للمفضلة", fr: "Ajouté aux favoris", en: "Added to favourites" })
          : t({ ar: "تنحّى من المفضلة", fr: "Retiré des favoris", en: "Removed from favourites" }),
      );
    } else {
      qc.setQueryData(key, before);
      toast.error(
        res.error === "not_ready"
          ? t({ ar: "المفضلة مازالت ما تخدمش توّا. عاود جرّب مبعد.", fr: "Les favoris ne sont pas encore disponibles. Réessayez plus tard.", en: "Favourites aren't available yet. Try again later." })
          : t({ ar: "ما نجمناش نسجّلو. عاود جرّب.", fr: "Échec de l'enregistrement. Réessayez.", en: "Could not save. Try again." }),
      );
    }
  };

  return {
    ids,
    loading: !!user && q.isPending,
    isFavorite: (id: string) => ids.includes(id),
    toggle,
    needAccount,
    closeAccount: () => setNeedAccount(false),
  };
}
