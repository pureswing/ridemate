import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { PurchasesOffering } from 'react-native-purchases';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, radii } from '@/constants/themes';
import { DONOR_AMOUNTS } from '@/constants/membershipPlans';

interface Props {
  visible: boolean;
  // Chosen on the Membership screen before this sheet opens.
  amount: (typeof DONOR_AMOUNTS)[number];
  // 'new' = free user becoming a donor, 'adjust' = already a donor, changing amount.
  mode: 'new' | 'adjust';
  offering: PurchasesOffering | null;
  purchase: (amount: (typeof DONOR_AMOUNTS)[number]) => Promise<unknown>;
  purchasing: boolean;
  onClose: () => void;
  // Fires once the real purchase has gone through — store/authStore.ts's
  // subscription is already up to date by then (see hooks/usePurchases.ts).
  onConfirm: () => void;
}

// Ported from ui_kits/ridemate-app/MembershipCheckout.jsx, then rebuilt around
// a real purchase instead of a mock card form: Apple/Google require in-app
// digital purchases to go through the native store billing sheet, not a
// custom card-entry UI — Purchases.purchasePackage() below opens exactly
// that (Google Play Billing via RevenueCat), so this screen only ever shows
// a summary + confirm button, never touches card details itself.
export function MembershipCheckoutSheet({ visible, amount, mode, offering, purchase, purchasing, onClose, onConfirm }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  const [step, setStep] = useState<'summary' | 'success' | 'error'>('summary');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) {
      setStep('summary');
      setErrorMsg('');
    }
  }, [visible]);

  async function handleConfirmPress() {
    try {
      await purchase(amount);
      setStep('success');
      setTimeout(onConfirm, 1400);
    } catch (e: any) {
      // react-native-purchases sets userCancelled on the error object when
      // the user backs out of the native sheet themselves — not a failure,
      // just close quietly instead of showing an error screen.
      if (e?.userCancelled) { onClose(); return; }
      setErrorMsg(e?.message || t.membership.purchaseErrorGeneric);
      setStep('error');
    }
  }

  const title = mode === 'adjust' ? t.membership.changeAmount : t.membership.becomeDonorTitle;
  const submitLabel = `${t.membership.confirmPrefix} $${amount}${t.membership.perMonth}`;
  const offeringReady = offering != null;

  return (
    <BottomSheet visible={visible} onClose={onClose} style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 19, color: theme.text }}>{title}</Text>
          {step === 'summary' && (
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.muted, marginTop: 4 }}>
              {t.membership.checkoutSubheader}
            </Text>
          )}
        </View>
        <IconButton icon="close" size="sm" variant="ghost" label={t.membership.done} onPress={onClose} />
      </View>

      <View style={{ paddingTop: 12, gap: 16 }}>
        {step === 'success' ? (
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: theme.donorText, backgroundColor: theme.donorText + '1F', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Icon name="check" size={30} color={theme.donorText} strokeWidth={2.5} />
            </View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 19, color: theme.text, textAlign: 'center' }}>
              {t.membership.successDonorTitle}
            </Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: theme.muted, textAlign: 'center', marginTop: 8 }}>
              {`$${amount}${t.membership.perMonth} · ${t.membership.successDonorSub}`}
            </Text>
          </View>
        ) : step === 'error' ? (
          <View style={{ alignItems: 'center', paddingVertical: 28, gap: 16 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: theme.danger, backgroundColor: theme.danger + '1F', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="warning" size={28} color={theme.danger} />
            </View>
            <View>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: theme.text, textAlign: 'center' }}>
                {t.membership.purchaseErrorTitle}
              </Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.muted, textAlign: 'center', marginTop: 6 }}>
                {errorMsg}
              </Text>
            </View>
            <Button variant="primary" size="lg" fullWidth onPress={() => setStep('summary')}>
              {t.membership.confirmAmountEdit}
            </Button>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radii.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceAlt }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.donorText + '1F', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="heart_handshake" size={19} color={theme.donorText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: theme.text }}>{`$${amount}${t.membership.perMonth}`}</Text>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, marginTop: 1 }}>{t.subscription.donor}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Icon name="lock" size={13} color={theme.textFaint} />
              <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 11.5, color: theme.textFaint, lineHeight: 16 }}>
                {t.membership.checkoutSummaryNote}
              </Text>
            </View>

            <Button variant="primary" size="lg" fullWidth icon="lock" disabled={!offeringReady || purchasing} onPress={handleConfirmPress}>
              {purchasing ? t.membership.openingPlayBilling : submitLabel}
            </Button>
          </>
        )}
      </View>
    </BottomSheet>
  );
}
