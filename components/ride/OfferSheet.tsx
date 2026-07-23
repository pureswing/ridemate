import { useEffect, useState } from 'react';
import { Modal, View, Pressable as RNPressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { KeyboardWrapper } from '@/components/auth/KeyboardWrapper';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, radii } from '@/constants/themes';

interface Props {
  visible: boolean;
  // The post's suggested_donation, if any — shown as "Asking: $X" context,
  // or the openPriceMsg copy when the creator left it open (null/undefined).
  askingPrice?: number | null;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}

// Bottom sheet for entering a dollar amount before it's sent as the opening
// message on a new conversation — ported from ui_kits/ridemate-app/RideDetail.jsx's
// offerOpen/offerAmount bottom sheet. The design never persists the amount as
// structured data (no offer/status columns exist in this app's schema either,
// see app/messages/[id].tsx's comment on why the design's OfferReceived
// accept/counter flow was left unported) — it's just interpolated into a
// plain autofilled first chat message, which is exactly what this does.
export function OfferSheet({ visible, askingPrice, onClose, onSubmit }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (visible) setAmount('');
  }, [visible]);

  const numericAmount = Number(amount);
  const valid = amount.trim().length > 0 && numericAmount > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <RNPressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={onClose}>
        <RNPressable onPress={() => {}}>
          <KeyboardWrapper style={{ maxHeight: '80%' }}>
            <View
              style={{
                backgroundColor: theme.surface,
                borderTopLeftRadius: radii.xl,
                borderTopRightRadius: radii.xl,
                padding: 20,
                paddingBottom: insets.bottom + 20,
              }}
            >
              <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 16 }} />

              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 19, color: theme.text }}>
                    {t.rideDetail.makeOfferTitle}
                  </Text>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.muted, marginTop: 4 }}>
                    {askingPrice != null ? `${t.rideDetail.askingPrefix} $${askingPrice}` : t.rideDetail.openPriceMsg}
                  </Text>
                </View>
                <IconButton icon="close" size="sm" variant="ghost" label={t.rideDetail.cancel} onPress={onClose} />
              </View>

              <View style={{ marginTop: 20 }}>
                <Input
                  prefix="$"
                  placeholder={t.rideDetail.offerAmountPlaceholder}
                  keyboardType="number-pad"
                  value={amount}
                  onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
                  autoFocus
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <View style={{ flex: 1 }}>
                  <Button variant="outline" size="lg" fullWidth onPress={onClose}>
                    {t.rideDetail.cancel}
                  </Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button variant="primary" size="lg" fullWidth disabled={!valid} onPress={() => onSubmit(numericAmount)}>
                    {t.rideDetail.sendOfferCta}
                  </Button>
                </View>
              </View>
            </View>
          </KeyboardWrapper>
        </RNPressable>
      </RNPressable>
    </Modal>
  );
}
