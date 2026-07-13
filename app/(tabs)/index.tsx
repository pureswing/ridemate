import { useEffect, useState } from 'react';
import { View, FlatList, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { useRideStore } from '@/store/rideStore';
import { useRides } from '@/hooks/useRides';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { RideCard } from '@/components/ride/RideCard';
import { HomeHeader } from '@/components/layout/HomeHeader';
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

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const header = (
    <HomeHeader
      filterType={filters.type}
      onFilterChange={(v) => setFilters({ type: v })}
      layout={layout}
      onLayoutChange={setLayout}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {loading && posts.length === 0 ? (
        // See the ScrollView-ancestor note below — same requirement applies here.
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {header}
          <ActivityIndicator style={{ marginTop: 60 }} size="large" color={theme.primary} />
        </ScrollView>
      ) : (
        // HomeHeader renders a Chip row + IconButton — those need a ScrollView
        // ancestor or they silently fail to paint (see feedback_button_scrollview_bug
        // memory), so it lives inside the FlatList as ListHeaderComponent rather
        // than pinned above it as a sibling.
        <FlatList
          key={layout}
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={layout === 'grid' ? 2 : 1}
          columnWrapperStyle={layout === 'grid' ? { gap: 12 } : undefined}
          renderItem={({ item }) => <RideCard post={item} style={layout === 'grid' ? { flex: 1 } : undefined} />}
          ListHeaderComponent={header}
          // contentContainerStyle's paddingHorizontal (below) applies to the header
          // too since FlatList renders it inside the same padded content container —
          // cancel it out so the gradient hero still bleeds edge-to-edge.
          ListHeaderComponentStyle={{ marginBottom: 16, marginHorizontal: -16 }}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchPosts} tintColor={theme.primary} />
          }
        />
      )}
    </View>
  );
}
