import { ThemedText as Text } from './ThemedText';
import { fonts } from '@/constants/themes';

// Bolds any "$123" / "$12.50" amount inline within an otherwise plain string
// — messages.body is just TEXT (no rich-formatting field, see
// components/ride/OfferSheet.tsx's comment on why offers are plain
// interpolated strings, not structured data), so this is a display-only
// regex split, not markdown — the stored value itself stays plain text.
// Shared between the chat thread (app/messages/[id].tsx) and the inbox list
// preview (app/(tabs)/messages.tsx) so an offer's amount reads the same to
// both the sender and the post's creator, wherever they see it.
export function renderBodyWithBoldPrice(body: string) {
  const parts = body.split(/(\$\d+(?:\.\d+)?)/g);
  return parts.map((part, i) =>
    /^\$\d+(?:\.\d+)?$/.test(part) ? (
      <Text key={i} style={{ fontFamily: fonts.bodyExtraBold }}>{part}</Text>
    ) : (
      part
    )
  );
}
