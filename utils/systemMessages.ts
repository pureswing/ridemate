import { useTranslation } from '@/hooks/useTranslation';

// Server-inserted system messages carry a marker instead of text (they're
// written once for every participant, whatever their language) — e.g.
// 'system:post_reposted:date,price' from on_post_repost_cleanup in
// 070_post_expiry_and_repost.sql. Client-written ones (offer accepted) are
// already plain text and pass through unchanged.
export function systemMessageText(body: string, t: ReturnType<typeof useTranslation>): string {
  if (!body.startsWith('system:post_reposted:')) return body;
  const keys = body.slice('system:post_reposted:'.length).split(',').filter(Boolean);
  const labels = keys.map((k) => (t.repost.changeLabels as Record<string, string>)[k]).filter(Boolean);
  return labels.length
    ? t.repost.systemRepostedChanged.replace('{changes}', labels.join(', '))
    : t.repost.systemReposted;
}
