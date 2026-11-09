import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Pages under this folder need an account: visitors are sent to sign in first, then brought back.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const raison = location.pathname.startsWith("/publier") ? "publier" : undefined;
      throw redirect({ to: "/connexion", search: { redirect: location.href, raison } });
    }
  },
  component: () => <Outlet />,
});
