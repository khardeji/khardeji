import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const AFTER_LOGIN_KEY = "khardeji:after-login";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, user: null, loading: true });

/** Only same-site paths are allowed as post-login destinations. */
export function safeRedirect(path: unknown): string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

/** Remember where to go after an OAuth round-trip (the provider returns to the home page). */
export function rememberAfterLogin(path: string) {
  sessionStorage.setItem(AFTER_LOGIN_KEY, safeRedirect(path));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ session: null, user: null, loading: true });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ session, user: session?.user ?? null, loading: false });
      if (event === "SIGNED_IN") {
        const next = sessionStorage.getItem(AFTER_LOGIN_KEY);
        if (next) {
          sessionStorage.removeItem(AFTER_LOGIN_KEY);
          router.history.push(safeRedirect(next));
        }
      }
      if (event === "SIGNED_OUT") void router.invalidate();
    });
    void supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, user: data.session?.user ?? null, loading: false });
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
