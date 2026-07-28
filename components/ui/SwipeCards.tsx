import { useRef, useState } from 'react';
import { View, ScrollView, NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  items: { key: string; node: React.ReactNode }[];
}

// Horizontal paging carousel with a dot indicator — matches the design's
// swipe-between-related-cards pattern (Comunidad, Actividad, Finanzas
// sections). Uses ScrollView's own pagingEnabled rather than a custom
// gesture responder — this app has a documented touch-freeze bug with
// gesture-handler components nested awkwardly, ScrollView paging avoids it.
export function SwipeCards({ items }: Props) {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 40; // matches the screen's 20px horizontal padding
  const [index, setIndex] = useState(0);
  // Cards vary a lot in content height (badges vs. rank vs. cancellations),
  // so the ScrollView's height tracks whichever slide is currently active —
  // otherwise every slide sits at the tallest slide's height, leaving dead
  // space under the shorter ones.
  const heights = useRef<number[]>([]);
  const [activeHeight, setActiveHeight] = useState<number | undefined>(undefined);

  function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    setIndex(clamped);
    if (heights.current[clamped] != null) setActiveHeight(heights.current[clamped]);
  }

  function onSlideLayout(i: number, e: LayoutChangeEvent) {
    const h = e.nativeEvent.layout.height;
    heights.current[i] = h;
    if (i === index && activeHeight == null) setActiveHeight(h);
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        style={activeHeight != null ? { height: activeHeight } : undefined}
      >
        {items.map((item, i) => (
          // Padding here (not on the card itself) gives each card's shadow
          // room to render on every edge — a ScrollView clips its content to
          // its own viewport, and with zero slack around a tightly-sized
          // slide the shadow was getting clipped everywhere except the
          // corners. The outer box stays exactly cardWidth so snapToInterval
          // paging math is unaffected.
          <View key={item.key} style={{ width: cardWidth, paddingHorizontal: 6, paddingVertical: 8 }} onLayout={(e) => onSlideLayout(i, e)}>
            {item.node}
          </View>
        ))}
      </ScrollView>
      {items.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {items.map((item, i) => (
            <View
              key={item.key}
              style={{
                width: i === index ? 20 : 7, height: 7, borderRadius: 99,
                backgroundColor: i === index ? theme.gold400 : theme.border,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
