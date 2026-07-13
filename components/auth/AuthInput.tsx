import { useState } from 'react';
import { Pressable, TextInputProps } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { IconName } from '@/constants/icons';
import { useTheme } from '@/hooks/useTheme';

interface Props extends TextInputProps {
  icon: IconName;
  hint?: string;
  error?: string;
}

// Auth-flow text field — core Input plus a show/hide toggle for password fields.
export function AuthInput({ icon, secureTextEntry, ...rest }: Props) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const isPassword = !!secureTextEntry;

  return (
    <Input
      icon={icon}
      secureTextEntry={isPassword && !visible}
      autoCapitalize="none"
      autoCorrect={false}
      rightElement={
        isPassword ? (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}>
            <Icon name={visible ? 'eye_off' : 'eye'} size={17} color={theme.muted} />
          </Pressable>
        ) : undefined
      }
      {...rest}
    />
  );
}
