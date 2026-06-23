export interface Video {
  id: string;
  title: string;
  duration: string;
  fileName: string;
  status: 'Draft' | 'Scheduled' | 'Uploaded' | 'Failed';
  size: string;
  resolution: string;
  thumbnailGradient: string;
  source?: 'mock' | 'drive';
  driveFileId?: string;
  mimeType?: string;
  url?: string;
  thumbnailUrl?: string;
  sizeBytes?: number;
}

export interface DriveVideoFile {
  id: string;
  driveFileId: string;
  title: string;
  fileName: string;
  duration?: string;
  mimeType?: string;
  url?: string;
  thumbnailUrl?: string;
  sizeBytes?: number;
  status: 'Draft' | 'Scheduled' | 'Uploaded' | 'Failed';
  source: 'drive';
}

export interface QueueItem {
  id: string;
  videoId: string;
  videoTitle: string;
  fileName: string;
  youtubeTitle: string;
  description: string;
  hashtags: string;
  thumbnail: string; // gradient index or text
  visibility: 'Private' | 'Unlisted' | 'Public';
  publishDate: string;
  publishTime: string;
  status: 'Draft' | 'Scheduled' | 'Uploaded' | 'Failed';
  progress?: number; // 0 - 100 for interactive simulation
  duration: string;
}

export interface UploadQueueItem {
  id: string;
  video_id: string;
  video_title: string;
  file_name: string;
  duration?: string | null;
  youtube_title: string;
  description?: string | null;
  hashtags?: string | null;
  thumbnail_text?: string | null;
  visibility: 'Private' | 'Unlisted' | 'Public';
  publish_date?: string | null;
  publish_time?: string | null;
  status: 'Draft' | 'Scheduled' | 'Uploaded' | 'Failed';
  created_at?: string;
  updated_at?: string;
}

export function mapToQueueItem(dbItem: UploadQueueItem): QueueItem {
  return {
    id: dbItem.id,
    videoId: dbItem.video_id || dbItem.id,
    videoTitle: dbItem.video_title || '',
    fileName: dbItem.file_name || '',
    youtubeTitle: dbItem.youtube_title || '',
    description: dbItem.description || '',
    hashtags: dbItem.hashtags || '',
    thumbnail: dbItem.thumbnail_text || '',
    visibility: dbItem.visibility || 'Public',
    publishDate: dbItem.publish_date || '',
    publishTime: dbItem.publish_time || '',
    status: dbItem.status || 'Scheduled',
    duration: dbItem.duration || '0:30',
  };
}

export function mapToDbItem(queueItem: QueueItem): Omit<UploadQueueItem, 'created_at' | 'updated_at'> {
  return {
    id: queueItem.id,
    video_id: queueItem.videoId,
    video_title: queueItem.videoTitle,
    file_name: queueItem.fileName,
    duration: queueItem.duration,
    youtube_title: queueItem.youtubeTitle,
    description: queueItem.description,
    hashtags: queueItem.hashtags,
    thumbnail_text: queueItem.thumbnail,
    visibility: queueItem.visibility,
    publish_date: queueItem.publishDate,
    publish_time: queueItem.publishTime,
    status: queueItem.status,
  };
}
