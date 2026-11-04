import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { CATEGORY_ORDER, type Trip } from './types';
import { formatRange, tripDays } from './dates';
import { copyToClipboard } from './utils';

export const placeLabel = (t: Trip) =>
  [t.destination.name, t.destination.country].filter(Boolean).join(', ');

export function tripToText(trip: Trip): string {
  const lines: string[] = [];
  const days = tripDays(trip.start, trip.end);
  lines.push(`🧳 ${placeLabel(trip)}`);
  lines.push(`📅 ${formatRange(trip.start, trip.end)} (${days} day${days > 1 ? 's' : ''})`);
  const w = trip.weather;
  if (w) {
    const rain = w.rainyDays ? `, rain on ${w.rainyDays} day${w.rainyDays > 1 ? 's' : ''}` : '';
    const humid = w.avgHumidity != null ? `, ${w.avgHumidity}% humidity` : '';
    const note = w.source === 'historical' ? ' (typical for these dates)' : '';
    lines.push(`🌤 ${w.minLow}–${w.maxHigh}°C${rain}${humid}${note}`);
  }
  const packed = trip.items.filter((i) => i.packed).length;
  lines.push(`✅ ${packed}/${trip.items.length} packed`);

  for (const cat of CATEGORY_ORDER) {
    const items = trip.items.filter((i) => i.category === cat);
    if (!items.length) continue;
    lines.push('', cat.toUpperCase());
    for (const i of items) {
      const tags = [i.essential ? '★' : '', i.toBuy && !i.packed ? '(to buy)' : ''].filter(Boolean).join(' ');
      lines.push(`${i.packed ? '☑' : '☐'} ${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}${tags ? ` ${tags}` : ''}${i.note ? ` — ${i.note}` : ''}`);
    }
  }
  const toBuy = trip.items.filter((i) => i.toBuy && !i.packed);
  if (toBuy.length) lines.push('', `🛒 To buy: ${toBuy.map((i) => i.name).join(', ')}`);
  lines.push('', 'Shared from Packing Pal');
  return lines.join('\n');
}

/** Opens the native share sheet on Android; falls back to Web Share or clipboard. */
export async function shareTrip(trip: Trip): Promise<'shared' | 'copied' | 'cancelled'> {
  const text = tripToText(trip);
  const title = `Packing list · ${placeLabel(trip)}`;
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title, text, dialogTitle: 'Share trip' });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ title, text });
      return 'shared';
    }
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (/cancel|abort/i.test(msg)) return 'cancelled';
  }
  await copyToClipboard(text);
  return 'copied';
}
