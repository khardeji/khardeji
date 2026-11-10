-- Live home-page figures: only aggregate counts are exposed, never rows.
CREATE OR REPLACE FUNCTION public.site_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'listings', (SELECT count(*) FROM public.listings WHERE status = 'approved'),
    'members', (SELECT count(*) FROM public.profiles),
    'auctions', (SELECT count(*) FROM public.listings WHERE status = 'approved' AND sale_type = 'enchere'),
    'sales', (SELECT count(*) FROM public.listings WHERE status = 'sold')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.site_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_stats() TO anon, authenticated, service_role;