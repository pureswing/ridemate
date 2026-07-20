// Live-format date as the user types digits: 20231015 → 2023-10-15
// Month clamped 01-12; day clamped 01-31.
// If first month digit > 1, or first day digit > 3, auto-pads leading "0".
export function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const len = digits.length;
  if (len === 0) return '';
  if (len <= 4) return digits;

  const year = digits.slice(0, 4);

  if (len === 5) {
    const m1 = parseInt(digits[4], 10);
    if (m1 > 1) return `${year}-0${m1}`;
    return `${year}-${digits[4]}`;
  }

  const rawMonth = parseInt(digits.slice(4, 6), 10);
  const month = String(Math.min(Math.max(rawMonth, 1), 12)).padStart(2, '0');
  if (len === 6) return `${year}-${month}`;

  if (len === 7) {
    const d1 = parseInt(digits[6], 10);
    if (d1 > 3) return `${year}-${month}-0${d1}`;
    return `${year}-${month}-${digits[6]}`;
  }

  const rawDay = parseInt(digits.slice(6, 8), 10);
  const day = String(Math.min(Math.max(rawDay, 1), 31)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Live-format time as the user types digits: 1430 → 14:30
// Hour clamped 00-23; minute clamped 00-59.
// If first hour digit > 2, or first minute digit > 5, auto-pads leading "0".
export function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  const len = digits.length;
  if (len === 0) return '';

  if (len === 1) {
    const h1 = parseInt(digits[0], 10);
    if (h1 > 2) return `0${h1}`;
    return digits[0];
  }

  const rawHour = parseInt(digits.slice(0, 2), 10);
  const hour = String(Math.min(rawHour, 23)).padStart(2, '0');
  if (len === 2) return hour;

  if (len === 3) {
    const m1 = parseInt(digits[2], 10);
    if (m1 > 5) return `${hour}:0${m1}`;
    return `${hour}:${digits[2]}`;
  }

  const rawMin = parseInt(digits.slice(2, 4), 10);
  const minute = String(Math.min(rawMin, 59)).padStart(2, '0');
  return `${hour}:${minute}`;
}

// Compact display for RideCard edit indicator: "06-24 05:08 AM"
export function shortDateTime(isoString: string, locale: string): string {
  const d = new Date(isoString);
  const date = d.toLocaleDateString(locale, { month: '2-digit', day: '2-digit' });
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

// date/time <-> "YYYY-MM-DD" / "HH:mm" string conversions, used at the edges
// of the native <DateTimePicker> in the ride post create/edit forms — those
// screens keep `date`/`time` as plain strings (handleSubmit builds
// `${date}T${time}:00` straight into `new Date(...)`), so the picker only
// ever touches the representation here.
export function dateStringToDate(s: string): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export function timeStringToDate(s: string): Date {
  const base = new Date();
  if (!s) return base;
  const [h, m] = s.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return base;
  base.setHours(h, m, 0, 0);
  return base;
}

export function dateToDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateToTimeString(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// "in 2h 15m" / "in 3d" style countdown for the ride detail screen's
// "Leaves" stat card. Past-dated posts (shouldn't normally be viewable, but
// defensive) fall back to a plain "—" rather than a negative duration.
export function formatLeavesIn(isoString: string): string {
  const diffMs = new Date(isoString).getTime() - Date.now();
  if (diffMs <= 0) return '—';
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) return remMinutes > 0 ? `in ${hours}h ${remMinutes}m` : `in ${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `in ${days}d ${remHours}h` : `in ${days}d`;
}

// "8:00 AM" style arrival clock time — scheduled departure + trip duration.
export function formatEta(scheduledAtIso: string, durationSeconds: number | undefined, locale: string): string {
  if (!durationSeconds) return '—';
  const arrival = new Date(new Date(scheduledAtIso).getTime() + durationSeconds * 1000);
  return arrival.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

// Compact "1h 10m" duration, computed from raw seconds — not a reformat of
// Google's own duration_text ("1 hour 10 mins"), since parsing that string
// back apart is more fragile than just deriving it from the number already
// stored alongside it.
export function formatDurationShort(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
