-- Public user-profile screen's "Trips" stat. ride_agreements' own RLS
-- ("Parties can view their agreements") only lets driver_id/rider_id read a
-- row directly — a SECURITY DEFINER function is needed to expose just the
-- aggregate count to any viewer without loosening that row-level policy.
CREATE OR REPLACE FUNCTION public.get_completed_trip_count(target_user_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.ride_agreements
  WHERE (driver_id = target_user_id OR rider_id = target_user_id)
    AND status = 'completed';
$$;
