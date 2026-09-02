-- Settings' "Trusted drivers first" toggle was pure UI-only local state
-- (default false, reset every time the user left the screen). Wired up for
-- real, defaulting to TRUE: this is a master on/off for whether the
-- saved-drivers-first publish option (PublishPicker's private + goes_public_at
-- delay, see app/post/{ride,package,hauling}.tsx) is available to the user at
-- all, NOT a search-result ordering preference — that was the old, never-
-- implemented framing this column replaces. The per-post choice to actually
-- use it still lives in PublishPicker at publish time; this only gates
-- whether that choice is offered.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trusted_drivers_first BOOLEAN NOT NULL DEFAULT TRUE;
