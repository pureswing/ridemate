-- Membership simplifies from subscriber+donor to a single donation-only plan
-- (28_membership_tiers.sql's two-tier model was replaced before shipping —
-- a $10 payer and a $20 payer cost the platform the same either way, so the
-- tier split added UI/code complexity without changing margin).
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('donor'));
