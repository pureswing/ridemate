-- Trip update alerts — notify the OTHER party in a confirmed/pending
-- agreement whenever the poster changes something about the trip
-- afterward: a real edit (date/time, price, pickup/drop-off), or a
-- cancellation (this app models "delete post" as a cancel, never a real
-- DELETE — see app/ride/[id].tsx's handleDeletePost — so cancellation
-- covers both "cancelled" and "deleted" from the user's point of view).
-- Only fires once an agreement exists; a post with no agreement yet has no
-- one to notify.
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('message', 'agreement_created', 'agreement_completed', 'badge_received', 'trip_update'));

CREATE OR REPLACE FUNCTION public.notify_trip_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_agreement RECORD;
  v_recipient UUID;
  v_changes TEXT[];
  v_title TEXT;
  v_body TEXT;
  v_is_cancel BOOLEAN;
BEGIN
  v_is_cancel := NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled';

  -- Anything else notification-worthy — a plain status churn (e.g. the
  -- active/filled toggling triggers elsewhere in the schema already do)
  -- isn't itself a "trip update" the other party needs to hear about.
  v_changes := ARRAY[]::TEXT[];
  IF NOT v_is_cancel THEN
    IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
      v_changes := array_append(v_changes, 'date/time');
    END IF;
    IF NEW.origin_address IS DISTINCT FROM OLD.origin_address OR NEW.origin_city IS DISTINCT FROM OLD.origin_city THEN
      v_changes := array_append(v_changes, 'pickup location');
    END IF;
    IF NEW.destination_address IS DISTINCT FROM OLD.destination_address OR NEW.destination_city IS DISTINCT FROM OLD.destination_city THEN
      v_changes := array_append(v_changes, 'drop-off location');
    END IF;
    IF NEW.suggested_donation IS DISTINCT FROM OLD.suggested_donation THEN
      v_changes := array_append(v_changes, 'price');
    END IF;

    IF array_length(v_changes, 1) IS NULL THEN
      RETURN NEW; -- nothing a rider/driver needs to be told about changed
    END IF;
  END IF;

  FOR v_agreement IN
    SELECT id, driver_id, rider_id FROM public.ride_agreements
    WHERE post_id = NEW.id AND status IN ('pending', 'active')
  LOOP
    -- The poster is always one side of their own post's agreement — notify
    -- whichever side isn't the poster, not whoever happened to make the
    -- edit (RLS already only lets the poster update their own post, but
    -- this avoids relying on that coincidence).
    v_recipient := CASE WHEN v_agreement.driver_id = NEW.user_id THEN v_agreement.rider_id ELSE v_agreement.driver_id END;
    IF v_recipient IS NULL THEN
      CONTINUE;
    END IF;

    IF v_is_cancel THEN
      v_title := 'Trip cancelled';
      v_body := 'The poster cancelled this trip.';
    ELSE
      v_title := 'Trip updated';
      v_body := 'The poster changed the ' || array_to_string(v_changes, ' and ') || '. Tap to review.';
    END IF;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_recipient, 'trip_update', v_title, v_body,
      jsonb_build_object('post_id', NEW.id, 'post_kind', NEW.kind, 'agreement_id', v_agreement.id, 'is_cancel', v_is_cancel)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ride_post_trip_update
  AFTER UPDATE ON public.ride_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_trip_update();
