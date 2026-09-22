import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { Chip } from '@/components/ui/Chip';
import { Switch } from '@/components/ui/Switch';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, radii, shadows } from '@/constants/themes';
import { VEHICLE_TYPES, CLIMATE_PREFS, CLEANLINESS_PREFS, PET_PREFS, PICKUP_PREFS, DRIVER_LANGUAGE_PREFS, COMFORT_PREFS, ATMOSPHERE_PREFS, translatePrefLabel } from '@/constants/rideFormOptions';
import { ACCESSIBILITY_OPTIONS } from '@/constants/accessibilityOptions';
import { RidePostKind } from '@/types';

export interface FilterState {
  minSeats: number; // 0 = any
  maxPrice: number; // 0 = any
  features: string[];
  // myPostsOnly is a real, wired-up filter (unlike the rest of this drawer,
  // still UI-only — see this file's own header comment), applied client-side
  // in app/(tabs)/index.tsx's visiblePosts. Service (kind) and Origin city
  // used to live here too, but both are real AND shared with other real
  // state (the header's own quick chips for kind; the rideStore's own
  // server-side query for originCity), so they're lifted out and passed in
  // as their own prop pairs instead of living in this locally-owned bag.
  myPostsOnly: boolean;
  airportOnly: boolean;
  verifiedOnly: boolean;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  minSeats: 0,
  maxPrice: 0,
  features: [],
  myPostsOnly: false,
  airportOnly: false,
  verifiedOnly: false,
};

export function countActiveFilters(f: FilterState, kind: 'all' | RidePostKind, originCity: string): number {
  return [
    kind !== 'all',
    originCity !== '',
    f.minSeats > 0,
    f.maxPrice > 0,
    f.features.length > 0,
    f.myPostsOnly,
    f.airportOnly,
    f.verifiedOnly,
  ].filter(Boolean).length;
}

// Reuses the exact same option catalogs as the ride post form
// (constants/rideFormOptions.ts) instead of a separate hand-maintained
// list — "No preference" filtered out since it's meaningless as a filter
// (an unchecked category already means "no preference"). English-only,
// matching that file's own established precedent against half-translating
// ~50 more strings (see its header comment) — EXCEPT comfort/climateControl/
// cleanliness, which pass `translate` (translatePrefLabel) so the option
// stays the real English value as the storage key, with just the rendered
// label going through the same lookup app/post/ride.tsx uses.
function toFeatureItems(catKey: string, options: string[], translate?: (label: string) => string): { key: string; label: string }[] {
  return options.filter((o) => o !== 'No preference').map((label) => ({ key: `${catKey}:${label}`, label: translate ? translate(label) : label }));
}

interface Props {
  visible: boolean;
  onClose: () => void;
  value: FilterState;
  onChange: (v: FilterState) => void;
  // Real, shared with the header's own quick chips (via the rideStore) —
  // see FilterState's header comment for why this isn't part of `value`.
  kind: 'all' | RidePostKind;
  onKindChange: (v: 'all' | RidePostKind) => void;
  // Real origin cities present in the feed for the active kind selection —
  // `posts` is already fetched server-side scoped to `kind` (see useRides),
  // so this is just the distinct origin_city values from that same result
  // set, computed by the caller (app/(tabs)/index.tsx).
  cities: string[];
  // Real, server-side (useRides' fetchPosts ilike-filters on this) — '' = any.
  originCity: string;
  onOriginCityChange: (v: string) => void;
}

