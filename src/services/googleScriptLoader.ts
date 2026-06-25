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
 * Helper to wait for a global variable to be ready via 100ms polling.
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
 * Helper to inject a script tag dynamically without CORS credentials.
 * Ensures NO crossOrigin="anonymous" is used.
 */
export function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    // explicit requirement: do not use crossOrigin="anonymous"
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Loads Google Identity Services (GSI) script and waits until window.google.accounts.oauth2 exists.
 */
export async function loadGoogleIdentityServices(): Promise<void> {
  const isGsiLoaded = () => typeof (window as any).google?.accounts?.oauth2 !== 'undefined';
  if (isGsiLoaded()) {
    gsiScriptLoaded = true;
    return;
  }
  await injectScript('https://accounts.google.com/gsi/client');
  await waitForGlobal(
    isGsiLoaded,
    10000,
    "Google login service could not be loaded. Please refresh the page. If this keeps happening, check Google Cloud origin settings and Vercel environment variables."
  );
  gsiScriptLoaded = true;
}

/**
 * Loads Google GAPI client script and waits until window.gapi exists.
 */
export async function loadGoogleApi(): Promise<void> {
  const isGapiLoaded = () => typeof (window as any).gapi !== 'undefined';
  if (isGapiLoaded()) {
    gapiScriptLoaded = true;
    return;
  }
  await injectScript('https://apis.google.com/js/api.js');
  await waitForGlobal(
    isGapiLoaded,
    10000,
    "Google login service could not be loaded. Please refresh the page. If this keeps happening, check Google Cloud origin settings and Vercel environment variables."
  );
  gapiScriptLoaded = true;
}

/**
 * Helper to run a diagnostic of Google script state and return details for debug/logging.
 */
export function getGoogleDebugState() {
  const isClientIdPresent = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isGooglePresent = typeof (window as any).google !== 'undefined';
  const isAccountsPresent = typeof (window as any).google?.accounts !== 'undefined';
  const isOauth2Present = typeof (window as any).google?.accounts?.oauth2 !== 'undefined';
  const isGapiPresent = typeof (window as any).gapi !== 'undefined';

  const gsiScriptTag = !!document.querySelector('script[src*="accounts.google.com/gsi/client"]');
  const gapiScriptTag = !!document.querySelector('script[src*="apis.google.com/js/api.js"]');

  return {
    isClientIdPresent,
    isGooglePresent,
    isAccountsPresent,
    isOauth2Present,
    isGapiPresent,
    gsiScriptTag,
    gapiScriptTag,
  };
}

/**
 * Logs a robust diagnostic of current Google script state.
 */
export function logGoogleDebugInfo(context: string): void {
  const state = getGoogleDebugState();
  console.log(`[Google Loader Debug - ${context}] Diagnostic:`, {
    VITE_GOOGLE_CLIENT_ID_exists: state.isClientIdPresent,
    window_google_exists: state.isGooglePresent,
    window_google_accounts_exists: state.isAccountsPresent,
    window_google_accounts_oauth2_exists: state.isOauth2Present,
    window_gapi_exists: state.isGapiPresent,
    gsi_script_tag_present: state.gsiScriptTag,
    gapi_script_tag_present: state.gapiScriptTag,
  });
}

/**
 * Loads both GSI and GAPI sequentially or in parallel, checks configuration, and waits for all libraries to be ready.
 */
export async function loadGoogleClientLibraries(): Promise<void> {
  return loadGooglePickerLibraries();
}

export async function loadGoogleAuthOnly(): Promise<void> {
  if (!checkGoogleConfigured()) {
    throw new Error("Google Drive / YouTube is not configured yet. Please configure the required environment variables.");
  }

  try {
    await loadGoogleIdentityServices();
    logGoogleDebugInfo("Google Auth Only Success");
  } catch (error) {
    logGoogleDebugInfo("Google Auth Only Failure");
    console.error("Google Identity Services loading failed", error);
    throw new Error("Google login service could not be loaded. Please refresh the page. If this keeps happening, check Google Cloud OAuth origins and Vercel environment variables.");
  }
}

export async function loadGooglePickerLibraries(): Promise<void> {
  if (!checkGoogleConfigured()) {
    throw new Error("Google Drive / YouTube is not configured yet. Please configure the required environment variables.");
  }

  try {
    await loadGoogleIdentityServices();
    await loadGoogleApi();
    logGoogleDebugInfo("Google Picker Libraries Success");
  } catch (error) {
    logGoogleDebugInfo("Google Picker libraries loading failed");
    console.error("Google Picker libraries loading failed", error);
    throw new Error("Google Picker service could not be loaded. Please refresh the page and check Google API key restrictions.");
  }
}

/**
 * Backward-compatible alias for loadGoogleClientLibraries
 */
export async function loadGoogleScripts(): Promise<void> {
  await loadGoogleClientLibraries();
}
