import { KeyboardAvoidingView, View, Platform, ViewProps } from 'react-native';

// Android's default windowSoftInputMode is already "adjustResize" — even with
// behavior={undefined}, KeyboardAvoidingView still subscribes to keyboard
// show/hide events on Android, which was dropping TextInput focus right after
// the keyboard opened. Skip it entirely on Android; iOS still needs "padding".
export function KeyboardWrapper({ children, style }: ViewProps) {
  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView style={style ?? { flex: 1 }} behavior="padding">
        {children}
      </KeyboardAvoidingView>
    );
  }
  return <View style={style ?? { flex: 1 }}>{children}</View>;
}
