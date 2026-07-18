import { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { getPlacePredictions, getPlaceDetail, newPlacesSessionToken, PlacePrediction, PlaceDetail } from '@/services/googlePlaces';

interface Props {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelectPlace?: (detail: PlaceDetail) => void;
  style?: object;
}

export function AddressAutocomplete({ label, placeholder, value, onChangeText, onSelectPlace, style }: Props) {
  const theme = useTheme();
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressRef = useRef(false);
  // Skip the first effect run — prevents an API call when a pre-filled value is passed in
  const mountedRef = useRef(false);
  // Groups this typing burst's predictions calls + the closing place-detail
  // call into one billed Google Places session — see newPlacesSessionToken.
  // Cleared once a place is picked (session over) or the field is emptied
  // (abandoned search, next one is a new session).
  const sessionTokenRef = useRef<string | null>(null);
  function sessionToken(): string {
    if (!sessionTokenRef.current) sessionTokenRef.current = newPlacesSessionToken();
    return sessionTokenRef.current;
  }

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (suppressRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) {
      setPredictions([]); setOpen(false);
      if (value.length === 0) sessionTokenRef.current = null;
      return;
    }
    debounceRef.current = setTimeout(async () => {
      if (suppressRef.current) return;
      setLoading(true);
      const results = await getPlacePredictions(value, sessionToken());
      setPredictions(results);
      setOpen(results.length > 0);
      setLoading(false);
    }, 350);
  }, [value]);

  async function handleSelect(prediction: PlacePrediction) {
    suppressRef.current = true;
    setOpen(false);
    setPredictions([]);
    onChangeText(prediction.mainText);
    if (onSelectPlace) {
      const detail = await getPlaceDetail(prediction.placeId, sessionTokenRef.current ?? undefined);
      if (detail) onSelectPlace(detail);
    }
    sessionTokenRef.current = null; // session closed — next typing burst gets a fresh token
    // Reset after both value updates (onChangeText + onSelectPlace) have propagated
    setTimeout(() => { suppressRef.current = false; }, 500);
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
      <TextInput
        style={inputStyle}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        value={value}
        onChangeText={onChangeText}
      />
      {loading && (
        <ActivityIndicator
          size="small"
          color={theme.primary}
          style={{ position: 'absolute', right: 14, top: label ? 36 : 14 }}
        />
      )}
      {open && predictions.length > 0 && (
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
        }}>
          {predictions.map((p, i) => (
            <TouchableOpacity
              key={p.placeId}
              onPress={() => handleSelect(p)}
              style={{
                paddingHorizontal: 16, paddingVertical: 12,
                borderBottomWidth: i < predictions.length - 1 ? 1 : 0,
                borderBottomColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 14, fontFamily: theme.fontDisplay }}>
                {p.mainText}
              </Text>
              {p.secondaryText ? (
                <Text style={{ color: theme.muted, fontSize: 12, marginTop: 1 }}>
                  {p.secondaryText}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
