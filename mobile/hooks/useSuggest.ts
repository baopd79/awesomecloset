import { useCallback, useState } from 'react';
import {
  ClosetNotReadyError,
  getWeather,
  suggestOutfit,
  type ManualCondition,
  type OutfitResponse,
  type SuggestRequest,
  type WeatherResponse,
} from '@/lib/api';
import { getCurrentCoords } from '@/lib/location';

export type SuggestPhase = 'idle' | 'generating' | 'results' | 'gate' | 'error';

interface GateInfo {
  count: number;
  required: number;
}

interface SuggestState {
  phase: SuggestPhase;
  outfits: OutfitResponse[];
  weather: WeatherResponse | null;
  cached: boolean;
  gate: GateInfo | null;
  error: string | null;
  needsManualWeather: boolean;
}

const INITIAL: SuggestState = {
  phase: 'idle',
  outfits: [],
  weather: null,
  cached: false,
  gate: null,
  error: null,
  needsManualWeather: false,
};

/**
 * On-demand outfit suggestion flow for the Home screen.
 *
 * Location permission is requested lazily inside `generate()` (first tap). If the
 * user denies and hasn't picked a manual weather condition, `needsManualWeather`
 * flips true so the UI can prompt for one — no auto-call burns the 10/day quota.
 */
export function useSuggest() {
  const [occasion, setOccasion] = useState<string | null>(null);
  const [manualCondition, setManualCondition] = useState<ManualCondition | null>(null);
  const [state, setState] = useState<SuggestState>(INITIAL);

  const generate = useCallback(async () => {
    setState((s) => ({ ...s, phase: 'generating', error: null, needsManualWeather: false }));

    // Resolve weather source: manual override > GPS coords.
    const body: SuggestRequest = {};
    if (occasion) body.occasion = occasion;

    let weatherParams:
      | { lat: number; lng: number }
      | { manual_condition: ManualCondition }
      | null = null;

    if (manualCondition) {
      body.manual_condition = manualCondition;
      weatherParams = { manual_condition: manualCondition };
    } else {
      const coords = await getCurrentCoords();
      if (coords) {
        body.lat = coords.lat;
        body.lng = coords.lng;
        weatherParams = coords;
      } else {
        // Denied/failed and no manual fallback chosen → ask the user to pick one.
        setState((s) => ({ ...s, phase: 'idle', needsManualWeather: true }));
        return;
      }
    }

    try {
      // Weather badge is best-effort — never block the suggestion on it.
      const weather = await getWeather(weatherParams).catch(() => null);
      const res = await suggestOutfit(body);
      setState({
        phase: 'results',
        outfits: res.outfits,
        weather,
        cached: res.cached,
        gate: null,
        error: null,
        needsManualWeather: false,
      });
    } catch (e) {
      if (e instanceof ClosetNotReadyError) {
        setState({
          ...INITIAL,
          phase: 'gate',
          gate: { count: e.itemsCount, required: e.itemsRequired },
        });
        return;
      }
      setState((s) => ({ ...s, phase: 'error', error: String(e) }));
    }
  }, [occasion, manualCondition]);

  const reset = useCallback(() => setState(INITIAL), []);

  return {
    occasion,
    setOccasion,
    manualCondition,
    setManualCondition,
    generate,
    reset,
    ...state,
  };
}
