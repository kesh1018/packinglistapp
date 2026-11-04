import { Preferences } from '@capacitor/preferences';
import { emptyProfile, normalizeTrip, type Profile, type Trip } from './types';

const KEY = 'packingpal.trips.v1';
const PROFILE_KEY = 'packingpal.profile.v1';

/**
 * Load saved trips. Throws if storage can't be read or parsed: the caller must
 * then NOT save, or it would overwrite the user's real data with an empty list.
 */
export async function loadTrips(): Promise<Trip[]> {
  const { value } = await Preferences.get({ key: KEY });
  return value ? (JSON.parse(value) as Trip[]).map(normalizeTrip) : [];
}

export async function saveTrips(trips: Trip[]) {
  await Preferences.set({ key: KEY, value: JSON.stringify(trips) });
}

/** Same contract as loadTrips: throws on unreadable storage. */
export async function loadProfile(): Promise<Profile> {
  const { value } = await Preferences.get({ key: PROFILE_KEY });
  return value ? { ...emptyProfile(), ...(JSON.parse(value) as Profile) } : emptyProfile();
}

export async function saveProfile(p: Profile) {
  await Preferences.set({ key: PROFILE_KEY, value: JSON.stringify(p) });
}
