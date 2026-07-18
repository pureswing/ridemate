import { useState } from 'react';
import { View, Platform } from 'react-native';
import { TouchableOpacity } from './TouchableOpacity';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Input } from './Input';
import { PickerSheet } from './PickerSheet';
import { useTheme } from '@/hooks/useTheme';
import { IconName } from '@/constants/icons';
import { dateStringToDate, timeStringToDate, dateToDateString, dateToTimeString } from '@/utils/dateFormat';

interface Props {
  mode: 'date' | 'time';
  value: string; // "YYYY-MM-DD" for date mode, "HH:mm" for time mode
  onChange: (v: string) => void;
  icon: IconName;
  placeholder: string;
  doneLabel: string;
  locale: string;
}

// Tap-to-open native calendar/clock field — Android pops its own dialog on
// mount and reports back once via onChange; iOS has no built-in dismiss for
// the inline spinner, so it rides in PickerSheet's bottom-sheet chrome.
// `value`/`onChange` stay plain "YYYY-MM-DD" / "HH:mm" strings; this
// component only touches Date objects at its own edges.
export function DateTimeField({ mode, value, onChange, icon, placeholder, doneLabel, locale }: Props) {
  const theme = useTheme();
  const [show, setShow] = useState(false);

  const displayValue = value
    ? mode === 'date'
      ? dateStringToDate(value).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
      : timeStringToDate(value).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
    : '';

  const pickerValue = mode === 'date' ? dateStringToDate(value) : timeStringToDate(value);

  function applyPicked(selected: Date) {
    onChange(mode === 'date' ? dateToDateString(selected) : dateToTimeString(selected));
  }

  return (
    <>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setShow(true)}>
        <View style={{ pointerEvents: 'none' }}>
          <Input icon={icon} editable={false} placeholder={placeholder} value={displayValue} />
        </View>
      </TouchableOpacity>
      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={pickerValue}
          mode={mode}
          display="default"
          onChange={(e, selected) => {
            setShow(false);
            if (e.type === 'set' && selected) applyPicked(selected);
          }}
        />
      )}
      {Platform.OS === 'ios' && (
        <PickerSheet visible={show} onClose={() => setShow(false)} doneLabel={doneLabel} theme={theme}>
          <DateTimePicker
            value={pickerValue}
            mode={mode}
            display="spinner"
            onChange={(e, selected) => { if (selected) applyPicked(selected); }}
          />
        </PickerSheet>
      )}
    </>
  );
}
