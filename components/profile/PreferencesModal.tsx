import { View, Modal, TouchableOpacity, Switch } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useLanguageStore } from '@/store/languageStore';
import { Icon } from '@/components/ui/Icon';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PreferencesModal({ visible, onClose }: Props) {
  const t = useTranslation();
  const theme = useTheme();
  const { language, setLanguage } = useLanguageStore();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
          borderBottomWidth: 1, borderBottomColor: theme.border,
        }}>
          <Text style={{ fontSize: 20, color: theme.text, fontFamily: theme.fontDisplay }}>
            Preferences
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Icon name="close" size={22} color={theme.muted} />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 20, gap: 12 }}>
          {/* Language */}
          <View>
            <Text style={{ color: theme.muted, fontSize: 11, fontFamily: theme.fontDisplay, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
              {t.profile.language}
            </Text>
            <View style={{
              backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
              borderRadius: 14, padding: 16,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <Text style={{ color: language === 'en' ? theme.primary : theme.muted, fontFamily: theme.fontDisplay, fontSize: 14 }}>
                {t.profile.english}
              </Text>
              <Switch
                value={language === 'es'}
                onValueChange={val => setLanguage(val ? 'es' : 'en')}
                trackColor={{ false: theme.primary, true: theme.primary }}
                thumbColor="#fff"
              />
              <Text style={{ color: language === 'es' ? theme.primary : theme.muted, fontFamily: theme.fontDisplay, fontSize: 14 }}>
                {t.profile.spanish}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
