-- Settings screen's per-kind notification toggles (notif_master/rides/
-- packages/hauling) were pure UI-only local state with no backing anywhere —
-- toggling them didn't persist and didn't affect what notifications anyone
-- received. This wires them up for real: a new PUBLIC post of a given kind
-- notifies every other user opted into that kind (and into the master
-- switch). Saved-drivers-first posts (visibility = 'private') are excluded —
-- those are deliberately not a public broadcast yet.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_master   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notif_rides    BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notif_packages BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notif_hauling  BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('message', 'agreement_created', 'agreement_completed', 'badge_received', 'trip_update', 'new_post'));

CREATE OR REPLACE FUNCTION public.notify_new_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_title TEXT;
BEGIN
  IF NEW.status <> 'active' OR NEW.visibility <> 'public' THEN
    RETURN NEW;
  END IF;

  v_title := CASE NEW.kind
    WHEN 'package' THEN 'New delivery posted'
    WHEN 'hauling' THEN 'New hauling job posted'
    ELSE 'New ride posted'
  END;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    p.id, 'new_post', v_title,
    NEW.origin_city || ' → ' || NEW.destination_city,
    jsonb_build_object('post_id', NEW.id, 'post_kind', NEW.kind)
  FROM public.profiles p
  WHERE p.id <> NEW.user_id
    AND p.notif_master = TRUE
    AND (
      (NEW.kind = 'ride'    AND p.notif_rides)    OR
      (NEW.kind = 'package' AND p.notif_packages) OR
      (NEW.kind = 'hauling' AND p.notif_hauling)
    );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ride_post_new_post
  AFTER INSERT ON public.ride_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_post();
