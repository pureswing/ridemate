import { useState } from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { IconName } from '@/constants/icons';
import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/constants/themes';

// Deterministic gradient + stock portrait picked from `name`, so the same
// person always renders the same face — matches the design system's mock data.
const PALETTES: [string, string][] = [
  ['#C9A24E', '#876626'],
  ['#2FC79B', '#0A5C46'],
  ['#E85DA1', '#8E1A50'],
  ['#6C4BB0', '#2A1840'],
  ['#2F6F8F', '#16323F'],
];

function hashName(name = ''): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

function photoForName(name: string): string {
  const h = hashName(name);
  const gender = h % 2 === 0 ? 'men' : 'women';
  const idx = h % 100;
  return `https://randomuser.me/api/portraits/${gender}/${idx}.jpg`;
}

interface Props {
  name?: string;
  src?: string;
  photo?: boolean;
  icon?: IconName;
  size?: number;
  verified?: boolean;
  online?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Avatar — real human portrait photo by default (deterministically picked from
// `name`), with optional verified check and online dot. Pass `src` for a
// specific photo, `photo={false}` to fall back to initials-on-gradient, or
// `icon` (with `photo={false}`) for a neutral placeholder icon instead of
// initials — used for the signed-in user's own avatar before they upload one.
export function Avatar({ name = '', src, photo = true, icon, size = 48, verified = false, online = false, style }: Props) {
  const theme = useTheme();
  const [photoFailed, setPhotoFailed] = useState(false);
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const gradient = PALETTES[hashName(name) % PALETTES.length];
  const finalSrc = !photoFailed ? (src || (photo && name ? photoForName(name) : undefined)) : undefined;
  const badge = Math.max(13, Math.round(size * 0.27));

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: icon && !finalSrc ? theme.surfaceAlt : undefined,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.4)',
        }}
      >
        {!(icon && !finalSrc) && (
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
        )}
        {icon && !finalSrc ? (
          <Icon name={icon} size={Math.round(size * 1.136)} color={theme.muted} strokeWidth={1.5} />
        ) : (
          <Text style={{ fontFamily: fonts.displayBold, fontSize: Math.round(size * 0.38), letterSpacing: -0.3, color: theme.cream }}>
            {initials}
          </Text>
        )}
        {finalSrc && (
          <Image
            source={{ uri: finalSrc }}
            onError={() => setPhotoFailed(true)}
            style={StyleSheet.absoluteFillObject}
          />
        )}
      </View>
      {verified && (
        <View
          style={{
            position: 'absolute', right: -2, bottom: -2,
            width: badge, height: badge,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: theme.secondary,
            borderRadius: badge / 2,
            borderWidth: 1, borderColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <Icon name="shield_check" size={Math.round(badge * 0.67)} color={theme.cream} strokeWidth={2.2} />
        </View>
      )}
      {online && !verified && (
        <View
          style={{
            position: 'absolute', right: 0, bottom: 0,
            width: Math.max(10, size * 0.22), height: Math.max(10, size * 0.22),
            backgroundColor: theme.secondary,
            borderRadius: 999,
            borderWidth: 2, borderColor: theme.surface,
          }}
        />
      )}
    </View>
  );
}
