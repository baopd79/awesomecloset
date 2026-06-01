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
