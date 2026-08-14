-- Route Intelligence's route_alert notification flow (migration 044) is
-- being removed entirely, not just its UI — generate-post-insight no longer
-- writes these. Delete existing rows before tightening the CHECK constraint
-- back to the original 4 types, since the constraint would otherwise reject
-- rows already in the table.
DELETE FROM public.notifications WHERE type = 'route_alert';

ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('message', 'agreement_created', 'agreement_completed', 'badge_received'));
