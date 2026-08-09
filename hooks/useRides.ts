import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRideStore } from '@/store/rideStore';
import { RidePost, RouteStats } from '@/types';

// Two merges in one pass, both for the same reason: neither vehicle_profiles
// nor donor_status can be embedded via a normal PostgREST join. vehicle_profiles.
// user_id references auth.users, not public.profiles (unlike every other
// table), so PostgREST can't auto-embed it under profiles(...) — fixing that
// needs table-owner privileges this project doesn't have. donor_status draws
// from subscriptions, which is locked to "view your own row only" (RLS) —
// see supabase/migrations/039_donor_status_view.sql for the narrow view that
// exposes just the one bit a badge needs from that table.
async function withProfileExtras(posts: RidePost[]): Promise<RidePost[]> {
  const userIds = [...new Set(posts.map((p) => p.user_id))];
  if (userIds.length === 0) return posts;

  const [vehicleRes, donorRes] = await Promise.all([
    supabase.from('vehicle_profiles').select('user_id, insurance_self_certified').in('user_id', userIds),
    supabase.from('donor_status').select('user_id, is_donor').in('user_id', userIds),
  ]);

  const verifiedByUser = new Map<string, boolean>();
  for (const v of vehicleRes.data ?? []) verifiedByUser.set(v.user_id, v.insurance_self_certified);
  const donorByUser = new Map<string, boolean>();
  for (const d of donorRes.data ?? []) donorByUser.set(d.user_id, d.is_donor);

  return posts.map((post) => post.profile ? {
    ...post,
    profile: {
      ...post.profile,
      vehicle_profiles: [{ insurance_self_certified: verifiedByUser.get(post.user_id) ?? false }],
      is_donor: donorByUser.get(post.user_id) ?? false,
    },
  } : post);
}