// Right-sliding filter drawer for the home feed — mirrors the Feed.jsx
// design prototype's filter drawer, not the app's usual bottom-sheet
// (BottomSheet.tsx) shell, since the design specifically slides in from the
// right at ~82% width. UI only for now: value/onChange are fully controlled
// by the caller so a later pass can wire real feed filtering without
// touching this component.
export function FilterDrawer({ visible, onClose, value, onChange, kind, onKindChange, cities, originCity, onOriginCityChange }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const drawerWidth = Math.min(screenWidth * 0.82, 340);

  const [mounted, setMounted] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const drawerTranslateX = useRef(new Animated.Value(drawerWidth)).current;
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // A city selected under one service (e.g. Miami hauling) can vanish from
  // the list after switching kind — fall back to "any" rather than keep a
  // selection that no longer corresponds to anything in `cities`.
  useEffect(() => {
    if (originCity !== '' && !cities.includes(originCity)) {
      onOriginCityChange('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(drawerTranslateX, { toValue: drawerWidth, duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    backdropOpacity.setValue(0);
    drawerTranslateX.setValue(drawerWidth);
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(drawerTranslateX, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted) return null;

  const activeCount = countActiveFilters(value, kind, originCity);
  const accent = theme.gradientJade[0];

  function patch(p: Partial<FilterState>) {
    onChange({ ...value, ...p });
  }

  function toggleFeature(item: string) {
    patch({ features: value.features.includes(item) ? value.features.filter((f) => f !== item) : [...value.features, item] });
  }

  const FEATURE_CATEGORIES: { key: string; label: string; items: { key: string; label: string }[] }[] = [
    // Comfort/Ride Atmosphere/Accessibility now reuse the exact same option
    // catalogs as the ride post form (constants/rideFormOptions.ts,
    // constants/accessibilityOptions.ts) instead of a separate hand-picked
    // list, so a filter selection actually corresponds to something a post
    // could really declare.
    { key: 'comfort', label: t.filterDrawer.featureCategories.comfort, items: toFeatureItems('comfort', COMFORT_PREFS, (l) => translatePrefLabel(l, t.locale)) },
    { key: 'entertainment', label: t.filterDrawer.featureCategories.entertainment, items: toFeatureItems('entertainment', ATMOSPHERE_PREFS) },
    {
      key: 'accessibility',
      label: t.filterDrawer.featureCategories.accessibility,
      items: ACCESSIBILITY_OPTIONS.map((o) => ({ key: `accessibility:${o.id}`, label: o.label })),
    },
    { key: 'vehicleType', label: t.filterDrawer.featureCategories.vehicleType, items: toFeatureItems('vehicleType', VEHICLE_TYPES) },
    { key: 'climateControl', label: t.filterDrawer.featureCategories.climateControl, items: toFeatureItems('climateControl', CLIMATE_PREFS, (l) => translatePrefLabel(l, t.locale)) },
    { key: 'cleanliness', label: t.filterDrawer.featureCategories.cleanliness, items: toFeatureItems('cleanliness', CLEANLINESS_PREFS, (l) => translatePrefLabel(l, t.locale)) },
    { key: 'petTransportation', label: t.filterDrawer.featureCategories.petTransportation, items: toFeatureItems('petTransportation', PET_PREFS) },
    { key: 'pickupPreferences', label: t.filterDrawer.featureCategories.pickupPreferences, items: toFeatureItems('pickupPreferences', PICKUP_PREFS) },
    { key: 'driverLanguage', label: t.filterDrawer.featureCategories.driverLanguage, items: toFeatureItems('driverLanguage', DRIVER_LANGUAGE_PREFS) },
  ];

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity, flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={{
            width: drawerWidth,
            height: '100%',
            backgroundColor: theme.background,
            transform: [{ translateX: drawerTranslateX }],
            ...shadows.lg,
          }}
        >
          {/* Header */}
          <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: theme.text }}>{t.filterDrawer.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {activeCount > 0 && (
                <Pressable onPress={() => { onChange(DEFAULT_FILTER_STATE); onKindChange('all'); onOriginCityChange(''); }}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: accent }}>{t.filterDrawer.clearAll}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={onClose}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="close" size={15} color={theme.textFaint} />
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 24 }} showsVerticalScrollIndicator={false}>
            {/* Service — shared with the header's own quick chips, see Props */}
            <Section label={t.filterDrawer.service} theme={theme}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Chip size="sm" selected={kind === 'all'} color={theme.gradientJade} shadow={shadows.xs} onPress={() => onKindChange('all')}>{t.filterDrawer.typeAll}</Chip>
                <Chip size="sm" selected={kind === 'ride'} color={theme.gradientJade} shadow={shadows.xs} onPress={() => onKindChange('ride')}>{t.filterDrawer.serviceRides}</Chip>
                <Chip size="sm" selected={kind === 'package'} color={theme.gradientJade} shadow={shadows.xs} onPress={() => onKindChange('package')}>{t.filterDrawer.serviceCourier}</Chip>
                <Chip size="sm" selected={kind === 'hauling'} color={theme.gradientJade} shadow={shadows.xs} onPress={() => onKindChange('hauling')}>{t.filterDrawer.serviceHauling}</Chip>
              </View>
            </Section>

            {/* Min seats */}
            <Section label={`${t.filterDrawer.minSeats}: ${value.minSeats === 0 ? t.filterDrawer.any : `${value.minSeats}+`}`} theme={theme}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[0, 1, 2, 3, 4].map((n) => {
                  const selected = value.minSeats === n;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => patch({ minSeats: n })}
                      style={{
                        flex: 1, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: selected ? accent : theme.surface,
                        borderWidth: selected ? 0 : 1, borderColor: theme.border,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.bodyExtraBold, fontSize: 13, color: selected ? '#fff' : theme.muted,
                          // includeFontPadding:false strips Android's default extra
                          // vertical padding around custom TTFs — without it this
                          // bold font sits visibly off-center inside the chip.
                          includeFontPadding: false,
                          textAlignVertical: 'center',
                        }}
                      >
                        {n === 0 ? t.filterDrawer.any : `${n}+`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>

            {/* Origin city — same collapsible-category format as Features & extras */}
            <Section label={t.filterDrawer.originCity} theme={theme}>
              <CategoryGroup
                catKey="originCity"
                label={t.filterDrawer.originCity}
                items={[{ key: 'all', label: t.filterDrawer.anyCity }, ...cities.map((c) => ({ key: c, label: c }))]}
                selectedKeys={[originCity === '' ? 'all' : originCity]}
                onToggleItem={(key) => onOriginCityChange(key === 'all' ? '' : key)}
                multi={false}
                openCategory={openCategory}
                setOpenCategory={setOpenCategory}
                theme={theme}
                accent={accent}
              />
            </Section>

            {/* Max price */}
            <Section label={`${t.filterDrawer.maxPrice}: ${value.maxPrice === 0 ? t.filterDrawer.any : `$${value.maxPrice}`}`} theme={theme}>
              <RangeSlider min={0} max={150} step={10} value={value.maxPrice} onChange={(v) => patch({ maxPrice: v })} accentColor={accent} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint }}>{t.filterDrawer.any}</Text>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint }}>$150+</Text>
              </View>
            </Section>

            {/* Features & extras */}
            <Section label={t.filterDrawer.featuresExtras} theme={theme}>
              <View style={{ gap: 6 }}>
                {FEATURE_CATEGORIES.map((cat) => (
                  <CategoryGroup
                    key={cat.key}
                    catKey={cat.key}
                    label={cat.label}
                    items={cat.items}
                    selectedKeys={value.features}
                    onToggleItem={toggleFeature}
                    multi
                    openCategory={openCategory}
                    setOpenCategory={setOpenCategory}
                    theme={theme}
                    accent={accent}
                  />
                ))}
              </View>
            </Section>

            {/* Options */}
            <Section label={t.filterDrawer.options} theme={theme}>
              <View style={{ gap: 14 }}>
                <ToggleLine label={t.filterDrawer.myPostsOnly} sub={t.filterDrawer.myPostsOnlySub} value={value.myPostsOnly} onChange={(v) => patch({ myPostsOnly: v })} theme={theme} />
                <ToggleLine label={t.filterDrawer.airportOnly} sub={t.filterDrawer.airportOnlySub} value={value.airportOnly} onChange={(v) => patch({ airportOnly: v })} theme={theme} />
                <ToggleLine label={t.filterDrawer.verifiedOnly} sub={t.filterDrawer.verifiedOnlySub} value={value.verifiedOnly} onChange={(v) => patch({ verifiedOnly: v })} theme={theme} />
              </View>
            </Section>
          </ScrollView>

          {/* Apply */}
          <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Pressable onPress={onClose} style={{ height: 50, borderRadius: radii.md, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: '#fff' }}>
                {activeCount === 0
                  ? t.filterDrawer.done
                  : activeCount === 1
                  ? t.filterDrawer.applyOne
                  : t.filterDrawer.applyMany.replace('{count}', String(activeCount))}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function Section({ label, theme, children }: { label: string; theme: ReturnType<typeof useTheme>; children: React.ReactNode }) {
  return (
    <View>
      <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: theme.textFaint, marginBottom: 10 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

// Collapsible category row — shared by Features & extras (multi-select
// checkboxes) and Origin city (single-select, radio-style). `openCategory`
// is a single shared string so only one group across BOTH sections is ever
// expanded at a time, keyed by each group's own catKey.
function CategoryGroup({
  catKey, label, items, selectedKeys, onToggleItem, multi, openCategory, setOpenCategory, theme, accent,
}: {
  catKey: string;
  label: string;
  items: { key: string; label: string }[];
  selectedKeys: string[];
  onToggleItem: (key: string) => void;
  multi: boolean;
  openCategory: string | null;
  setOpenCategory: (k: string | null) => void;
  theme: ReturnType<typeof useTheme>;
  accent: string;
}) {
  const open = openCategory === catKey;
  const selCount = items.filter((it) => selectedKeys.includes(it.key)).length;
  return (
    <View style={{ borderRadius: radii.md, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
      <Pressable
        onPress={() => setOpenCategory(open ? null : catKey)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14, backgroundColor: theme.surface }}
      >
        <Icon name={open ? 'chevron_down' : 'chevron_right'} size={14} color={theme.textFaint} />
        <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 13.5, color: theme.text }}>{label}</Text>
        {/* Single-select groups (origin city) always have exactly one key
            selected by design (defaults to "all") — a count badge there
            wouldn't signal anything useful, so it's multi-select only. */}
        {multi && selCount > 0 && (
          <View style={{ backgroundColor: accent + '22', borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 11, color: accent }}>{selCount}</Text>
          </View>
        )}
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: theme.textFaint }}>{items.length}</Text>
      </Pressable>
      {open && (
        <View style={{ backgroundColor: theme.surfaceAlt }}>
          {items.map((it) => {
            const checked = selectedKeys.includes(it.key);
            return (
              <Pressable
                key={it.key}
                onPress={() => onToggleItem(it.key)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, paddingLeft: 38, borderTopWidth: 1, borderTopColor: theme.border }}
              >
                <View style={{
                  width: 20, height: 20, borderRadius: multi ? 6 : 10, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: checked && multi ? accent : 'transparent',
                  borderWidth: checked && multi ? 0 : 1.5,
                  borderColor: checked ? accent : theme.border,
                }}>
                  {checked && multi && <Icon name="check" size={12} color="#fff" />}
                  {checked && !multi && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: accent }} />}
                </View>
                <Text style={{ flex: 1, fontFamily: checked ? fonts.bodyBold : fonts.bodyMedium, fontSize: 13, color: checked ? theme.text : theme.muted }}>
                  {it.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function ToggleLine({ label, sub, value, onChange, theme }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.text }}>{label}</Text>
        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint, marginTop: 2 }}>{sub}</Text>
      </View>
      <Switch checked={value} onChange={onChange} size="sm" />
    </View>
  );
}
