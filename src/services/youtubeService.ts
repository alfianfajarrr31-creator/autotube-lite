/**
 * Service for Google OAuth YouTube connection and fetching channel details using YouTube Data API v3.
 */

import { loadGoogleAuthOnly } from './googleScriptLoader';

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnailUrl: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
}

/**
 * Requests an OAuth 2.0 Access Token for YouTube Readonly scope using Google Identity Services (GIS).
 */
export async function connectYouTube(): Promise<string> {
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
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
        callback: (resp: any) => {
          if (resp.error !== undefined) {
            reject(new Error(resp.error_description || resp.error || "YouTube permissions access was denied."));
          } else if (resp.access_token) {
            resolve(resp.access_token);
          } else {
            reject(new Error("No access token was returned by the token client."));
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || "YouTube authentication encountered an unexpected client error."));
        }
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(new Error("Failed to open Google YouTube permission dialog: " + (err.message || err)));
    }
  });
}

/**
 * Fetches YouTube channels associated with the authenticated account.
 * Endpoint: https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true
 */
export async function getMyYouTubeChannels(accessToken: string): Promise<YouTubeChannelInfo[]> {
  const url = 'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true';
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    let errMsg = `YouTube API Error (HTTP ${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData?.error?.message) {
        errMsg = errorData.error.message;
      }
    } catch {
      // ignore parsing failure
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  const items = data.items || [];

  return items.map((item: any) => {
    const snippet = item.snippet || {};
    const statistics = item.statistics || {};
    const customUrl = snippet.customUrl || undefined;

    return {
      id: item.id,
      title: snippet.title || 'Unknown Channel',
      description: snippet.description || '',
      customUrl,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
      subscriberCount: statistics.subscriberCount ? Number(statistics.subscriberCount) : undefined,
      videoCount: statistics.videoCount ? Number(statistics.videoCount) : undefined,
      viewCount: statistics.viewCount ? Number(statistics.viewCount) : undefined,
    };
  });
}
