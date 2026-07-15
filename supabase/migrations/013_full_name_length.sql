-- Enforces the 16-char display name limit at the DB level — the app's
-- maxLength on the Input is UX only and doesn't stop a direct API call from
-- setting a longer value. NOT VALID skips checking pre-existing rows (some may
-- already exceed 16 chars from before this limit existed) while still blocking
-- any future insert/update that violates it.
ALTER TABLE public.profiles
  ADD CONSTRAINT full_name_length CHECK (char_length(full_name) <= 16) NOT VALID;
