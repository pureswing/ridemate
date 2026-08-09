import { View } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fonts, radii } from '@/constants/themes';
import { PriceAnalysis } from '@/utils/priceAnalysis';

interface Props {
  visible: boolean;
  onClose: () => void;
  analysis: PriceAnalysis | null;
}

// Tapping a post's price badge in the feed opens this — matches the design
// system's Feed.jsx price-analysis bottom sheet. See utils/priceAnalysis.ts
// for why the underlying numbers are a placeholder reference, not a real
// computed community average, yet.
export function PriceAnalysisSheet({ visible, onClose, analysis }: Props) {
  const theme = useTheme();
  const t = useTranslation();
  if (!analysis) return null;

  const tone =
    analysis.tier === 'above' ? { color: theme.driverText, label: t.feed.priceTierAbove }
    : analysis.tier === 'below' ? { color: theme.muted, label: t.feed.priceTierBelow }
    : { color: theme.accent, label: t.feed.priceTierAvg };

  const body =
    analysis.tier === 'avg' ? t.feed.priceBodyAvg.replace('{baseline}', String(analysis.baseline))
    : analysis.tier === 'above' ? t.feed.priceBodyAbove.replace('{pct}', String(analysis.percent))
    : t.feed.priceBodyBelow.replace('{pct}', String(analysis.percent));

  return (
    <BottomSheet visible={visible} onClose={onClose} style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <View style={{ width: 38, height: 38, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.color + '22' }}>
          <Icon name="brain" size={20} color={tone.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: tone.color }}>{tone.label}</Text>
            {analysis.percent != null && (
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: tone.color }}>{analysis.percent}%</Text>
            )}
          </View>
          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: theme.textFaint, marginTop: 2 }}>
            {t.feed.priceAnalysisSubtitle}
          </Text>
        </View>
      </View>
      <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13.5, color: theme.text, lineHeight: 20 }}>
        {body}
      </Text>
    </BottomSheet>
  );
}
