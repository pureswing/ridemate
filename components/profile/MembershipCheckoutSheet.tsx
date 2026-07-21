import { useEffect, useState } from 'react';
import { Modal, View, ScrollView, Pressable as RNPressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { KeyboardWrapper } from '@/components/auth/KeyboardWrapper';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, radii } from '@/constants/themes';

interface Props {
  visible: boolean;
  // Chosen on the Membership screen before this sheet opens — donation-only
  // model, so there's no plan/amount picker in here anymore, just card details.
  amount: number;
  // 'new' = free user becoming a donor, 'adjust' = already a donor, changing amount.
  mode: 'new' | 'adjust';
  onClose: () => void;
  // UI-only mock — no real charge happens. Parent applies this as a local-only
  // optimistic Subscription update (see app/profile/membership.tsx); nothing
  // is persisted to Supabase (RLS is SELECT-only for clients).
  onConfirm: (amount: number) => void;
}

// Ported from ui_kits/ridemate-app/MembershipCheckout.jsx, trimmed: donation-
// only (no Subscriber branch, no plan switching), no coupon/referral picker
// (Rewards tab is out of scope) and no beta-invite-code path (same reason).
// Also drops the source's "Payments processed by Square" line — Apple
// requires In-App Purchase for unlocking digital app features, so that copy
// shouldn't ship even as a mock; real processing isn't wired up here anyway.
export function MembershipCheckoutSheet({ visible, amount, mode, onClose, onConfirm }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  useEffect(() => {
    if (visible) {
      setStep('form');
      setName('');
      setCardNumber('');
      setExpiry('');
      setCvc('');
    }
  }, [visible]);

  const valid =
    name.trim().length > 0 &&
    cardNumber.replace(/\s/g, '').length >= 12 &&
    expiry.trim().length > 0 &&
    cvc.trim().length >= 3;

  function handleSubmit() {
    if (!valid) return;
    setStep('success');
    setTimeout(() => onConfirm(amount), 1400);
  }

  const title = mode === 'adjust' ? t.membership.changeAmount : t.membership.becomeDonorTitle;
  const submitLabel = `${t.membership.confirmPrefix} $${amount}${t.membership.perMonth}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <RNPressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={onClose}>
        <RNPressable onPress={() => {}}>
          <KeyboardWrapper style={{ maxHeight: '88%' }}>
            <View
              style={{
                backgroundColor: theme.surface,
                borderTopLeftRadius: radii.xl,
                borderTopRightRadius: radii.xl,
                paddingBottom: insets.bottom + 20,
              }}
            >
              <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center', marginTop: 12, marginBottom: 8 }} />

              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 19, color: theme.text }}>{title}</Text>
                  {step === 'form' && (
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.muted, marginTop: 4 }}>
                      {t.membership.checkoutSubheader}
                    </Text>
                  )}
                </View>
                <IconButton icon="close" size="sm" variant="ghost" label={t.membership.done} onPress={onClose} />
              </View>

              <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, gap: 16 }} keyboardShouldPersistTaps="handled">
                {step === 'success' ? (
                  <View style={{ alignItems: 'center', paddingVertical: 28 }}>
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        borderWidth: 2,
                        borderColor: theme.donorText,
                        backgroundColor: theme.donorText + '1F',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                      }}
                    >
                      <Icon name="check" size={30} color={theme.donorText} strokeWidth={2.5} />
                    </View>
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 19, color: theme.text, textAlign: 'center' }}>
                      {t.membership.successDonorTitle}
                    </Text>
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: theme.muted, textAlign: 'center', marginTop: 8 }}>
                      {`$${amount}${t.membership.perMonth} · ${t.membership.successDonorSub}`}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Input label={t.membership.nameOnCard} value={name} onChangeText={setName} autoCapitalize="words" />
                    <Input
                      label={t.membership.cardNumber}
                      icon="credit_card"
                      value={cardNumber}
                      onChangeText={setCardNumber}
                      keyboardType="number-pad"
                      maxLength={19}
                    />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Input
                        label={t.membership.cardExpiry}
                        value={expiry}
                        onChangeText={setExpiry}
                        keyboardType="number-pad"
                        maxLength={5}
                        containerStyle={{ flex: 1 }}
                      />
                      <Input
                        label={t.membership.cardCvc}
                        value={cvc}
                        onChangeText={setCvc}
                        keyboardType="number-pad"
                        maxLength={4}
                        containerStyle={{ flex: 1 }}
                      />
                    </View>

                    <Button variant="primary" size="lg" fullWidth icon="lock" disabled={!valid} onPress={handleSubmit}>
                      {submitLabel}
                    </Button>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardWrapper>
        </RNPressable>
      </RNPressable>
    </Modal>
  );
}
