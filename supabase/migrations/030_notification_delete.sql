-- Lets users delete their own notifications (e.g. swipe-to-delete on the
-- notifications screen) — 026_notifications.sql only granted SELECT/UPDATE.
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);
