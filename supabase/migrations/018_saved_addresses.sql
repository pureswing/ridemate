-- Saved addresses ("Address Book") — previously only session-local state in
-- app/profile/edit.tsx and each post form's SmartAddressField, never
-- persisted. One row per (user, slot); slot_id is one of 'home' | 'work' |
-- 'addr1' | 'addr2' | 'addr3' (see constants/addressBookSlots.ts).
CREATE TABLE public.saved_addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_id     TEXT NOT NULL,
  value       TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT 'addr_general',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, slot_id)
);

CREATE INDEX idx_saved_addresses_user ON public.saved_addresses(user_id);

ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved addresses"
  ON public.saved_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved addresses"
  ON public.saved_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved addresses"
  ON public.saved_addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved addresses"
  ON public.saved_addresses FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_saved_address()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER saved_addresses_touch_updated_at
  BEFORE UPDATE ON public.saved_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_saved_address();
