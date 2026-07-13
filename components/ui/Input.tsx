import { useState } from 'react';
import { View, TextInput, TextInputProps, StyleProp, ViewStyle } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import { Icon } from './Icon';
import { IconName } from '@/constants/icons';
import { useTheme } from '@/hooks/useTheme';
import { controlHeight, radii, fonts, shadows } from '@/constants/themes';

interface Props extends TextInputProps {
  label?: string;
  icon?: IconName;
  hint?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  rightElement?: React.ReactNode;
}

// Input — text field with optional leading icon, label, and trailing slot
// (e.g. a password show/hide toggle — see components/auth/AuthInput.tsx).
export function Input({ label, icon, hint, error, containerStyle, rightElement, style, onFocus, onBlur, ...rest }: Props) {
  const theme = useTheme();
  const [focus, setFocus] = useState(false);
  const borderColor = error ? theme.danger : focus ? theme.primary : theme.border;

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={{ marginBottom: 7, fontSize: 14, fontFamily: fonts.bodySemibold, color: theme.text }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          height: controlHeight.lg,
          paddingHorizontal: 16,
          backgroundColor: theme.surface,
          borderWidth: 1.5,
          borderColor,
          borderRadius: radii.md,
          // Always-on shadow — toggling elevation on/off with focus state was forcing
          // Android to recreate this View on every focus, dropping the TextInput's
          // native focus a beat later (keyboard opens, then immediately closes).
          // Focus is already indicated by the border color change above.
          ...shadows.xs,
        }}
      >
        {icon && <Icon name={icon} size={18} color={theme.muted} />}
        <TextInput
          onFocus={(e) => { setFocus(true); onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); onBlur?.(e); }}
          placeholderTextColor={theme.muted}
          style={[
            {
              flex: 1,
              fontFamily: fonts.bodyMedium,
              fontSize: 16,
              color: theme.text,
              padding: 0,
            },
            style,
          ]}
          {...rest}
        />
        {rightElement}
      </View>
      {(hint || error) && (
        <Text style={{ marginTop: 6, fontSize: 12, color: error ? theme.danger : theme.muted }}>
          {error || hint}
        </Text>
      )}
    </View>
  );
}
