-- Public, minimal donor-status view. subscriptions itself stays locked to
-- "Users can view their own subscription" (auth.uid() = user_id) — amount
-- donated and billing dates are nobody else's business. This view exposes
-- only the one bit a UI badge actually needs: is this user CURRENTLY an
-- active donor. Views run with their owner's privileges by default (not the
-- querying user's RLS), so this deliberately bypasses the base table's RLS
-- for just these two columns.
create or replace view public.donor_status as
  select
    user_id,
    (status = 'active' and plan = 'donor' and (period_end is null or period_end > now())) as is_donor
  from public.subscriptions;

grant select on public.donor_status to authenticated, anon;
