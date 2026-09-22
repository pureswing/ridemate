-- Storage bucket for the current downloadable APK, used by the invite-email
-- flow's APK_DOWNLOAD_URL (see supabase/functions/send-invite-email/index.ts).
-- Unlike per-user buckets (003/014/016), this is admin/service-role-only for
-- writes — no regular user ever uploads here, a new build just overwrites
-- the same object path so the public URL never changes.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('app-releases', 'app-releases', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "App releases are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app-releases');
