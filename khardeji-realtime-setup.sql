-- ============================================================================
-- KHARDÉJI - ACTIVATION DU TEMPS RÉEL (SUPABASE REALTIME)
-- ============================================================================
-- Ce script configure la réplication temps réel (publication supabase_realtime)
-- pour que le frontend reçoive instantanément :
--   1. Les messages de chat en direct (style Messenger)
--   2. Les offres de négociation de prix
--   3. Les demandes de quantité (gros / stock)
--   4. Les enchères en direct (bids)
--   5. Les notifications utilisateur
--   6. Les demandes de jetons / abonnements
--   7. Les soldes de jetons des profils
--   8. Le statut des annonces (vendu, validé, etc.)
--
-- Instructions :
--   Copiez-collez l'intégralité de ce script dans l'éditeur SQL de votre projet
--   Supabase (Dashboard > SQL Editor > New query > Run).
-- ============================================================================

-- 1. Configuration REPLICA IDENTITY FULL
-- Permet à Supabase Realtime de transmettre toutes les colonnes lors d'un UPDATE ou DELETE
ALTER TABLE IF EXISTS public.messages REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.offers REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.quantity_requests REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.bids REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.notifications REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.subscription_requests REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.profiles REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.listings REPLICA IDENTITY FULL;

-- 2. Ajout des tables à la publication `supabase_realtime`
DO $$
BEGIN
  -- Table des messages de chat
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
  END IF;

  -- Table des offres de négociation
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'offers') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'offers') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
    END IF;
  END IF;

  -- Table des demandes de quantité
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quantity_requests') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'quantity_requests') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.quantity_requests;
    END IF;
  END IF;

  -- Table des enchères en direct
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bids') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bids') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
    END IF;
  END IF;

  -- Table des notifications
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;

  -- Table des demandes de souscription / packs jetons
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscription_requests') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'subscription_requests') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_requests;
    END IF;
  END IF;

  -- Table des profils (solde de jetons instantané)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
  END IF;

  -- Table des annonces
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'listings') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'listings') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
    END IF;
  END IF;
END $$;

-- 3. Vérification des tables activées
SELECT pubname, schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
