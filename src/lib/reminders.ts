import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import type { Trip } from './types';
import { addDays, fromISO } from './dates';

/** Local reminders: 3 days out, the evening before, and repack on the last morning. */

const native = () => Capacitor.isNativePlatform();

function baseId(tripId: string) {
  let h = 0;
  for (const c of tripId) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (Math.abs(h) % 200_000) * 10;
}

const at = (iso: string, dayOffset: number, hour: number) => {
  const d = addDays(fromISO(iso), dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
};

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!native()) return false;
  const cur = await LocalNotifications.checkPermissions();
  if (cur.display === 'granted') return true;
  if (cur.display === 'denied') return false;
  const req = await LocalNotifications.requestPermissions();
  return req.display === 'granted';
}

export function plannedReminders(trip: Trip, now = new Date()): LocalNotificationSchema[] {
  if (!trip.reminders) return [];
  const base = baseId(trip.id);
  const place = trip.destination.name;
  const left = trip.items.filter((i) => !i.packed);
  const essentials = left.filter((i) => i.essential).map((i) => i.name);
  const toBuy = trip.items.filter((i) => i.toBuy && !i.packed).length;
  const out: LocalNotificationSchema[] = [];

  if (left.length) {
    const buy = toBuy ? ` · ${toBuy} to buy` : '';
    out.push({
      id: base + 1,
      title: `${place} in 3 days`,
      body: `${left.length} of ${trip.items.length} items left to pack${buy}.`,
      schedule: { at: at(trip.start, -3, 18), allowWhileIdle: true },
      // Inexact is fine for reminders days ahead, and avoids the exact-alarm permission
      // (otherwise the plugin opens the "Alarms & reminders" settings screen).
      isExactNotification: false,
      extra: { tripId: trip.id },
    });
    out.push({
      id: base + 2,
      title: `Tomorrow: ${place}`,
      body: essentials.length
        ? `Don’t forget: ${essentials.slice(0, 4).join(', ')}${essentials.length > 4 ? '…' : ''}`
        : `${left.length} item${left.length > 1 ? 's' : ''} still to pack.`,
      schedule: { at: at(trip.start, -1, 18), allowWhileIdle: true },
      // Inexact is fine for reminders days ahead, and avoids the exact-alarm permission
      // (otherwise the plugin opens the "Alarms & reminders" settings screen).
      isExactNotification: false,
      extra: { tripId: trip.id },
    });
  }
  if (trip.end > trip.start) {
    out.push({
      id: base + 3,
      title: `Heading home from ${place}?`,
      body: 'Open repack mode so nothing gets left behind.',
      schedule: { at: at(trip.end, 0, 9), allowWhileIdle: true },
      // Inexact is fine for reminders days ahead, and avoids the exact-alarm permission
      // (otherwise the plugin opens the "Alarms & reminders" settings screen).
      isExactNotification: false,
      extra: { tripId: trip.id, repack: true },
    });
  }
  return out.filter((n) => n.schedule!.at! > now);
}

/** Cancel every Packing Pal reminder and schedule the current set. */
export async function syncReminders(trips: Trip[]) {
  if (!native()) return;
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  }
  const next = trips.flatMap((t) => plannedReminders(t));
  if (next.length) await LocalNotifications.schedule({ notifications: next });
}

export function onReminderTap(cb: (tripId: string, repack: boolean) => void) {
  if (!native()) return () => {};
  const sub = LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    const extra = e.notification.extra as { tripId?: string; repack?: boolean } | undefined;
    if (extra?.tripId) cb(extra.tripId, !!extra.repack);
  });
  return () => {
    sub.then((s) => s.remove());
  };
}
