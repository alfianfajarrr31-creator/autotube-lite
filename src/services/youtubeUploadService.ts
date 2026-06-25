import { checkGoogleConfigured, loadGoogleAuthOnly } from './googleScriptLoader';

export interface YouTubeUploadInput {
  accessToken: string;
  videoBlob: Blob;
  fileName: string;
  title: string;
  description: string;
  visibility: 'Private' | 'Unlisted' | 'Public';
  publishDate?: string | null;
  publishTime?: string | null;
}

export interface YouTubeUploadResult {
  youtubeVideoId: string;
  youtubeVideoUrl: string;
}

/**
 * Requests an OAuth 2.0 Access Token with YouTube Upload scope.
 */
export async function requestYouTubeUploadToken(): Promise<string> {
  // Ensure Google scripts are loaded using the shared loader
  try {
    await loadGoogleAuthOnly();
  } catch (err: any) {
    throw new Error("Google login service could not be loaded. Please refresh the page. If this keeps happening, check Google Cloud origin settings and Vercel environment variables.");
  }

  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      reject(new Error("Google login service could not be loaded. Please refresh the page. If this keeps happening, check Google Cloud origin settings and Vercel environment variables."));
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      reject(new Error("VITE_GOOGLE_CLIENT_ID environment variable is missing in your configuration."));
      return;
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/youtube.upload',
        callback: (resp: any) => {
          if (resp.error !== undefined) {
            reject(new Error(resp.error_description || resp.error || "YouTube upload permissions access was denied."));
          } else if (resp.access_token) {
            resolve(resp.access_token);
          } else {
            reject(new Error("No access token was returned by the token client."));
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || "YouTube upload authentication encountered an unexpected client error."));
        }
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(new Error("Failed to open Google YouTube upload permission dialog: " + (err.message || err)));
    }
  });
}

/**
 * Downloads a Google Drive file as a binary Blob using the Google Drive v3 alt=media API.
 */
export async function downloadDriveFileAsBlob(driveFileId: string, accessToken: string): Promise<Blob> {
  if (!driveFileId) {
    throw new Error("Missing Google Drive file ID for download.");
  }
  
  const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    let errMsg = `Google Drive download failed (HTTP ${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData?.error?.message) {
        errMsg = errorData.error.message;
      }
    } catch {
      // JSON parse might fail on binary stream error responses
    }
    throw new Error(errMsg);
  }

  return await response.blob();
}

/**
 * Uploads a video Blob to YouTube using the YouTube Data API v3 resumable upload protocol.
 */
export async function uploadVideoToYouTube(input: YouTubeUploadInput): Promise<YouTubeUploadResult> {
  const { accessToken, videoBlob, title, description, visibility } = input;

  // 1. Stage 1: Initiate Resumable Upload Session
  const initUrl = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
  
  const metadata = {
    snippet: {
      title: title,
      description: description,
      categoryId: "22", // People & Blogs
    },
    status: {
      privacyStatus: visibility.toLowerCase(), // 'private', 'unlisted', or 'public'
    },
  };

  const initResponse = await fetch(initUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': videoBlob.type || 'video/mp4',
      'X-Upload-Content-Length': String(videoBlob.size),
    },
    body: JSON.stringify(metadata),
  });

  if (!initResponse.ok) {
    let errMsg = `Failed to initiate YouTube upload (HTTP ${initResponse.status})`;
    try {
      const errJson = await initResponse.json();
      if (errJson?.error?.message) {
        errMsg = errJson.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  // Retrieve resumable upload URL from 'Location' response header
  const uploadUrl = initResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error("YouTube did not return a Resumable Location header to stream the video content.");
  }

  // 2. Stage 2: Stream Video Content Blob (PUT video binary to Location URL)
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': videoBlob.type || 'video/mp4',
    },
    body: videoBlob,
  });

  if (!uploadResponse.ok) {
    let errMsg = `Failed to stream video to YouTube (HTTP ${uploadResponse.status})`;
    try {
      const errJson = await uploadResponse.json();
      if (errJson?.error?.message) {
        errMsg = errJson.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  const resultData = await uploadResponse.json();
  const youtubeVideoId = resultData.id;
  if (!youtubeVideoId) {
    throw new Error("YouTube upload succeeded but the API response did not contain a video ID.");
  }

  const youtubeVideoUrl = `https://youtu.be/${youtubeVideoId}`;

  return {
    youtubeVideoId,
    youtubeVideoUrl,
  };
}
