-- 002_community_features.sql's INSERT policy assumed whoever creates the
-- agreement is always the rider — true when a post owner (rider) accepts a
-- stranger's offer to drive them, but backwards for a pooling 'offer' post,
-- where the post owner IS the driver and is the one accepting a rider's
-- request. See app/messages/[id].tsx confirmAccept and
-- hooks/useRideAgreements.ts createAgreement for the caller-side fix that
-- pairs with this policy change.
DROP POLICY IF EXISTS "Rider can create agreement" ON public.ride_agreements;

CREATE POLICY "Either party can create their agreement"
  ON public.ride_agreements FOR INSERT
  WITH CHECK (auth.uid() = rider_id OR auth.uid() = driver_id);
