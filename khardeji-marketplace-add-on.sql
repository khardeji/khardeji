-- ============================================================================
-- Khardeji — Module Marketplace (Enchères, Offres, Demandes de Quantité & Notifications)
-- À exécuter dans le Supabase SQL Editor de votre projet Supabase.
-- Idempotent : peut être réexécuté sans risque.
-- ============================================================================

-- 1. Table des favoris (si non existante)
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
CREATE POLICY "favorites_select_own" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
CREATE POLICY "favorites_insert_own" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND NOT public.is_blocked(auth.uid()));
DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
CREATE POLICY "favorites_delete_own" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. Table des offres de négociation (Incoming / Outgoing Offers)
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id text NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  original_price numeric NOT NULL,
  offered_price numeric NOT NULL CHECK (offered_price > 0),
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'piece',
  difference numeric NOT NULL,
  percentage numeric NOT NULL,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_buyer_not_seller CHECK (buyer_id <> seller_id)
);

CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON public.offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_id ON public.offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_listing_id ON public.offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;

DROP POLICY IF EXISTS "offers_select_party" ON public.offers;
CREATE POLICY "offers_select_party" ON public.offers
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "offers_insert_buyer" ON public.offers;
CREATE POLICY "offers_insert_buyer" ON public.offers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id AND auth.uid() <> seller_id AND NOT public.is_blocked(auth.uid()));

DROP POLICY IF EXISTS "offers_update_seller_or_admin" ON public.offers;
CREATE POLICY "offers_update_seller_or_admin" ON public.offers
  FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Table des demandes de quantité (Quantity Requests)
CREATE TABLE IF NOT EXISTS public.quantity_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id text NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_quantity numeric NOT NULL CHECK (requested_quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total_value numeric NOT NULL CHECK (total_value >= 0),
  unit text NOT NULL DEFAULT 'piece',
  delivery_location text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_qty_buyer_not_seller CHECK (buyer_id <> seller_id)
);

CREATE INDEX IF NOT EXISTS idx_quantity_requests_seller ON public.quantity_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_quantity_requests_buyer ON public.quantity_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_quantity_requests_listing ON public.quantity_requests(listing_id);

ALTER TABLE public.quantity_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.quantity_requests TO authenticated;
GRANT ALL ON public.quantity_requests TO service_role;

DROP POLICY IF EXISTS "qty_requests_select_party" ON public.quantity_requests;
CREATE POLICY "qty_requests_select_party" ON public.quantity_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "qty_requests_insert_buyer" ON public.quantity_requests;
CREATE POLICY "qty_requests_insert_buyer" ON public.quantity_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id AND auth.uid() <> seller_id AND NOT public.is_blocked(auth.uid()));

DROP POLICY IF EXISTS "qty_requests_update_seller_or_admin" ON public.quantity_requests;
CREATE POLICY "qty_requests_update_seller_or_admin" ON public.quantity_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. Table des enchères (Bids History)
CREATE TABLE IF NOT EXISTS public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id text NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bids_listing_id ON public.bids(listing_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON public.bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON public.bids(listing_id, amount DESC);

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.bids TO authenticated;
GRANT SELECT ON public.bids TO anon;
GRANT ALL ON public.bids TO service_role;

DROP POLICY IF EXISTS "bids_select_all" ON public.bids;
CREATE POLICY "bids_select_all" ON public.bids
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "bids_insert_bidder" ON public.bids;
CREATE POLICY "bids_insert_bidder" ON public.bids
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = bidder_id AND NOT public.is_blocked(auth.uid()));

-- 5. Table des notifications utilisateur
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title jsonb NOT NULL,
  message jsonb NOT NULL,
  listing_id text REFERENCES public.listings(id) ON DELETE CASCADE,
  link text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Fonctions transactionnelles pour éviter le sur-stock (overselling)
CREATE OR REPLACE FUNCTION public.accept_quantity_request(_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_req record;
  v_stock numeric;
  v_seller_id uuid;
BEGIN
  v_seller_id := auth.uid();
  SELECT * INTO v_req FROM public.quantity_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_req.seller_id <> v_seller_id AND NOT public.has_role(v_seller_id, 'admin'::public.app_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_pending');
  END IF;

  SELECT stock INTO v_stock FROM public.listings WHERE id = v_req.listing_id FOR UPDATE;
  IF v_stock < v_req.requested_quantity THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_stock', 'available', v_stock);
  END IF;

  UPDATE public.listings
  SET stock = v_stock - v_req.requested_quantity,
      status = CASE WHEN v_stock - v_req.requested_quantity <= 0 THEN 'sold' ELSE status END
  WHERE id = v_req.listing_id;

  UPDATE public.quantity_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = _request_id;

  RETURN jsonb_build_object('ok', true, 'remaining_stock', v_stock - v_req.requested_quantity);
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_quantity_request(uuid) TO authenticated, service_role;

