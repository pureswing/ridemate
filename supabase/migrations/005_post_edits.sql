-- Allow tracking post edits vs. original values
-- original_scheduled_at: the pickup time when the post was first created (set once on first time edit)
-- original_suggested_donation: the donation when first created (set once on first donation edit)
-- info_updated: true if origin/destination/description changed after creation
-- edited_at: timestamp of the last edit

ALTER TABLE ride_posts ADD COLUMN IF NOT EXISTS original_scheduled_at   TIMESTAMPTZ;
ALTER TABLE ride_posts ADD COLUMN IF NOT EXISTS original_suggested_donation NUMERIC(10,2);
ALTER TABLE ride_posts ADD COLUMN IF NOT EXISTS info_updated             BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ride_posts ADD COLUMN IF NOT EXISTS edited_at                TIMESTAMPTZ;
