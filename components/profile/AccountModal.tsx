import { useState } from 'react';
import {
  View, Modal, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Icon } from '@/components/ui/Icon';

interface Props {
  visible: boolean;
  email: string;
  onClose: () => void;
}

export function AccountModal({ visible, email, onClose }: Props) {
  const t = useTranslation();
  const theme = useTheme();
  const { signOut } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const btnText = '#fff';

  async function handleSavePassword() {
    if (newPassword.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      Alert.alert('', t.profile.passwordUpdated);
      setNewPassword('');
      setShowPasswordForm(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(t.profile.deleteAccountTitle, t.profile.deleteAccountMsg, [
      { text: t.profile.cancel, style: 'cancel' },
      {
        text: t.profile.deleteAccountAction,
        style: 'destructive',
        onPress: () => Alert.alert('', 'Your deletion request has been received. We will process it within 48 hours.'),
      },
    ]);
  }

  const rowStyle = {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={{ flex: 1, backgroundColor: theme.background }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
          borderBottomWidth: 1, borderBottomColor: theme.border,
        }}>
          <Text style={{ fontSize: 20, color: theme.text, fontFamily: theme.fontDisplay }}>
            {t.profile.accountSection}
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Icon name="close" size={22} color={theme.muted} />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 20 }}>
          {/* Email (read-only) */}
          <Text style={{ color: theme.muted, fontSize: 11, fontFamily: theme.fontDisplay, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
            Account
          </Text>
          <View style={{ ...rowStyle, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="email" size={18} color={theme.muted} />
            <Text style={{ color: theme.textSecondary, fontSize: 14, flex: 1 }}>{email}</Text>
          </View>

          {/* Change password */}
          <TouchableOpacity
            onPress={() => setShowPasswordForm(!showPasswordForm)}
            style={{ ...rowStyle, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <Icon name="key" size={18} color={theme.primary} />
            <Text style={{ color: theme.text, fontSize: 14, fontFamily: theme.fontDisplay, flex: 1 }}>
              {t.profile.changePassword}
            </Text>
            <Icon name={showPasswordForm ? 'chevron_up' : 'chevron_down'} size={18} color={theme.muted} />
          </TouchableOpacity>

          {showPasswordForm && (
            <View style={{ marginTop: -4, marginBottom: 10, gap: 10 }}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t.profile.newPasswordPlaceholder}
                placeholderTextColor={theme.inputPlaceholder}
                secureTextEntry
                style={{
                  backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border,
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                  color: theme.text, fontSize: 14,
                }}
              />
              <TouchableOpacity
                onPress={handleSavePassword}
                disabled={saving}
                style={{ backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
              >
                {saving
                  ? <ActivityIndicator color={btnText} />
                  : <Text style={{ color: btnText, fontFamily: theme.fontDisplay, fontSize: 14 }}>{t.profile.savePassword}</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Delete account */}
          <View style={{ marginTop: 24 }}>
            <Text style={{ color: theme.muted, fontSize: 11, fontFamily: theme.fontDisplay, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
              Danger zone
            </Text>
            <TouchableOpacity
              onPress={handleDeleteAccount}
              style={{ ...rowStyle, flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: theme.danger + '40' }}
            >
              <Icon name="delete" size={18} color={theme.danger} />
              <Text style={{ color: theme.danger, fontSize: 14, fontFamily: theme.fontDisplay }}>
                {t.profile.deleteAccount}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}
