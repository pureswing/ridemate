-- Storage bucket for the hauling post form's optional load photo
-- (RidePostDetailsHauling.photoUrl) — same pattern as route-maps (014) and
-- vehicle-photos (003): per-owner INSERT/UPDATE/DELETE, public SELECT.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('hauling-photos', 'hauling-photos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own hauling photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'hauling-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Hauling photos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hauling-photos');

CREATE POLICY "Users can update their own hauling photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'hauling-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own hauling photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'hauling-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
