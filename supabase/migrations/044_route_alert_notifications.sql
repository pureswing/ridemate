-- Route Intelligence's periodic re-checks (see generate-post-insight) now
-- notify the post's creator when a refresh finds conditions changed —
-- matches the design system's NotificationCenter.jsx "route-alert" type.
-- Rows are inserted by the Edge Function itself (service-role client),
-- same as every other notification type — no new RLS policy needed.
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('message', 'agreement_created', 'agreement_completed', 'badge_received', 'route_alert'));
