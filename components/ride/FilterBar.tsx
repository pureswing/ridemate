import { useState } from 'react';
import { View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconName } from '@/constants/icons';
import { useRideStore } from '@/store/rideStore';
import { PostType } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  onFilter: (counts?: { offer: number; request: number }) => void;
  offerCount?: number;
  requestCount?: number;
}

export function FilterBar({ onFilter, offerCount, requestCount }: Props) {
  const { filters, setFilters } = useRideStore();
  const [expanded, setExpanded] = useState(false);
  const t = useTranslation();
  const theme = useTheme();

  const TYPE_OPTIONS: { label: string; sub?: string; value: 'all' | PostType; icon?: IconName }[] = [
    { label: t.filterBar.all, value: 'all' },
    { label: t.filterBar.drivers,    sub: offerCount != null ? String(offerCount) : undefined,    value: 'offer',   icon: 'car' },
    { label: t.filterBar.passengers, sub: requestCount != null ? String(requestCount) : undefined, value: 'request', icon: 'person' },
  ];

  function applyType(value: 'all' | PostType) {
    setFilters({ type: value });
    onFilter();
  }

  function clearFilters() {
    setFilters({ originCity: '', destinationCity: '', date: '' });
    onFilter();
  }

  const hasActiveFilters = filters.originCity || filters.destinationCity || filters.date;

  return (
    <View style={{ backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: 'row', alignItems: 'center' }}
      >
        {TYPE_OPTIONS.map((opt) => {
          const active = filters.type === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => applyType(opt.value)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 16, paddingVertical: 9,
                borderRadius: 99,
                backgroundColor: active ? theme.chipActiveBg : theme.chipInactiveBg,
                borderWidth: active ? 0 : 1,
                borderColor: theme.chipInactiveBorder,
                marginRight: 4,
              }}
            >
              {opt.icon && (
                <Icon
                  name={opt.icon}
                  size={12}
                  color={active ? theme.chipActiveText : theme.chipInactiveText}
                />
              )}
              <Text style={{ fontSize: 13, fontFamily: theme.fontDisplay, color: active ? theme.chipActiveText : theme.chipInactiveText }}>
                {opt.label}
              </Text>
              {opt.sub && (
                <View style={{
                  backgroundColor: active ? 'rgba(255,255,255,0.25)' : theme.chipInactiveBorder,
                  borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1,
                }}>
                  <Text style={{ fontSize: 11, fontFamily: theme.fontDisplay, color: active ? theme.chipActiveText : theme.chipInactiveText }}>
                    {opt.sub}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 16, paddingVertical: 9, borderRadius: 99,
            backgroundColor: hasActiveFilters ? theme.primary + '20' : theme.chipInactiveBg,
            borderWidth: 1,
            borderColor: hasActiveFilters ? theme.primary : theme.chipInactiveBorder,
          }}
        >
          <Icon name="filter" size={12} color={hasActiveFilters ? theme.primary : theme.chipInactiveText} />
          <Text style={{ fontSize: 13, fontFamily: theme.fontDisplay, color: hasActiveFilters ? theme.primary : theme.chipInactiveText }}>
            {hasActiveFilters ? t.filterBar.activeFilters : t.filterBar.filters}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
          {[
            { ph: t.filterBar.originPlaceholder,      key: 'originCity',       val: filters.originCity },
            { ph: t.filterBar.destinationPlaceholder, key: 'destinationCity',  val: filters.destinationCity },
            { ph: t.filterBar.datePlaceholder,        key: 'date',             val: filters.date, numeric: true },
          ].map((f) => (
            <TextInput
              key={f.key}
              style={{
                backgroundColor: theme.surfaceAlt,
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
                fontSize: 14, color: theme.text,
                borderWidth: 1, borderColor: theme.border,
              }}
              placeholder={f.ph}
              placeholderTextColor={theme.muted}
              value={f.val}
              onChangeText={(v) => setFilters({ [f.key]: v })}
              keyboardType={f.numeric ? 'numeric' : 'default'}
              onSubmitEditing={() => onFilter()}
            />
          ))}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {hasActiveFilters && (
              <TouchableOpacity
                onPress={clearFilters}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' }}
              >
                <Text style={{ color: theme.textSecondary, fontFamily: theme.fontDisplay, fontSize: 14 }}>{t.filterBar.clear}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => { onFilter(); setExpanded(false); }}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: theme.fontDisplay, fontSize: 14 }}>{t.filterBar.search}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
