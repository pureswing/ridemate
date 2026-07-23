-- Badge-giving used to require ra.status = 'completed' (both parties
-- confirmed). The new flow triggers the mandatory badge modal immediately
-- when EITHER party presses "Mark as completed" — not after both have —
-- so the giver may not have full 'completed' status yet when they submit.
-- Loosened to: the giver must be a party to the agreement, and the
-- agreement must not already be cancelled/no_show (badges on a job that
-- didn't happen don't make sense).
DROP POLICY IF EXISTS "Users can give badges on completed agreements" ON public.ride_badges;

CREATE POLICY "Parties can give badges on active or completed agreements"
  ON public.ride_badges FOR INSERT
  WITH CHECK (
    auth.uid() = giver_id
    AND EXISTS (
      SELECT 1 FROM public.ride_agreements ra
      WHERE ra.id     = agreement_id
        AND ra.status IN ('pending', 'active', 'completed')
        AND (ra.driver_id = auth.uid() OR ra.rider_id = auth.uid())
    )
  );
