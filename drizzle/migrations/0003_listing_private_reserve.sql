-- Seller-only auction details (reserve price) kept out of the public listing row.
CREATE TABLE public.listing_private (
  listing_id text PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  reserve_price numeric(14,3) CHECK (reserve_price IS NULL OR reserve_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.listing_private TO authenticated;
GRANT ALL ON public.listing_private TO service_role;
ALTER TABLE public.listing_private ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their private listing details" ON public.listing_private
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners add private details to their listings" ON public.listing_private
  FOR INSERT TO authenticated WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.owner_id = auth.uid())
  );
CREATE POLICY "Admins read private listing details" ON public.listing_private
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));