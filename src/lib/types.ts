export type TripType = 'leisure' | 'business' | 'mixed';
export type Transport = 'plane' | 'car' | 'train';
/** Light = re-wear clothes, skip nice-to-haves. Full = everything. */
export type PackLevel = 'light' | 'full';

export type Activity =
  | 'beach'
  | 'swimming'
  | 'snorkeling'
  | 'surfing'
  | 'sailing'
  | 'fishing'
  | 'hiking'
  | 'climbing'
  | 'skiing'
  | 'running'
  | 'gym'
  | 'yoga'
  | 'cycling'
  | 'golf'
  | 'tennis'
  | 'camping'
  | 'sightseeing'
  | 'themepark'
  | 'spa'
  | 'festival'
  | 'cruise'
  | 'wedding'
  | 'formal'
  | 'nightlife'
  | 'remotework'
  | 'photography'
  | 'kids'
  | 'baby'
  | 'pets';

export type Category =
  | 'Documents'
  | 'Clothing'
  | 'Weather gear'
  | 'Toiletries'
  | 'Health'
  | 'Electronics'
  | 'Activities'
  | 'Business'
  | 'Travel'
  | 'Other';

export const CATEGORY_ORDER: Category[] = [
  'Documents',
  'Clothing',
  'Weather gear',
  'Activities',
  'Business',
  'Toiletries',
  'Health',
  'Electronics',
  'Travel',
  'Other',
];

export interface Place {
  name: string;
  admin1?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface WeatherDay {
  date: string; // yyyy-mm-dd (trip date, even if sourced from last year)
  tMax: number;
  tMin: number;
  precipSum: number;
  precipProb?: number;
  snowSum: number;
  windMax: number;
  uvMax?: number;
  /** Daily mean relative humidity, %. */
  humidity?: number;
  code: number;
  historical: boolean;
}

export interface WeatherSummary {
  days: WeatherDay[];
  source: 'forecast' | 'historical' | 'mixed';
  avgHigh: number;
  avgLow: number;
  maxHigh: number;
  minLow: number;
  rainyDays: number;
  snowyDays: number;
  heavyRain: boolean;
  maxWind: number;
  maxUv: number;
  /** Mean relative humidity across the trip, % (absent on trips saved before humidity was added). */
  avgHumidity?: number | null;
  fetchedAt: string;
}

export interface PackItem {
  id: string;
  /** Stable key for recommended items, so refreshes keep packed state. Absent for custom items. */
  key?: string;
  name: string;
  category: Category;
  qty: number;
  packed: boolean;
  custom?: boolean;
  reason?: string;
  /** Starred must-haves — called out in reminders. */
  essential?: boolean;
  /** Still needs buying before the trip. */
  toBuy?: boolean;
  /** Checked off in repack (return) mode. */
  repacked?: boolean;
  /** Used up on the trip (snacks, tickets) — hidden in repack mode. */
  consumable?: boolean;
  /** User changed the quantity — refreshes won't override it. */
  qtyEdited?: boolean;
  /** Free-text note, e.g. "Borrow from Sam" or "Blue packing cube". */
  note?: string;
}

export interface WeatherChange {
  at: string;
  summary: string;
  added: string[];
}

export interface Trip {
  id: string;
  destination: Place;
  start: string; // yyyy-mm-dd
  end: string; // yyyy-mm-dd
  type: TripType;
  transport: Transport;
  activities: Activity[];
  laundry: boolean;
  level: PackLevel;
  weather?: WeatherSummary;
  /** Latest automatic weather update worth telling the user about. */
  weatherChange?: WeatherChange;
  items: PackItem[];
  /** Recommended keys the user removed — never re-added on refresh. */
  dismissedKeys: string[];
  /** Return-trip checklist mode. */
  repack: boolean;
  reminders: boolean;
  createdAt: string;
}

/** Items the user wants on every new trip. */
export interface AlwaysItem {
  name: string;
  category: Category;
  qty: number;
}

export interface Profile {
  alwaysPack: AlwaysItem[];
  /** Custom item names the user has added before — offered as quick picks. */
  history: AlwaysItem[];
}

export const emptyProfile = (): Profile => ({ alwaysPack: [], history: [] });

/** Fill in fields added after a trip was first saved. */
export function normalizeTrip(t: Trip): Trip {
  return {
    ...t,
    level: t.level ?? 'full',
    repack: t.repack ?? false,
    reminders: t.reminders ?? true,
    dismissedKeys: t.dismissedKeys ?? [],
  };
}
