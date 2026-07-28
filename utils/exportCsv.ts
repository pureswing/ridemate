import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Quotes a CSV field only when it actually needs it (contains a comma,
// quote, or newline) — matches how Excel/Sheets expect a CSV to look,
// rather than blanket-quoting every value.
function csvField(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(csvField).join(',')];
  for (const row of rows) lines.push(row.map(csvField).join(','));
  return lines.join('\r\n');
}

// Writes the CSV to the cache directory and opens the native share sheet —
// there's no "download" concept on mobile, sharing is the standard way a
// user gets a generated file out of the app (save to Files/Drive, email it,
// open in Sheets, etc).
export async function shareCsv(csv: string, filename: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(csv);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: filename, UTI: 'public.comma-separated-values-text' });
  }
}
