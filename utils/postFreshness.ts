// Drives the feed's "NEW"/"EDITED" badge (top-left corner of
// components/ride/RideCard.tsx + RideCardGrid.tsx — the mirror position of
// the top-right views-count badge). Per-viewer: backed by
// store/seenPostsStore.ts's on-device map, not a backend concept.
export type PostFreshness = 'new' | 'edited' | null;

// A post stays "new" for this long after posting if still unseen — after
// that it just quietly stops claiming to be new rather than showing a stale
// badge forever. An edit has no such window: it's relevant the moment it
// happens regardless of the post's original age, so it shows until seen.
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getPostFreshness(
  post: { created_at: string; edited_at?: string },
  lastSeenVersion: string | undefined
): PostFreshness {
  const versionAt = post.edited_at ?? post.created_at;
  if (lastSeenVersion && new Date(lastSeenVersion).getTime() >= new Date(versionAt).getTime()) {
    return null; // already seen this exact version (or a later one)
  }
  if (post.edited_at) return 'edited';
  const ageMs = Date.now() - new Date(post.created_at).getTime();
  return ageMs <= NEW_WINDOW_MS ? 'new' : null;
}
