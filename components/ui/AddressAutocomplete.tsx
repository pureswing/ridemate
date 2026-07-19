import { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { controlHeight, radii, fonts, shadows } from '@/constants/themes';
import { getPlacePredictions, getPlaceDetail, newPlacesSessionToken, PlacePrediction, PlaceDetail } from '@/services/googlePlaces';

interface Props {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelectPlace?: (detail: PlaceDetail) => void;
  style?: object;
  autoFocus?: boolean;
  onBlur?: () => void;
  // 'boxed' (default) is the standard bordered field used across the post
  // forms. 'plain' drops the border/background/height so the field can sit
  // inline inside a row that looks identical whether it's being edited or
  // not (see the profile Address Book) — only the text + suggestions
  // dropdown remain.
  variant?: 'boxed' | 'plain';
  textStyle?: object;
  // Rendered inside the field's row, after the text input (and loading
  // spinner) — e.g. SmartAddressField's "save to address book" bookmark
  // button, so it sits inside the input like a trailing icon instead of as
  // a separate button floating next to it.
  rightAccessory?: React.ReactNode;
}

export function AddressAutocomplete({ label, placeholder, value, onChangeText, onSelectPlace, style, autoFocus, onBlur, variant = 'boxed', textStyle, rightAccessory }: Props) {
  const theme = useTheme();
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(false);
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

  const boxed = variant === 'boxed';
  const borderColor = focus || open ? theme.primary : theme.border;

  return (
    <View style={[{ position: 'relative' }, style]}>
      {label && (
        <Text style={{ marginBottom: 7, fontSize: 14, fontFamily: fonts.bodySemibold, color: theme.text }}>{label}</Text>
      )}
      <View
        style={
          boxed
            ? {
                flexDirection: 'row',
                alignItems: 'center',
                height: controlHeight.lg,
                paddingHorizontal: 16,
                backgroundColor: theme.surface,
                borderWidth: 1.5,
                borderColor,
                borderRadius: radii.md,
                ...shadows.xs,
              }
            : { flexDirection: 'row', alignItems: 'center' }
        }
      >
        <TextInput
          style={
            boxed
              ? { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: theme.text, padding: 0 }
              : [{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.text, padding: 0 }, textStyle]
          }
          placeholder={placeholder}
          placeholderTextColor={theme.muted}
          value={value}
          onChangeText={onChangeText}
          autoFocus={autoFocus}
          onFocus={() => setFocus(true)}
          onBlur={() => { setFocus(false); onBlur?.(); }}
        />
        {loading && <ActivityIndicator size="small" color={theme.primary} />}
        {rightAccessory}
      </View>
      {open && predictions.length > 0 && (
        <View style={{
          position: 'absolute',
          top: boxed ? (label ? 33 : 0) + controlHeight.lg + 6 : '100%',
          marginTop: boxed ? 0 : 6,
          left: 0, right: 0, zIndex: 999,
          backgroundColor: theme.surface,
          borderWidth: 1.5, borderColor: theme.border,
          borderRadius: radii.md,
          ...shadows.md,
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
              <Text style={{ color: theme.text, fontSize: 14, fontFamily: fonts.bodySemibold }}>
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
