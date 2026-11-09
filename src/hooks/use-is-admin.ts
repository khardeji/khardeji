import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

/** Whether the signed-in member holds the admin role. Display only — every admin action is re-checked on the server. */
export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const q = useQuery({
    queryKey: ["me", "is-admin", user?.id ?? ""],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      if (error) return false;
      return data === true;
    },
  });
  return { isAdmin: q.data === true, loading: authLoading || (!!user && q.isPending) };
}
