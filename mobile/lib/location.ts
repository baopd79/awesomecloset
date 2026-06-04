// Foreground location helper for weather-aware suggestions.
// Permission is requested lazily (on first "Tạo gợi ý" tap), with a manual fallback
// when the user denies — see hooks/useSuggest.ts.
import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

/**
 * Request permission and read the current position.
 * Returns null if permission is denied or the fix fails — caller falls back to
 * a manual weather condition.
 */
export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
