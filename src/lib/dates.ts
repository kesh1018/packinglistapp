export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const today = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

/** Inclusive number of calendar days in the trip. */
export const tripDays = (start: string, end: string) => daysBetween(fromISO(start), fromISO(end)) + 1;

export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = fromISO(start); d <= fromISO(end); d = addDays(d, 1)) out.push(toISO(d));
  return out;
}

export function formatRange(start: string, end: string) {
  const a = fromISO(start);
  const b = fromISO(end);
  const sameYear = a.getFullYear() === b.getFullYear();
  const sameMonth = sameYear && a.getMonth() === b.getMonth();
  const day = (d: Date) => d.getDate();
  const mon = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' });
  if (start === end) return `${day(a)} ${mon(a)} ${a.getFullYear()}`;
  if (sameMonth) return `${day(a)}–${day(b)} ${mon(b)} ${b.getFullYear()}`;
  if (sameYear) return `${day(a)} ${mon(a)} – ${day(b)} ${mon(b)} ${b.getFullYear()}`;
  return `${day(a)} ${mon(a)} ${a.getFullYear()} – ${day(b)} ${mon(b)} ${b.getFullYear()}`;
}

export const weekday = (iso: string) => fromISO(iso).toLocaleDateString('en-GB', { weekday: 'short' });

export function countdown(start: string, end: string) {
  const t = today();
  const s = daysBetween(t, fromISO(start));
  const e = daysBetween(t, fromISO(end));
  if (e < 0) return 'Completed';
  if (s <= 0) return 'Travelling now';
  if (s === 1) return 'Tomorrow';
  return `In ${s} days`;
}
