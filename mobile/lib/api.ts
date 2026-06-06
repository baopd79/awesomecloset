import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export type ProcessingStatus = 'pending' | 'removing_bg' | 'tagging' | 'ready' | 'failed';

export interface ItemResponse {
  id: string;
  user_id: string;
  original_url: string | null;
  processed_url: string | null;
  thumbnail_url: string | null;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  type: string | null;
  colors: unknown[] | null;
  style: string[] | null;
  season: string[] | null;
  occasion: string[] | null;
  custom_tags: string[] | null;
  wear_count: number;
  last_worn_at: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return token;
}

export async function uploadItem(fileUri: string): Promise<ItemResponse> {
  const token = await getToken();

  const result = await FileSystem.uploadAsync(
    `${API_URL}/api/items/upload`,
    fileUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (${result.status}): ${result.body}`);
  }
  return JSON.parse(result.body);
}

export interface ItemListResponse {
  items: ItemResponse[];
  next_cursor: string | null;
}

export interface ListItemsParams {
  type?: string;
  occasion?: string;
  season?: string;
  is_archived?: boolean;
  sort_by?: 'created_at' | 'last_worn_at' | 'wear_count';
  q?: string;
  cursor?: string;
  limit?: number;
}

export async function listItems(params: ListItemsParams = {}): Promise<ItemListResponse> {
  const token = await getToken();
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) query.set(k, String(v));
  });
  const response = await fetch(`${API_URL}/api/items?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`List failed (${response.status})`);
  return response.json() as Promise<ItemListResponse>;
}

export async function getItem(itemId: string): Promise<ItemResponse> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/items/${itemId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Get item failed (${response.status})`);
  return response.json() as Promise<ItemResponse>;
}

export async function archiveItem(itemId: string): Promise<ItemResponse> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/items/${itemId}/archive`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Archive failed (${response.status})`);
  return response.json() as Promise<ItemResponse>;
}

export async function unarchiveItem(itemId: string): Promise<ItemResponse> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/items/${itemId}/unarchive`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Unarchive failed (${response.status})`);
  return response.json() as Promise<ItemResponse>;
}

export async function deleteItem(itemId: string): Promise<void> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/items/${itemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  // 204 No Content on success — response.ok covers it.
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Delete failed (${response.status}): ${text}`);
  }
}

export async function retryItem(itemId: string): Promise<ItemResponse> {
  const token = await getToken();

  const response = await fetch(`${API_URL}/api/items/${itemId}/retry`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Retry failed (${response.status}): ${text}`);
  }
  return response.json();
}

// --- Outfits & suggestions ---------------------------------------------------

export type OutfitItemRole =
  | 'top'
  | 'bottom'
  | 'outerwear'
  | 'shoes'
  | 'bag'
  | 'accessory';

export interface OutfitItem {
  item_id: string;
  role: OutfitItemRole;
  position: number;
  thumbnail_url: string | null;
  processed_url: string | null;
  type: string | null;
}

export interface OutfitResponse {
  id: string;
  user_id: string;
  name: string | null;
  collage_url: string | null;
  occasion: string | null;
  ai_generated: boolean;
  ai_reasoning: string | null;
  is_saved: boolean;
  items: OutfitItem[];
  created_at: string;
  updated_at: string;
}

export interface WeatherResponse {
  temp_c: number;
  condition: string;
  city: string;
  icon: string;
}

export type ManualCondition = 'hot' | 'warm' | 'cool' | 'cold' | 'rainy';

export interface SuggestResponse {
  outfits: OutfitResponse[];
  cached: boolean;
}

export interface SuggestRequest {
  occasion?: string;
  lat?: number;
  lng?: number;
  manual_condition?: ManualCondition;
}

/** Closet gate not yet met — surfaced from the 403 CLOSET_NOT_READY response. */
export class ClosetNotReadyError extends Error {
  constructor(
    readonly itemsCount: number,
    readonly itemsRequired: number,
  ) {
    super(`Closet not ready: ${itemsCount}/${itemsRequired}`);
    this.name = 'ClosetNotReadyError';
  }
}

export async function getWeather(
  params: { lat: number; lng: number } | { manual_condition: ManualCondition },
): Promise<WeatherResponse> {
  const token = await getToken();
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => query.set(k, String(v)));
  const response = await fetch(`${API_URL}/api/suggest/weather?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Weather failed (${response.status})`);
  return response.json() as Promise<WeatherResponse>;
}

export async function suggestOutfit(body: SuggestRequest): Promise<SuggestResponse> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/suggest/outfit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.status === 403) {
    const data = (await response.json().catch(() => ({}))) as {
      code?: string;
      items_count?: number;
      items_required?: number;
    };
    if (data.code === 'CLOSET_NOT_READY') {
      throw new ClosetNotReadyError(data.items_count ?? 0, data.items_required ?? 15);
    }
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Suggest failed (${response.status}): ${text}`);
  }
  return response.json() as Promise<SuggestResponse>;
}

