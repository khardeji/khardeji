-- ============================================================================
-- Khardeji — Module Favoris & Signalements
-- À exécuter dans le Supabase SQL Editor de votre projet Supabase.
-- Idempotent : peut être réexécuté sans risque.
-- ============================================================================

-- 1. Table des favoris (membres connectés)
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id text NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON public.favorites(listing_id);

-- Sécurité RLS pour les favoris
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;

DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
CREATE POLICY "favorites_select_own" ON public.favorites
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
CREATE POLICY "favorites_insert_own" ON public.favorites
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_blocked(auth.uid())
  );

DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
CREATE POLICY "favorites_delete_own" ON public.favorites
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- 2. Table des signalements d'annonces
CREATE TABLE IF NOT EXISTS public.listing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id text NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('fraud', 'wrong_info', 'sold', 'prohibited', 'duplicate', 'offensive', 'other')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  admin_note text NOT NULL DEFAULT '' CHECK (char_length(admin_note) <= 500),
  reviewed_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_reports_unique_reporter_listing UNIQUE (listing_id, reporter_id)
);

-- Index pour les listes admin et filtrages
CREATE INDEX IF NOT EXISTS idx_listing_reports_listing_id ON public.listing_reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_reports_reporter_id ON public.listing_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_listing_reports_status ON public.listing_reports(status);
CREATE INDEX IF NOT EXISTS idx_listing_reports_created_at ON public.listing_reports(created_at DESC);

-- Sécurité RLS pour les signalements
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_reports TO authenticated;
GRANT ALL ON public.listing_reports TO service_role;

DROP POLICY IF EXISTS "reports_insert_authenticated" ON public.listing_reports;
CREATE POLICY "reports_insert_authenticated" ON public.listing_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id
    AND NOT public.is_blocked(auth.uid())
  );

DROP POLICY IF EXISTS "reports_select_reporter_or_admin" ON public.listing_reports;
CREATE POLICY "reports_select_reporter_or_admin" ON public.listing_reports
  FOR SELECT TO authenticated
  USING (
    auth.uid() = reporter_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "reports_update_admin" ON public.listing_reports;
CREATE POLICY "reports_update_admin" ON public.listing_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "reports_delete_admin" ON public.listing_reports;
CREATE POLICY "reports_delete_admin" ON public.listing_reports
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

