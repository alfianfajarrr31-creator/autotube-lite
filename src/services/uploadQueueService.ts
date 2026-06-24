import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UploadQueueItem } from '../types';

export async function getUploadQueue(): Promise<UploadQueueItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('upload_queue')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching upload queue:', error);
    throw new Error(`Failed to fetch upload queue: ${error.message}`);
  }

  return (data as UploadQueueItem[]) || [];
}

export async function addUploadQueueItem(
  payload: Omit<UploadQueueItem, 'created_at' | 'updated_at'>
): Promise<UploadQueueItem> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('upload_queue')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error adding upload queue item:', error);
    throw new Error(`Failed to add item to queue: ${error.message}`);
  }

  return data as UploadQueueItem;
}

export async function deleteUploadQueueItem(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase
    .from('upload_queue')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting upload queue item:', error);
    throw new Error(`Failed to delete item from queue: ${error.message}`);
  }
}

export async function updateUploadQueueItem(
  id: string,
  payload: Partial<Omit<UploadQueueItem, 'id' | 'created_at'>>
): Promise<UploadQueueItem> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('upload_queue')
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating upload queue item:', error);
    throw new Error(`Failed to update queue item: ${error.message}`);
  }

  return data as UploadQueueItem;
}

export async function updateUploadQueueStatus(
  id: string,
  status: 'Draft' | 'Scheduled' | 'Uploaded' | 'Failed'
): Promise<UploadQueueItem> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('upload_queue')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating upload queue status:', error);
    throw new Error(`Failed to update item status: ${error.message}`);
  }

  return data as UploadQueueItem;
}

export async function markQueueItemUploaded(
  id: string,
  payload: {
    youtube_video_id: string;
    youtube_video_url: string;
    uploaded_at: string;
  }
): Promise<UploadQueueItem> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('upload_queue')
    .update({
      status: 'Uploaded',
      youtube_video_id: payload.youtube_video_id,
      youtube_video_url: payload.youtube_video_url,
      uploaded_at: payload.uploaded_at,
      upload_error: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error marking queue item as uploaded:', error);
    throw new Error(`Failed to update upload queue item: ${error.message}`);
  }

  return data as UploadQueueItem;
}

export async function markQueueItemUploadFailed(
  id: string,
  errorMessage: string
): Promise<UploadQueueItem> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('upload_queue')
    .update({
      status: 'Failed',
      upload_error: errorMessage,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error marking queue item upload failed:', error);
    throw new Error(`Failed to update upload queue item failure: ${error.message}`);
  }

  return data as UploadQueueItem;
}

export async function resetQueueItemForRetry(
  id: string
): Promise<UploadQueueItem> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('upload_queue')
    .update({
      upload_error: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error resetting queue item for retry:', error);
    throw new Error(`Failed to reset item for retry: ${error.message}`);
  }

  return data as UploadQueueItem;
}

export async function clearUploadQueue(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase
    .from('upload_queue')
    .delete()
    .neq('id', ''); // Delete all keys since ID is not empty

  if (error) {
    console.error('Error clearing upload queue:', error);
    throw new Error(`Failed to clear upload queue: ${error.message}`);
  }
}
