import { useState } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { FLORIDA_AIRPORTS, Airport } from '@/constants/florida-airports';

interface Props {
  label?: string;
  selectedAirport: Airport | null;
  onSelect: (airport: Airport) => void;
  onClear: () => void;
  style?: object;
}

export function AirportPicker({ label, selectedAirport, onSelect, onClear, style }: Props) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = FLORIDA_AIRPORTS.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.iata.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q)
    );
  });

  function handleSelect(airport: Airport) {
    onSelect(airport);
    setOpen(false);
    setSearch('');
  }

  function handleClear() {
    onClear();
    setSearch('');
    setOpen(false);
  }

  const inputStyle = {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: open ? theme.primary : theme.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: theme.text,
    fontFamily: theme.fontBody,
    fontSize: 14,
  };

  return (
    <View style={[{ position: 'relative' }, style]}>
      {label && (
        <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 4 }}>{label}</Text>
      )}

      {selectedAirport ? (
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: theme.primary + '12',
          borderWidth: 1, borderColor: theme.primary + '40',
          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
          gap: 10,
        }}>
          <Icon name="navigation" size={16} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.primary, fontFamily: theme.fontDisplay, fontSize: 14 }}>
              {selectedAirport.name}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 12, marginTop: 1 }}>
              {selectedAirport.iata} · {selectedAirport.city}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={18} color={theme.muted} />
          </TouchableOpacity>
        </View>
      ) : (
        <TextInput
          style={inputStyle}
          placeholder="Search airports (e.g. MIA, Miami, Orlando...)"
          placeholderTextColor={theme.muted}
          value={search}
          onChangeText={(v) => { setSearch(v); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      )}

      {open && !selectedAirport && (
        <View style={{
          position: 'absolute',
          top: label ? 74 : 50,
          left: 0, right: 0, zIndex: 999,
          backgroundColor: theme.surface,
          borderWidth: 1, borderColor: theme.border,
          borderRadius: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 8,
          overflow: 'hidden',
          maxHeight: 260,
        }}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {filtered.map((airport, i) => (
              <TouchableOpacity
                key={airport.iata}
                onPress={() => handleSelect(airport)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 12,
                  borderBottomWidth: i < filtered.length - 1 ? 1 : 0,
                  borderBottomColor: theme.border,
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                }}
              >
                <View style={{
                  backgroundColor: theme.primary + '18',
                  borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
                  minWidth: 36, alignItems: 'center',
                }}>
                  <Text style={{ color: theme.primary, fontFamily: theme.fontDisplay, fontSize: 12 }}>
                    {airport.iata}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 14, fontFamily: theme.fontDisplay }}>
                    {airport.name}
                  </Text>
                  <Text style={{ color: theme.muted, fontSize: 12, marginTop: 1 }}>
                    {airport.city}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
