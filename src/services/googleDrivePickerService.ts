/**
 * Service for loading Google Identity Services & Google Picker,
 * requesting access token and opening the Google Drive Picker.
 */

import { checkGoogleConfigured, waitForGlobal, loadGoogleScripts } from './googleScriptLoader';

export { checkGoogleConfigured, loadGoogleScripts };

export interface GoogleDriveFileMetadata {
  driveFileId: string;
  name: string;
  mimeType: string;
  url?: string;
  sizeBytes?: number;
  thumbnailUrl?: string;
}

let pickerLoaded = false;


/**
 * Ensures that the Google Picker extension is loaded using gapi.
 */
export async function ensurePickerLoaded(): Promise<void> {
  // Wait until gapi is fully present
  const isGapiLoaded = () => typeof (window as any).gapi !== 'undefined';
  if (!isGapiLoaded()) {
    try {
      await waitForGlobal(isGapiLoaded, 5000, "Google APIs (gapi) script is not available.");
    } catch {
      throw new Error("Google services could not be loaded. Please try hard refresh, disable ad-blocker for this site, or open in Chrome Incognito.");
    }
  }

  return new Promise((resolve, reject) => {
    if (pickerLoaded) {
      resolve();
      return;
    }
    const gapi = (window as any).gapi;
    if (!gapi) {
      reject(new Error("Google services could not be loaded. Please try hard refresh, disable ad-blocker for this site, or open in Chrome Incognito."));
      return;
    }
    gapi.load('picker', {
      callback: () => {
        pickerLoaded = true;
        resolve();
      },
      onerror: () => {
        reject(new Error("Google services could not be loaded. Please try hard refresh, disable ad-blocker for this site, or open in Chrome Incognito."));
      }
    });
  });
}

/**
 * Requests an OAuth 2.0 Access Token using Google Identity Services (GIS).
 */
export function requestDriveAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      reject(new Error("Google services could not be loaded. Please try hard refresh, disable ad-blocker for this site, or open in Chrome Incognito."));
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
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (resp: any) => {
          if (resp.error !== undefined) {
            reject(new Error(resp.error_description || resp.error || "Access Token request was denied"));
          } else if (resp.access_token) {
            resolve(resp.access_token);
          } else {
            reject(new Error("No access token was returned by the token service."));
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || "Token client encountered an unexpected error."));
        }
      });
      
      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(new Error("Failed to initiate Google authorization dialog: " + (err.message || err)));
    }
  });
}

/**
 * Displays the Google Picker UI customized for choosing video files.
 */
export function openGooglePicker(accessToken: string): Promise<GoogleDriveFileMetadata[]> {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.picker) {
      reject(new Error("Google services could not be loaded. Please try hard refresh, disable ad-blocker for this site, or open in Chrome Incognito."));
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const appId = import.meta.env.VITE_GOOGLE_APP_ID;

    if (!apiKey) {
      reject(new Error("VITE_GOOGLE_API_KEY environment variable is missing."));
      return;
    }

    try {
      // Create view that limits files to Videos
      const docsView = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setMimeTypes('video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,video/*');

      const builder = new google.picker.PickerBuilder()
        .addView(docsView)
        .setOAuthToken(accessToken)
        .setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const docs = data.docs || [];
            const results: GoogleDriveFileMetadata[] = docs.map((doc: any) => ({
              driveFileId: doc.id,
              name: doc.name || 'Untitled Drive Video',
              mimeType: doc.mimeType || 'video/mp4',
              url: doc.url || undefined,
              sizeBytes: doc.sizeBytes || undefined,
              thumbnailUrl: doc.thumbnailUrl || undefined,
            }));
            resolve(results);
          } else if (data.action === google.picker.Action.CANCEL) {
            reject(new Error("User cancelled Google Picker prompt."));
          }
        });

      if (apiKey) {
        builder.setDeveloperKey(apiKey);
      }
      if (appId) {
        builder.setAppId(appId);
      }

      const picker = builder.build();
      picker.setVisible(true);
    } catch (err: any) {
      reject(new Error("Failed to open or build Google Picker window: " + (err.message || '')));
    }
  });
}
