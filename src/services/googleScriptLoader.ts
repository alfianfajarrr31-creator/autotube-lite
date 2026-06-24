/**
 * Shared utility service to safely load Google script clients (GSI & GAPI).
 */

let gsiScriptLoaded = false;
let gapiScriptLoaded = false;

/**
 * Checks if Google API credentials are configured.
 */
export function checkGoogleConfigured(): boolean {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  const appId = import.meta.env.VITE_GOOGLE_APP_ID;

  if (!clientId || !apiKey || !appId) {
    return false;
  }

  // Avoid default placeholder strings from .env.example
  if (
    clientId.includes('YOUR_GOOGLE') ||
    clientId.trim() === '' ||
    apiKey.includes('YOUR_GOOGLE') ||
    apiKey.trim() === '' ||
    appId.includes('YOUR_GOOGLE') ||
    appId.trim() === ''
  ) {
    return false;
  }

  return true;
}

/**
 * Helper to wait for a global variable to be ready
 */
export function waitForGlobal(
  checkFn: () => boolean,
  timeoutMs: number = 10000,
  errorMessage: string = "Timeout waiting for Google library to load"
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (checkFn()) {
      resolve();
      return;
    }
    const intervalMs = 100;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += intervalMs;
      if (checkFn()) {
        clearInterval(timer);
        resolve();
      } else if (elapsed >= timeoutMs) {
        clearInterval(timer);
        reject(new Error(errorMessage));
      }
    }, intervalMs);
  });
}

/**
 * Helper to inject a script tag dynamically without CORS credentials
 */
export function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Dynamically loads Google Identity Services and Google API scripts with robust error handling.
 */
export async function loadGoogleScripts(): Promise<void> {
  if (!checkGoogleConfigured()) {
    throw new Error("Google Drive / YouTube is not configured yet. Please configure the required environment variables.");
  }

  const isGsiLoaded = () => typeof (window as any).google?.accounts?.oauth2 !== 'undefined';
  const isGapiLoaded = () => typeof (window as any).gapi !== 'undefined';

  try {
    const promises: Promise<void>[] = [];

    // Load GSI (Google Identity Services) if not already loaded
    if (isGsiLoaded()) {
      gsiScriptLoaded = true;
    } else {
      promises.push(
        injectScript('https://accounts.google.com/gsi/client')
          .then(() => waitForGlobal(isGsiLoaded, 10000, "Google Identity Services global was not initialized."))
          .then(() => { gsiScriptLoaded = true; })
      );
    }

    // Load GAPI (Google API JS) if not already loaded
    if (isGapiLoaded()) {
      gapiScriptLoaded = true;
    } else {
      promises.push(
        injectScript('https://apis.google.com/js/api.js')
          .then(() => waitForGlobal(isGapiLoaded, 10000, "Google API client (gapi) global was not initialized."))
          .then(() => { gapiScriptLoaded = true; })
      );
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  } catch (error) {
    console.error("Google Scripts loading failed", error);
    throw new Error("Google services could not be loaded. Please try hard refresh, disable ad-blocker for this site, or open in Chrome Incognito.");
  }
}
