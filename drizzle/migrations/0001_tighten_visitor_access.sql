-- Visitors (not signed in) may only read the public catalogue and prices; nothing else.
REVOKE ALL ON public.profiles, public.user_roles, public.listing_private, public.categories, public.listings, public.token_packs, public.boost_services, public.plans FROM anon;
GRANT SELECT ON public.categories, public.listings, public.token_packs, public.boost_services, public.plans TO anon;

-- Signed-in members get only what their policies use.
REVOKE ALL ON public.profiles, public.user_roles, public.listing_private, public.categories, public.listings, public.token_packs, public.boost_services, public.plans FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.listing_private TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories, public.listings, public.token_packs, public.boost_services, public.plans TO authenticated;