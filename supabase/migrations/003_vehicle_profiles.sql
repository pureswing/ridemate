-- Vehicle profiles — 1 per user, enforced by UNIQUE on user_id
CREATE TABLE public.vehicle_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid UNIQUE NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  make            text NOT NULL,
  model           text NOT NULL,
  year            integer NOT NULL CHECK (year BETWEEN 1990 AND 2030),
  color           text NOT NULL,
  photo_url       text,
  amenities       text[]  DEFAULT '{}',
  insurance_self_certified boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.vehicle_profiles ENABLE ROW LEVEL SECURITY;

-- Owner can do anything with their own vehicle profile
CREATE POLICY "Users can manage own vehicle profile"
  ON public.vehicle_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone logged in can read any vehicle profile (public info like a listing)
CREATE POLICY "Vehicle profiles are publicly readable"
  ON public.vehicle_profiles FOR SELECT
  USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_vehicle_profile_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER vehicle_profile_updated_at
  BEFORE UPDATE ON public.vehicle_profiles
  FOR EACH ROW EXECUTE FUNCTION update_vehicle_profile_updated_at();

-- Storage bucket for full-side vehicle photos (public read)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('vehicle-photos', 'vehicle-photos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their vehicle photo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Vehicle photos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-photos');

CREATE POLICY "Users can update their own vehicle photo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'vehicle-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own vehicle photo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vehicle-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