export async function getOutfit(outfitId: string): Promise<OutfitResponse> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/outfits/${outfitId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Get outfit failed (${response.status})`);
  return response.json() as Promise<OutfitResponse>;
}

export interface OutfitListResponse {
  outfits: OutfitResponse[];
}

/** List the user's outfits. `saved: true` returns only the saved collection. */
export async function listOutfits(params: { saved?: boolean } = {}): Promise<OutfitResponse[]> {
  const token = await getToken();
  const query = new URLSearchParams();
  if (params.saved !== undefined) query.set('saved', String(params.saved));
  const response = await fetch(`${API_URL}/api/outfits?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`List outfits failed (${response.status})`);
  const data = (await response.json()) as OutfitListResponse;
  return data.outfits;
}

export interface CreateOutfitItemInput {
  item_id: string;
  role: OutfitItemRole;
  position?: number;
}

export interface CreateOutfitInput {
  name?: string | null;
  occasion?: string | null;
  items: CreateOutfitItemInput[];
}

/** Manual builder — creates an outfit (saved into the collection on the server). */
export async function createOutfit(body: CreateOutfitInput): Promise<OutfitResponse> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/outfits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Create outfit failed (${response.status}): ${text}`);
  }
  return response.json() as Promise<OutfitResponse>;
}

export async function saveOutfit(outfitId: string): Promise<OutfitResponse> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/outfits/${outfitId}/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Save outfit failed (${response.status})`);
  return response.json() as Promise<OutfitResponse>;
}

export async function unsaveOutfit(outfitId: string): Promise<OutfitResponse> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/outfits/${outfitId}/unsave`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Unsave outfit failed (${response.status})`);
  return response.json() as Promise<OutfitResponse>;
}

export interface WearLogResponse {
  id: string;
  outfit_id: string;
  worn_date: string;
  items_snapshot: unknown[];
  rating: number | null;
  created_at: string;
}

export async function wearOutfit(
  outfitId: string,
  rating?: number,
): Promise<WearLogResponse> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/outfits/${outfitId}/wear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating: rating ?? null }),
  });
  if (!response.ok) throw new Error(`Wear failed (${response.status})`);
  return response.json() as Promise<WearLogResponse>;
}

export type FeedbackAction = 'saved' | 'worn' | 'dismissed' | 'disliked';

export interface FeedbackResponse {
  id: string;
  outfit_id: string;
  action: FeedbackAction;
  rating: number | null;
  created_at: string;
}

export async function submitFeedback(
  outfitId: string,
  action: FeedbackAction,
  rating?: number,
): Promise<FeedbackResponse> {
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/outfits/${outfitId}/feedback`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, rating: rating ?? null }),
  });
  if (!response.ok) throw new Error(`Feedback failed (${response.status})`);
  return response.json() as Promise<FeedbackResponse>;
}

// --- Analytics ---------------------------------------------------------------

export interface ColorStat {
  name: string;
  hex: string;
  count: number;
}

export interface AnalyticsSummary {
  items_count: number;
  outfits_count: number;
  worn_days: number;
}

export interface UnwornItem {
  id: string;
  type: string | null;
  thumbnail_url: string | null;
}

export interface HistoryEntry {
  date: string; // ISO date (YYYY-MM-DD)
  outfit_id: string;
  collage_url: string | null;
  occasion: string | null;
}

async function getJson<T>(path: string): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`${path} failed (${response.status})`);
  return response.json() as Promise<T>;
}

export function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  return getJson<AnalyticsSummary>('/api/analytics/summary');
}

export function getColorStats(): Promise<{ colors: ColorStat[] }> {
  return getJson<{ colors: ColorStat[] }>('/api/analytics/colors');
}

export function getUnworn(): Promise<{ items: UnwornItem[] }> {
  return getJson<{ items: UnwornItem[] }>('/api/analytics/unworn');
}

export function getHistory(): Promise<{ days: HistoryEntry[] }> {
  return getJson<{ days: HistoryEntry[] }>('/api/analytics/history');
}