export function useRides() {
  const { filters, setPosts, setLoading } = useRideStore();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ride_posts')
        .select('*, profile:profiles(full_name, avatar_url, default_role)')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (filters.type !== 'all') query = query.eq('type', filters.type);
      if (filters.originCity)
        query = query.ilike('origin_city', `%${filters.originCity}%`);
      if (filters.destinationCity)
        query = query.ilike('destination_city', `%${filters.destinationCity}%`);
      if (filters.date) {
        const start = new Date(filters.date);
        const end = new Date(filters.date);
        end.setDate(end.getDate() + 1);
        query = query
          .gte('scheduled_at', start.toISOString())
          .lt('scheduled_at', end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setPosts(await withProfileExtras((data as RidePost[]) ?? []));
    } finally {
      setLoading(false);
    }
  }, [filters, setPosts, setLoading]);

  async function createPost(
    // kind/round_trip/airport/details are optional, not required — app/post/ride.tsx
    // now collects them, but callers that don't (package/hauling forms, once they
    // exist) can still omit them and fall through to the columns' own DB defaults
    // ('ride', false, false, '{}') on insert.
    post: Omit<RidePost, 'id' | 'created_at' | 'updated_at' | 'expires_at' | 'views_count' | 'status' | 'profile' | 'kind' | 'round_trip' | 'airport' | 'details'>
      & Partial<Pick<RidePost, 'kind' | 'round_trip' | 'airport' | 'details'>>
  ) {
    const { data, error } = await supabase
      .from('ride_posts')
      .insert(post)
      .select()
      .single();
    if (error) throw error;
    return data as RidePost;
  }

  // Uploads the once-generated route map PNG (see services/routeMap.ts) to
  // the public route-maps bucket and returns its public URL, or null on
  // failure — the map is a nice-to-have, never a submission blocker.
  async function uploadRouteMap(userId: string, image: ArrayBuffer): Promise<string | null> {
    const fileName = `${userId}/${Date.now()}.png`;
    const { error } = await supabase.storage
      .from('route-maps')
      .upload(fileName, image, { contentType: 'image/png', upsert: true });
    if (error) return null;
    return supabase.storage.from('route-maps').getPublicUrl(fileName).data.publicUrl;
  }

  // Optional load photo for the hauling post form (RidePostDetailsHauling.photoUrl).
  // Same upload shape as useVehicleProfile's uploadVehiclePhoto — ArrayBuffer,
  // not Blob, since RN's Blob serialization is unreliable for storage uploads.
  async function uploadHaulingPhoto(userId: string, uri: string): Promise<string | null> {
    // Random suffix, not just Date.now() — the hauling form uploads all
    // selected photos in parallel via Promise.all, and two uploads landing
    // in the same millisecond would otherwise collide on the same filename
    // (upsert:true silently overwrites one), leaving photoUrls with the
    // same URL twice and React throwing a duplicate-key error at render.
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const { error } = await supabase.storage
      .from('hauling-photos')
      .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
    if (error) return null;
    return supabase.storage.from('hauling-photos').getPublicUrl(fileName).data.publicUrl;
  }

  async function getPostById(id: string) {
    const { data, error } = await supabase
      .from('ride_posts')
      .select('*, profile:profiles(full_name, avatar_url, default_role, phone)')
      .eq('id', id)
      .single();
    if (error) throw error;
    const [withExtras] = await withProfileExtras([data as RidePost]);
    return withExtras;
  }

  // Active posts by a given user — the public user-profile screen's
  // "Active posts" list. Same public-feed visibility rules as fetchPosts
  // (status active, not expired) since this is shown to any viewer, not
  // just the post owner.
  //
  // Also excludes posts with a completed agreement: "completed" is a status
  // on ride_agreements, not ride_posts — there's no ride_posts status value
  // for "this trip already happened" (the CHECK constraint only allows
  // active/filled/cancelled/expired), and nothing transitions a post away
  // from 'active'/'filled' when its agreement completes. Without this, a
  // finished job's post kept showing up here as if it were still open. Not
  // a scheduled_at-in-the-past filter — a genuinely still-open post with an
  // old date (never matched, never explicitly closed) is still "active" and
  // should keep showing.
  async function getPostsByUser(userId: string, limit = 5): Promise<RidePost[]> {
    const now = new Date().toISOString();
    const { data: completed, error: completedError } = await supabase
      .from('ride_agreements')
      .select('post_id')
      .or(`driver_id.eq.${userId},rider_id.eq.${userId}`)
      .eq('status', 'completed');
    if (completedError) throw completedError;
    const completedPostIds = (completed ?? []).map((a) => a.post_id);

    let query = supabase
      .from('ride_posts')
      .select('*, profile:profiles(full_name, avatar_url, default_role)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (completedPostIds.length > 0) {
      query = query.not('id', 'in', `(${completedPostIds.join(',')})`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return await withProfileExtras((data as RidePost[]) ?? []);
  }

  // supabase/migrations/009_route_price_stats.sql — historical average donation
  // for this exact origin/destination city pair. Caller must check
  // sample_size (e.g. < 3) before presenting avg_donation as anything
  // meaningful — see RouteStats' own doc comment.
  async function getRoutePriceStats(originCity: string, destinationCity: string): Promise<RouteStats> {
    const { data, error } = await supabase
      .rpc('get_route_price_stats', { p_origin_city: originCity, p_destination_city: destinationCity })
      .single();
    if (error) throw error;
    return data as RouteStats;
  }

  async function revealContact(postId: string, requesterId: string) {
    const { error } = await supabase.from('contact_reveals').upsert({
      post_id: postId,
      requester_id: requesterId,
    });
    if (error) throw error;
    // increment view count
    await supabase.rpc('increment_post_views', { post_id: postId });
  }

  // Called once per detail-screen mount (see app/ride|package|hauling/[id].tsx)
  // — this was the only wiring `increment_post_views` ever had before, via
  // the old external-contact-reveal flow that in-app messaging replaced, so
  // views_count never actually moved. Silently no-ops on failure — a missed
  // view count is never worth surfacing an error over.
  async function incrementPostViews(postId: string) {
    try {
      await supabase.rpc('increment_post_views', { post_id: postId });
    } catch {}
  }

  async function cancelPost(postId: string) {
    const { error } = await supabase
      .from('ride_posts')
      .update({ status: 'cancelled' })
      .eq('id', postId);
    if (error) throw error;
  }

  async function updatePost(
    id: string,
    updates: Partial<RidePost>,
    original: RidePost
  ) {
    const now = new Date().toISOString();
    const patch: Record<string, any> = { ...updates, edited_at: now };

    // Track original scheduled_at on first time change (compare at minute granularity to avoid
    // false positives from ISO string format differences — DB stores full precision, edit screen
    // reconstructs the string with seconds=00)
    if ('scheduled_at' in updates && updates.scheduled_at) {
      const newMin  = Math.floor(new Date(updates.scheduled_at).getTime() / 60000);
      const origMin = Math.floor(new Date(original.scheduled_at).getTime() / 60000);
      if (newMin !== origMin) {
        if (!original.original_scheduled_at) {
          patch.original_scheduled_at = original.scheduled_at;
        } else {
          const trueOrigMin = Math.floor(new Date(original.original_scheduled_at).getTime() / 60000);
          if (newMin === trueOrigMin) patch.original_scheduled_at = null;
        }
      }
    }

    // Track original donation on first donation change
    if ('suggested_donation' in updates && updates.suggested_donation !== original.suggested_donation) {
      if (original.original_suggested_donation == null) {
        patch.original_suggested_donation = original.suggested_donation ?? null;
      } else if (updates.suggested_donation === original.original_suggested_donation) {
        patch.original_suggested_donation = null; // reverted
      }
    }

    // Flag if address, city or description changed
    if (
      (updates.origin_address    !== undefined && updates.origin_address    !== original.origin_address)    ||
      (updates.destination_address !== undefined && updates.destination_address !== original.destination_address) ||
      (updates.origin_city       !== undefined && updates.origin_city       !== original.origin_city)       ||
      (updates.destination_city  !== undefined && updates.destination_city  !== original.destination_city)  ||
      (updates.description       !== undefined && updates.description       !== original.description)
    ) {
      patch.info_updated = true;
    }

    const { data, error } = await supabase
      .from('ride_posts')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as RidePost;
  }

  return { fetchPosts, createPost, uploadRouteMap, uploadHaulingPhoto, getPostById, getPostsByUser, getRoutePriceStats, revealContact, incrementPostViews, cancelPost, updatePost };
}
