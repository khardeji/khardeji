-- Listing photos are shown to every visitor through short-lived signed links.
CREATE POLICY "Anyone can view listing photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'listing-photos');