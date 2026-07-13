import { useState, useEffect } from 'react';
import {
  View, Modal, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { Icon } from '@/components/ui/Icon';
import { Profile } from '@/types';

interface Props {
  visible: boolean;
  profile: Profile | null;
  onClose: () => void;
}

export function EditProfileModal({ visible, profile, onClose }: Props) {
  const theme = useTheme();
  const { updateProfile, uploadAvatar } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const btnText = '#fff';

  useEffect(() => {
    if (visible) {
      setFullName(profile?.full_name ?? '');
      setUsername(profile?.username ?? '');
      setPhotoUri(null);
    }
  }, [visible, profile?.id]);

  const displayAvatar = photoUri ?? profile?.avatar_url ?? null;
  const initials = (profile?.full_name?.[0] ?? '?').toUpperCase();

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;
      if (photoUri) {
        avatarUrl = await uploadAvatar(profile.id, photoUri);
      }
      await updateProfile(profile.id, {
        full_name: fullName.trim() || profile.full_name,
        username: username.trim() || undefined,
        avatar_url: avatarUrl,
      });
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  const cardShadow = {
    shadowColor: theme.cardShadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.cardShadowOpacity,
    shadowRadius: 10,
    elevation: 5,
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
          borderBottomWidth: 1, borderBottomColor: theme.border,
        }}>
          <Text style={{ fontSize: 20, color: theme.text, fontFamily: theme.fontDisplay }}>
            Edit Profile
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Icon name="close" size={22} color={theme.muted} />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 20 }}>

          {/* Avatar picker */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8}>
              {/* Shadow wrapper */}
              <View style={{
                width: 96, height: 96, borderRadius: 48,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
              }}>
                {/* Clip wrapper */}
                <View style={{
                  width: 96, height: 96, borderRadius: 48, overflow: 'hidden',
                  backgroundColor: theme.primary,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {displayAvatar ? (
                    <Image source={{ uri: displayAvatar }} style={{ width: 96, height: 96 }} />
                  ) : (
                    <Text style={{ fontSize: 36, color: btnText, fontFamily: theme.fontDisplay }}>
                      {initials}
                    </Text>
                  )}
                </View>
              </View>
              {/* Camera badge */}
              <View style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: theme.primary,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: theme.background,
              }}>
                <Icon name="camera" size={14} color={btnText} />
              </View>
            </TouchableOpacity>
            <Text style={{ color: theme.muted, fontSize: 12, marginTop: 10 }}>
              Tap to change photo
            </Text>
          </View>

          {/* Full name */}
          <Text style={{
            color: theme.muted, fontSize: 11, fontFamily: theme.fontDisplay,
            letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
          }}>
            Display Name
          </Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            placeholderTextColor={theme.inputPlaceholder}
            style={{
              backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border,
              borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
              color: theme.text, fontSize: 15,
              marginBottom: 20,
            }}
          />

          {/* Username */}
          <Text style={{
            color: theme.muted, fontSize: 11, fontFamily: theme.fontDisplay,
            letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
          }}>
            Username
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border,
            borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
            marginBottom: 8,
          }}>
            <Text style={{ color: theme.muted, fontSize: 15, marginRight: 2 }}>@</Text>
            <TextInput
              value={username}
              onChangeText={v => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="yourhandle"
              placeholderTextColor={theme.inputPlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1, padding: 0,
                color: theme.text, fontSize: 15,
              }}
            />
          </View>
          <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 32 }}>
            Letters, numbers, and underscores only
          </Text>

          {/* Save */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: theme.primary, borderRadius: 14,
              paddingVertical: 16, alignItems: 'center',
              ...cardShadow,
            }}
          >
            {saving
              ? <ActivityIndicator color={btnText} />
              : <Text style={{ color: btnText, fontFamily: theme.fontDisplay, fontSize: 16 }}>Save</Text>
            }
          </TouchableOpacity>

        </View>
      </ScrollView>
    </Modal>
  );
}
