-- Spanish copies of the two AI-generated texts. App language is a per-device
-- setting (AsyncStorage, store/languageStore.ts) the cron-run generators
-- can't see — and a post's insight is read by viewers in either language —
-- so each generation now returns both languages from the same single OpenAI
-- call instead of one per language/viewer. The client picks the column
-- matching its language and falls back to the English one (rows generated
-- before this migration have no Spanish copy until their next refresh).
ALTER TABLE public.ride_post_insights ADD COLUMN IF NOT EXISTS insight_text_es TEXT;
ALTER TABLE public.community_summary_cache ADD COLUMN IF NOT EXISTS summary_es TEXT;
