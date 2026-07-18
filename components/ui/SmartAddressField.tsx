import { useState } from 'react';
import { View } from 'react-native';
import { TouchableOpacity } from './TouchableOpacity';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { AddressAutocomplete } from './AddressAutocomplete';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { IconName } from '@/constants/icons';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { PlaceDetail } from '@/services/googlePlaces';

export interface AddressBookEntry { id: string; label: string; icon: IconName; value: string }
export interface AddressBookSlot { id: string; label: string; icon: IconName }

interface Props {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  onSelectPlace: (detail: PlaceDetail) => void;
  savedAddresses: AddressBookEntry[];
  emptySlots: AddressBookSlot[];
  onSaveToSlot: (slotId: string, value: string) => void;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useTranslation>;
}

// Address field with a tap-to-choose "saved address vs. type new" flow, per
// the design system's components/ride/AddressInput.jsx. Visual only — the
// underlying address book is session-local state passed in from the parent,
// so "book" starts empty until you save something to it this session. The
// real Google Places field (AddressAutocomplete) is reused as-is for the
// "type" phase so the actual autocomplete/paid-API behavior doesn't change —
// this only wraps it.
export function SmartAddressField({
  label, placeholder, value, onChangeText, onSelectPlace,
  savedAddresses, emptySlots, onSaveToSlot, theme, t,
}: Props) {
  const [phase, setPhase] = useState<'idle' | 'choose' | 'book' | 'type' | 'saveNew'>('idle');
  const [sourceSlotId, setSourceSlotId] = useState<string | null>(null);

  const sourceValue = sourceSlotId ? savedAddresses.find((s) => s.id === sourceSlotId)?.value : undefined;
  const isDirty = sourceSlotId !== null && value !== sourceValue;
  const isNew = sourceSlotId === null && !!value.trim();
  const showSaveAction = !!value.trim() && (isDirty || isNew);

  function selectFromBook(slot: AddressBookEntry) {
    onChangeText(slot.value);
    setSourceSlotId(slot.id);
    setPhase('idle');
  }
  function saveToSlot(slotId: string) {
    onSaveToSlot(slotId, value);
    setSourceSlotId(slotId);
    setPhase('idle');
  }

  const sheetStyle = { borderRadius: radii.md, borderWidth: 1.5, borderColor: theme.primary, backgroundColor: theme.surface, overflow: 'hidden' as const, ...shadows.xs };
  const rowLabelStyle = { fontFamily: fonts.bodyExtraBold, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: letterSpacingFor(10, tracking.wide), color: theme.textFaint };

  if (phase === 'idle') {
    return (
      <View>
        {label && <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 4 }}>{label}</Text>}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setPhase('choose')}
          style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }}
        >
          <Text numberOfLines={1} style={{ fontFamily: fonts.bodyRegular, fontSize: 14, color: value ? theme.text : theme.muted }}>
            {value || placeholder}
          </Text>
        </TouchableOpacity>
        {showSaveAction && (
          <TouchableOpacity
            onPress={() => (isDirty && sourceSlotId ? saveToSlot(sourceSlotId) : setPhase('saveNew'))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start' }}
          >
            <Icon name="bookmark" size={13} color={theme.gold400} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: theme.gold400 }}>
              {isDirty ? t.post.addressUpdateBook : t.post.addressSaveToBook}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (phase === 'choose') {
    return (
      <View style={sheetStyle}>
        {label && <Text style={{ fontSize: 13, color: theme.muted, marginHorizontal: 12, marginTop: 12 }}>{label}</Text>}
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => setPhase('book')} style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRightWidth: 1, borderRightColor: theme.cardBorder }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bookmark" size={18} color={theme.gold400} />
            </View>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11.5, color: theme.muted }}>{t.post.addressChooseSaved}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPhase('type')} style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="pencil_line" size={18} color={theme.muted} />
            </View>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11.5, color: theme.muted }}>{t.post.addressChooseType}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setPhase('idle')} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.cardBorder, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: theme.textFaint }}>{t.post.addressCancel}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'book') {
    return (
      <View style={sheetStyle}>
        {savedAddresses.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Icon name="bookmark" size={22} color={theme.textFaint} />
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.textFaint, textAlign: 'center', marginTop: 8, lineHeight: 17 }}>
              {t.post.addressBookEmpty}
            </Text>
            <TouchableOpacity onPress={() => setPhase('type')} style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 7, borderRadius: radii.pill, borderWidth: 1, borderColor: theme.border }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: theme.muted }}>{t.post.addressTypeAddress}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          savedAddresses.map((s, i) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => selectFromBook(s)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.cardBorder }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={s.icon} size={15} color={theme.gold400} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={rowLabelStyle}>{s.label}</Text>
                <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: theme.text }}>{s.value}</Text>
              </View>
              <Icon name="chevron_right" size={16} color={theme.textFaint} />
            </TouchableOpacity>
          ))
        )}
        {savedAddresses.length > 0 && (
          <TouchableOpacity onPress={() => setPhase('type')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, backgroundColor: theme.surfaceAlt, borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
            <Icon name="pencil_line" size={13} color={theme.textFaint} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: theme.muted }}>{t.post.addressTypeNewAddress}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (phase === 'saveNew') {
    return (
      <View style={sheetStyle}>
        <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
          <Text style={[rowLabelStyle, { marginBottom: 4 }]}>{t.post.addressSaveTo}</Text>
          <Text numberOfLines={1} style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.muted }}>{value}</Text>
        </View>
        {emptySlots.length === 0 ? (
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: theme.textFaint, textAlign: 'center', padding: 16, lineHeight: 17 }}>
            {t.post.addressBookFull}
          </Text>
        ) : (
          emptySlots.map((s, i) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => saveToSlot(s.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.cardBorder }}
            >
              <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={s.icon} size={14} color={theme.gold400} />
              </View>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: theme.text, flex: 1 }}>{s.label}</Text>
              <Icon name="chevron_right" size={14} color={theme.textFaint} />
            </TouchableOpacity>
          ))
        )}
        <TouchableOpacity onPress={() => setPhase('idle')} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.cardBorder, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: theme.textFaint }}>{t.post.addressDontSave}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // phase === 'type' — the real, functional field (Google Places autocomplete unchanged)
  return <AddressAutocomplete label={label} placeholder={placeholder} value={value} onChangeText={onChangeText} onSelectPlace={onSelectPlace} />;
}
