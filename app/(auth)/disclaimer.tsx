import { View, ScrollView, Alert } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { fonts, radii } from '@/constants/themes';

export default function DisclaimerScreen() {
  const t = useTranslation();
  const theme = useTheme();

  async function acceptDisclaimer() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ disclaimer_accepted_at: new Date().toISOString() })
          .eq('id', user.id);
      }
      router.replace('/(tabs)');
    } catch {
      Alert.alert(t.disclaimer.errorTitle, t.disclaimer.errorMsg);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 10, backgroundColor: theme.badgeWarnBg, borderWidth: 1, borderColor: theme.borderGold, borderRadius: radii.lg, padding: 16, marginBottom: 24 }}>
          <Icon name="warning" size={18} color={theme.badgeWarnFg} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: theme.badgeWarnFg, marginBottom: 6 }}>
              {t.disclaimer.warning}
            </Text>
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.muted, lineHeight: 20 }}>
              {t.disclaimer.subtitle}
            </Text>
          </View>
        </View>

        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: theme.text, marginBottom: 16 }}>
          {t.disclaimer.intro}
        </Text>

        {t.disclaimer.items.map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View style={{ width: 24, height: 24, borderRadius: radii.pill, backgroundColor: theme.chipActiveBg, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: theme.primary }}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, fontFamily: fonts.bodyRegular, fontSize: 14, color: theme.muted, lineHeight: 21 }}>
              {item}
            </Text>
          </View>
        ))}

        <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: theme.textFaint, textAlign: 'center', marginTop: 8, marginBottom: 8 }}>
          {t.disclaimer.footer}
        </Text>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface }}>
        <Button variant="primary" size="lg" icon="check" fullWidth onPress={acceptDisclaimer}>
          {t.disclaimer.accept}
        </Button>
      </View>
    </View>
  );
}
