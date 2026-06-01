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
  const filename = fileUri.split('/').pop() ?? 'photo.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri: fileUri, name: filename, type: mimeType } as unknown as Blob);

  const response = await fetch(`${API_URL}/api/items/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }
  return response.json();
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
