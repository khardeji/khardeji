-- ============================================================================
-- Khardeji — Module Complet : Services, Jetons, Abonnements & Messagerie
-- À exécuter dans le Supabase SQL Editor (projet Khardeji).
-- Ce script est 100% idempotent : peut être réexécuté sans risque.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Fonction de vérification de blocage (sécurisée et compatible uuid/text)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE((SELECT is_blocked FROM public.profiles WHERE id = _user_id), false);
$$;

-- ----------------------------------------------------------------------------
-- 1. Colonnes d'abonnements et jetons sur les profils (public.profiles)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tokens_balance integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'basique';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active';

-- ----------------------------------------------------------------------------
-- 2. Colonnes de boosts sur les annonces (public.listings)
-- ----------------------------------------------------------------------------
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS urgent boolean NOT NULL DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS boosted_at timestamptz DEFAULT NULL;

-- Index pour accélérer le tri et filtrage des annonces urgentes et à la une
CREATE INDEX IF NOT EXISTS idx_listings_featured ON public.listings(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_listings_urgent ON public.listings(urgent) WHERE urgent = true;

-- ----------------------------------------------------------------------------
-- 3. Table des favoris (public.favorites)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id text NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON public.favorites(listing_id);

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
  WITH CHECK (auth.uid() = user_id AND NOT public.is_blocked(auth.uid()));

DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
CREATE POLICY "favorites_delete_own" ON public.favorites
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Table des signalements (public.listing_reports)
-- ----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_listing_reports_listing_id ON public.listing_reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_reports_reporter_id ON public.listing_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_listing_reports_status ON public.listing_reports(status);
CREATE INDEX IF NOT EXISTS idx_listing_reports_created_at ON public.listing_reports(created_at DESC);

ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_reports TO authenticated;
GRANT ALL ON public.listing_reports TO service_role;

DROP POLICY IF EXISTS "reports_insert_authenticated" ON public.listing_reports;
CREATE POLICY "reports_insert_authenticated" ON public.listing_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id AND NOT public.is_blocked(auth.uid()));

DROP POLICY IF EXISTS "reports_select_reporter_or_admin" ON public.listing_reports;
CREATE POLICY "reports_select_reporter_or_admin" ON public.listing_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "reports_update_admin" ON public.listing_reports;
CREATE POLICY "reports_update_admin" ON public.listing_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "reports_delete_admin" ON public.listing_reports;
CREATE POLICY "reports_delete_admin" ON public.listing_reports
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ----------------------------------------------------------------------------
-- 5. Table des demandes d'abonnements, renouvellements et packs de jetons
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('subscription', 'renewal', 'token_pack')),
  plan_id text DEFAULT NULL,
  pack_id text DEFAULT NULL,
  tokens_count integer NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text DEFAULT '',
  admin_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz DEFAULT NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sub_requests_user_id ON public.subscription_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_requests_status ON public.subscription_requests(status);
CREATE INDEX IF NOT EXISTS idx_sub_requests_created_at ON public.subscription_requests(created_at DESC);

ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_requests TO authenticated;
GRANT ALL ON public.subscription_requests TO service_role;

DROP POLICY IF EXISTS "sub_requests_select" ON public.subscription_requests;
CREATE POLICY "sub_requests_select" ON public.subscription_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "sub_requests_insert" ON public.subscription_requests;
CREATE POLICY "sub_requests_insert" ON public.subscription_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_blocked(auth.uid()));

DROP POLICY IF EXISTS "sub_requests_update_admin" ON public.subscription_requests;
CREATE POLICY "sub_requests_update_admin" ON public.subscription_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "sub_requests_delete_admin" ON public.subscription_requests;
CREATE POLICY "sub_requests_delete_admin" ON public.subscription_requests
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ----------------------------------------------------------------------------
-- 6. Table des messages & contacts entre acheteurs et vendeurs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id text REFERENCES public.listings(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text DEFAULT '',
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  sender_phone text DEFAULT '',
  sender_email text DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Rendre sender_id optionnel pour permettre aux visiteurs sans compte d'envoyer un message
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_name text DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_listing_id ON public.messages(listing_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT INSERT ON public.messages TO anon;
GRANT ALL ON public.messages TO service_role;

DROP POLICY IF EXISTS "messages_select_involved" ON public.messages;
CREATE POLICY "messages_select_involved" ON public.messages
  FOR SELECT TO authenticated
  USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "messages_insert_sender" ON public.messages;
CREATE POLICY "messages_insert_sender" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    recipient_id IS NOT NULL
    AND NOT public.is_blocked(auth.uid())
  );

DROP POLICY IF EXISTS "messages_insert_anon" ON public.messages;
CREATE POLICY "messages_insert_anon" ON public.messages
  FOR INSERT TO anon
  WITH CHECK (
    recipient_id IS NOT NULL
  );

DROP POLICY IF EXISTS "messages_update_recipient" ON public.messages;
CREATE POLICY "messages_update_recipient" ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "messages_delete_involved" ON public.messages;
CREATE POLICY "messages_delete_involved" ON public.messages
  FOR DELETE TO authenticated
  USING (auth.uid() = recipient_id OR auth.uid() = sender_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- ----------------------------------------------------------------------------
-- 7. Table de journal des boosts d'annonces
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id text NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boost_id text NOT NULL,
  cost integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_boosts_listing_id ON public.listing_boosts(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_boosts_user_id ON public.listing_boosts(user_id);

ALTER TABLE public.listing_boosts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.listing_boosts TO authenticated;
GRANT ALL ON public.listing_boosts TO service_role;

DROP POLICY IF EXISTS "listing_boosts_select" ON public.listing_boosts;
CREATE POLICY "listing_boosts_select" ON public.listing_boosts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "listing_boosts_insert" ON public.listing_boosts;
CREATE POLICY "listing_boosts_insert" ON public.listing_boosts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_blocked(auth.uid()));

-- ----------------------------------------------------------------------------
-- 8. Politiques RLS pour les annonces (public.listings) : Modification & Suppression
-- ----------------------------------------------------------------------------
-- Permet aux propriétaires de modifier leurs annonces (ex: boosts, vendu, modifications)
-- et aux administrateurs de tout modérer.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;

DROP POLICY IF EXISTS "listings_update_owner" ON public.listings;
CREATE POLICY "listings_update_owner" ON public.listings
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "listings_delete_owner" ON public.listings;
CREATE POLICY "listings_delete_owner" ON public.listings
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::public.app_role));


