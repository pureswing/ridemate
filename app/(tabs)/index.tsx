import { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { useRideStore } from '@/store/rideStore';
import { useRides } from '@/hooks/useRides';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { RideCard } from '@/components/ride/RideCard';
import { RideCardGrid } from '@/components/ride/RideCardGrid';
import { HomeHeader } from '@/components/layout/HomeHeader';
import { FilterDrawer, DEFAULT_FILTER_STATE, FilterState, countActiveFilters } from '@/components/ride/FilterDrawer';
import { radii } from '@/constants/themes';

function EmptyState() {
  const t = useTranslation();
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
      <View style={{ width: 72, height: 72, borderRadius: radii.xl, backgroundColor: theme.chipActiveBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Icon name="car" size={36} color={theme.primary} />
      </View>
      <Text style={{ color: theme.text, fontFamily: theme.fontDisplay, fontSize: 18, marginBottom: 8 }}>{t.feed.empty}</Text>
      <Text style={{ color: theme.muted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 }}>
        {t.feed.emptySubtitle}
      </Text>
    </View>
  );
}

export default function FeedScreen() {
  const { posts, filters, loading, setFilters } = useRideStore();
  const { fetchPosts } = useRides();
  const theme = useTheme();
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  // UI only for now — this drawer isn't wired into the actual feed query yet.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const activeAdvancedFilterCount = countActiveFilters(advancedFilters);
  // Separate from the store's `loading` (also set by filter-triggered fetches) —
  // this only tracks an explicit user pull, so switching chips doesn't pop the
  // native pull-to-refresh spinner up mid-screen.
  const [refreshing, setRefreshing] = useState(false);

  // Refetches every time this screen regains focus — not just on mount —
  // so a post created/edited/cancelled elsewhere shows up here immediately
  // instead of needing a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }

  const header = (
    <HomeHeader
      filterType={filters.type}
      onFilterChange={(v) => setFilters({ type: v })}
      onFiltersPress={() => setFiltersOpen(true)}
      activeFilterCount={activeAdvancedFilterCount}
      layout={layout}
      onLayoutChange={setLayout}
      resultsCount={posts.length}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Fixed header — a plain sibling above the list, not scrolling with it, and
          NOT wrapped in a ScrollView (a ScrollView without explicit flex/height
          doesn't measure its content for Yoga's layout and collapses/clips it —
          confirmed the hard way). This trades away the documented "Chip/IconButton
          need a ScrollView ancestor to paint" safety net (feedback_button_scrollview_bug
          memory) to get real fixed positioning — needs on-device confirmation that
          the chips/buttons still render (colors/text visible, not blank).
          HomeHeader carries its own zIndex:10 (matching every other screen's
          gradient header) — without it, a card scrolled up
          under its bottom edge paints OVER its drop shadow instead of under
          it: later siblings in the same stacking context paint on top by
          declaration order (Android's elevation alone doesn't guarantee this
          across siblings, and iOS has no elevation at all), and the list
          sits later in the tree. Putting the zIndex on the gradient itself
          (not an extra wrapping View) keeps its rounded-corner clip intact —
          an unstyled wrapper View got its own Android compositing layer,
          whose rectangular bounds showed a sliver past the rounded corner. */}
      {header}
      <View style={{ flex: 1 }}>
        {loading && posts.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 60 }} size="large" color={theme.primary} />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            key={layout}
            data={posts}
            keyExtractor={(item) => item.id}
            numColumns={layout === 'grid' ? 2 : 1}
            columnWrapperStyle={layout === 'grid' ? { gap: 12 } : undefined}
            renderItem={({ item }) =>
              layout === 'grid'
                ? <RideCardGrid post={item} style={{ flex: 1 }} />
                : <RideCard post={item} />
            }
            ListEmptyComponent={<EmptyState />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 28, paddingBottom: 16, flexGrow: 1 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
            }
          />
        )}
      </View>
      <FilterDrawer
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={advancedFilters}
        onChange={setAdvancedFilters}
      />
    </View>
  );
}
