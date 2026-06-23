import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DriveVideoRecord } from '../types';

/**
 * Gets all persisted Google Drive videos from the drive_videos table.
 */
export async function getDriveVideos(): Promise<DriveVideoRecord[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('drive_videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not contact drive_videos table. Check if table SQL has been executed in the Supabase SQL Editor. Error:', error);
      // If table is missing from schema, return empty list instead of crashing
      if (error.message && error.message.includes("Could not find the table")) {
        return [];
      }
      throw new Error(`Failed to load Drive videos from database: ${error.message}`);
    }

    return (data || []) as DriveVideoRecord[];
  } catch (err: any) {
    console.warn('getDriveVideos exception caught gracefully:', err);
    return [];
  }
}

/**
 * Upserts a single Drive video into the database.
 * If a record with the same drive_file_id exists, it updates it.
 */
export async function upsertDriveVideo(
  video: Omit<DriveVideoRecord, 'created_at' | 'updated_at'>
): Promise<DriveVideoRecord> {
  if (!isSupabaseConfigured || !supabase) {
    return video as DriveVideoRecord;
  }

  try {
    const nowStr = new Date().toISOString();
    const payload = {
      ...video,
      updated_at: nowStr,
    };

    const { data, error } = await supabase
      .from('drive_videos')
      .upsert(payload, { onConflict: 'drive_file_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting drive_video:', error);
      throw new Error(`Failed to save Drive video metadata: ${error.message}`);
    }

    return data as DriveVideoRecord;
  } catch (err: any) {
    console.error('upsertDriveVideo error:', err);
    throw err;
  }
}

/**
 * Upserts multiple Drive videos.
 */
export async function upsertDriveVideos(
  videos: Omit<DriveVideoRecord, 'created_at' | 'updated_at'>[]
): Promise<DriveVideoRecord[]> {
  if (!isSupabaseConfigured || !supabase || videos.length === 0) {
    return videos as DriveVideoRecord[];
  }

  try {
    const nowStr = new Date().toISOString();
    const payloads = videos.map(video => ({
      ...video,
      updated_at: nowStr,
    }));

    const { data, error } = await supabase
      .from('drive_videos')
      .upsert(payloads, { onConflict: 'drive_file_id' })
      .select();

    if (error) {
      console.error('Error bulk upserting drive_videos:', error);
      throw new Error(`Failed to save bulk Drive videos metadata: ${error.message}`);
    }

    return (data || []) as DriveVideoRecord[];
  } catch (err: any) {
    console.error('upsertDriveVideos error:', err);
    throw err;
  }
}

/**
 * Updates the status of a Drive video by its ID.
 */
export async function updateDriveVideoStatus(
  id: string,
  status: "Draft" | "Scheduled" | "Uploaded" | "Failed"
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  try {
    const { error } = await supabase
      .from('drive_videos')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating drive_video status:', error);
      throw new Error(`Failed to update Drive video status: ${error.message}`);
    }
  } catch (err: any) {
    console.error('updateDriveVideoStatus error:', err);
    throw err;
  }
}

/**
 * Deletes a Google Drive video record from the database.
 * NOTE: This does NOT delete the actual file from Google Drive, just from the bank.
 */
export async function deleteDriveVideo(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  try {
    const { error } = await supabase
      .from('drive_videos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting drive_video:', error);
      throw new Error(`Failed to remove Drive video from bank database: ${error.message}`);
    }
  } catch (err: any) {
    console.error('deleteDriveVideo error:', err);
    throw err;
  }
}
