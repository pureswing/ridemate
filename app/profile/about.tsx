import { useState } from 'react';
import { View, ScrollView, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { TouchableOpacity } from '@/components/ui/TouchableOpacity';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii, shadows } from '@/constants/themes';
import { tracking, letterSpacingFor } from '@/constants/typography';
import { IconName } from '@/constants/icons';

// Ported from ui_kits/ridemate-app/About.jsx — Mission, FAQ, Legal
// disclaimers, and Contact, all in one screen (matches the design; there's
// no separate dedicated "Legal" screen in the source). This is the app's
// one canonical statement of the [[project-legal-tnc-compliance]] boundary
// (classified-ads board, not a transportation company) — text is ported
// verbatim from the design rather than paraphrased, since it's legal copy.

function Section({ title, icon, accent, children, theme }: {
  title: string; icon: IconName; accent: string; children: React.ReactNode; theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={15} color={accent} />
        </View>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, letterSpacing: letterSpacingFor(17, tracking.tight), color: theme.text }}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Accordion({ items, openIndex, onToggle, accent, theme }: {
  items: { title: string; body: string }[];
  openIndex: number | null;
  onToggle: (i: number) => void;
  accent: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={{ backgroundColor: theme.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.cardBorder, overflow: 'hidden', ...shadows.xs }}>
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <View key={item.title}>
            <TouchableOpacity onPress={() => onToggle(i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
              <View style={{
                width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                backgroundColor: isOpen ? accent + '22' : theme.surfaceAlt,
              }}>
                <Icon name={isOpen ? 'minus' : 'add'} size={13} color={isOpen ? accent : theme.textFaint} />
              </View>
              <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 13.5, color: theme.text, lineHeight: 18 }}>
                {item.title}
              </Text>
            </TouchableOpacity>
            {isOpen && (
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: theme.textSecondary, lineHeight: 19, paddingHorizontal: 14, paddingLeft: 50, paddingBottom: 14 }}>
                {item.body}
              </Text>
            )}
            {i < items.length - 1 && <View style={{ height: 1, backgroundColor: theme.cardBorder, marginHorizontal: 14 }} />}
          </View>
        );
      })}
    </View>
  );
}

export default function AboutScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openDisclaimer, setOpenDisclaimer] = useState<number | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={theme.gradientGold as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 22, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...shadows.lg }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <IconButton icon="arrow_back" variant="glass" label={t.post.goBack} onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: letterSpacingFor(11, tracking.wide), color: theme.gold300 }}>
            {t.about.eyebrow}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <View style={{ width: 60, height: 60, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', ...shadows.gold }}>
            <LinearGradient colors={theme.gradientGold as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
            <Icon name="car" size={30} color={theme.textOnPrimary} />
          </View>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 24, letterSpacing: letterSpacingFor(24, tracking.tight), color: theme.cream, marginTop: 10 }}>
            RideMate
          </Text>
          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
            v{t.about.appVersion} · Florida, USA
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 40 }}>
        <Section title={t.about.missionSection} icon="sparkles" accent={theme.gold500} theme={theme}>
          <View style={{ backgroundColor: theme.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.cardBorder, overflow: 'hidden', ...shadows.xs }}>
            <LinearGradient colors={theme.gradientGold as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 3 }} />
            <View style={{ padding: 16 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, color: theme.text, marginBottom: 12, lineHeight: 22 }}>
                {t.about.missionHeadline}
              </Text>
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.textSecondary, lineHeight: 20, marginBottom: 12 }}>
                {t.about.missionBody}
              </Text>
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.textSecondary, lineHeight: 20 }}>
                {t.about.missionBody2}
              </Text>
            </View>
          </View>
        </Section>

        <Section title={t.about.faqSection} icon="help_circle" accent={theme.driverText} theme={theme}>
          <Accordion
            items={t.about.faqs.map((f) => ({ title: f.q, body: f.a }))}
            openIndex={openFaq}
            onToggle={(i) => setOpenFaq(openFaq === i ? null : i)}
            accent={theme.driverText}
            theme={theme}
          />
        </Section>

        <Section title={t.about.legalSection} icon="scale" accent={theme.passengerText} theme={theme}>
          <Accordion
            items={t.about.legalDisclaimers.map((d) => ({ title: d.title, body: d.text }))}
            openIndex={openDisclaimer}
            onToggle={(i) => setOpenDisclaimer(openDisclaimer === i ? null : i)}
            accent={theme.passengerText}
            theme={theme}
          />
          <View style={{
            flexDirection: 'row', gap: 8, marginTop: 10, padding: 12,
            backgroundColor: theme.passengerText + '12', borderRadius: radii.md,
            borderWidth: 1, borderColor: theme.passengerText + '30',
          }}>
            <View style={{ marginTop: 1 }}>
              <Icon name="info" size={14} color={theme.passengerText} />
            </View>
            <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, lineHeight: 18 }}>
              {t.about.legalAcknowledgement}
            </Text>
          </View>
        </Section>

        <Section title={t.about.contactSection} icon="email" accent={theme.courierText} theme={theme}>
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${t.about.contactAdminEmail}`)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.surface,
                borderRadius: radii.lg, borderWidth: 1, borderColor: theme.cardBorder, padding: 14, ...shadows.xs,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.courierSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="email" size={19} color={theme.courierText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: letterSpacingFor(10.5, tracking.wide), color: theme.textFaint }}>
                  {t.about.contactAdminLabel}
                </Text>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.text, marginTop: 2 }}>
                  {t.about.contactAdminEmail}
                </Text>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, marginTop: 1 }}>
                  {t.about.contactAdminSub}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${t.about.contactSupportEmail}`)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.surface,
                borderRadius: radii.lg, borderWidth: 1, borderColor: theme.cardBorder, padding: 14, ...shadows.xs,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.courierSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="help_circle" size={19} color={theme.courierText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodyExtraBold, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: letterSpacingFor(10.5, tracking.wide), color: theme.textFaint }}>
                  {t.about.contactSupportLabel}
                </Text>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: theme.text, marginTop: 2 }}>
                  {t.about.contactSupportEmail}
                </Text>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.muted, marginTop: 1 }}>
                  {t.about.contactSupportSub}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Section>

        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.textFaint, textAlign: 'center', lineHeight: 18 }}>
          RideMate v{t.about.appVersion} · © 2026 RideMate LLC{'\n'}{t.about.footer}
        </Text>
      </ScrollView>
    </View>
  );
}
