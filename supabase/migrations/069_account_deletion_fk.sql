-- Real in-app account deletion (App Store guideline 5.1.1(v)) goes through
-- the delete-account Edge Function, which calls auth.admin.deleteUser —
-- profiles and every per-user table cascade from there (all CASCADE, or
-- SET NULL for audit_logs/invites.accepted_by). The one exception was
-- ride_agreements.cancelled_by (NO ACTION), which could block the delete
-- whenever the cancelling user isn't also the row's rider/driver. Keep
-- the agreement and just forget who cancelled it.
ALTER TABLE public.ride_agreements DROP CONSTRAINT ride_agreements_cancelled_by_fkey;
ALTER TABLE public.ride_agreements
  ADD CONSTRAINT ride_agreements_cancelled_by_fkey
  FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
