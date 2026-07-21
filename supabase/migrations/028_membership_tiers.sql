-- Membership screen adopts the design's free/subscriber/donor model (flat
-- $20/mo subscriber, pick-your-amount donor) instead of the old
-- monthly/annual/donation plan. Subscriber and donor are feature-identical;
-- amount_donated already covers the donor's chosen amount, no other column
-- changes needed. UI-only mock — no write policy is added here, client
-- writes still go through the app's local-only optimistic state.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('subscriber', 'donor'));
