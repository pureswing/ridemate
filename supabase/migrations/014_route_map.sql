-- Cached static route map — generated once at post-creation time (Directions
-- API for the route polyline + Static Maps API baked into one PNG) and
-- stored, so every future viewer of the post just loads a stored image
-- instead of RouteMap.tsx making a fresh Static Maps (and previously,
-- Distance Matrix) call on every view.
ALTER TABLE public.ride_posts
  ADD COLUMN IF NOT EXISTS route_map_url TEXT;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('route-maps', 'route-maps', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own route map"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'route-maps'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Route maps are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'route-maps');

CREATE POLICY "Users can update their own route map"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'route-maps'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own route map"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'route-maps'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
