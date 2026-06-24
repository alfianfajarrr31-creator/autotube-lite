import { QueueItem, Video } from '../types';

export type UploadReadinessLevel = 'ready' | 'warning' | 'blocked';

export interface UploadReadinessResult {
  isReady: boolean;
  level: UploadReadinessLevel;
  issues: string[];
  warnings: string[];
}

export interface UploadReadinessOptions {
  isYouTubeConnected: boolean;
  selectedYouTubeChannel?: { title?: string; id?: string } | null;
  driveVideos?: Video[];
}

const VALID_VISIBILITY = ['Private', 'Unlisted', 'Public'];

export function checkUploadReadiness(
  queueItem: QueueItem,
  options: UploadReadinessOptions
): UploadReadinessResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!options.isYouTubeConnected || !options.selectedYouTubeChannel) {
    issues.push('YouTube channel is not connected.');
  }

  if (!queueItem.videoId) {
    issues.push('Queue item has no video ID.');
  }

  if (!queueItem.fileName) {
    issues.push('Queue item has no file name.');
  }

  if (queueItem.status === 'Uploaded') {
    issues.push('This queue item is already marked as Uploaded.');
  }

  if (!queueItem.youtubeTitle?.trim()) {
    issues.push('YouTube title is empty.');
  }

  if (!queueItem.visibility || !VALID_VISIBILITY.includes(queueItem.visibility)) {
    issues.push('Visibility is missing or invalid.');
  }

  const matchedVideo = options.driveVideos?.find((video) => {
    return (
      video.id === queueItem.videoId ||
      video.driveFileId === queueItem.videoId ||
      video.fileName === queueItem.fileName
    );
  });

  const expectedDriveVideo = queueItem.videoId?.startsWith('drive-') || matchedVideo?.source === 'drive';
  if (expectedDriveVideo && !matchedVideo) {
    issues.push('Drive video is missing from Drive Bank.');
  }

  if (matchedVideo?.source === 'mock') {
    warnings.push('This is a demo video. Real upload requires a Google Drive video.');
  }

  if (!queueItem.description?.trim()) {
    warnings.push('Description is empty.');
  }

  if (!queueItem.hashtags?.trim()) {
    warnings.push('Hashtags are empty.');
  }

  const thumbnailText = queueItem.thumbnail?.includes('|||')
    ? queueItem.thumbnail.split('|||')[1]
    : '';
  if (!thumbnailText?.trim()) {
    warnings.push('Thumbnail text is empty.');
  }

  if (!queueItem.publishDate?.trim()) {
    warnings.push('Publish date is empty.');
  }

  if (!queueItem.publishTime?.trim()) {
    warnings.push('Publish time is empty.');
  }

  if (queueItem.youtubeTitle && queueItem.youtubeTitle.length > 100) {
    warnings.push('Title is longer than 100 characters.');
  }

  if (queueItem.description && queueItem.description.length > 5000) {
    warnings.push('Description is longer than 5000 characters.');
  }

  const level: UploadReadinessLevel = issues.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'ready';

  return {
    isReady: issues.length === 0,
    level,
    issues,
    warnings,
  };
}
