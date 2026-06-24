# AutoTube Lite ARC 6 — Upload Readiness Check

AutoTube Lite is a lightweight YouTube Shorts upload and scheduling dashboard.

ARC 6 adds a safety layer before real YouTube uploading. The app can now inspect queued videos and tell you whether each item is ready, needs review, or is blocked before a future upload ARC.

## Key Features in ARC 6

- Supabase upload queue persistence
- Google Drive Picker and Drive Bank persistence
- Metadata presets for faster manual metadata entry
- YouTube Connect using readonly channel access
- Upload readiness badges for every queue item
- Check Readiness panel with blocked issues and warnings
- Check All Queue summary: Ready, Needs Review, and Blocked

## Important Scope

ARC 6 does **not** upload videos to YouTube yet. It only validates queued items before a real upload feature is added later.

Current YouTube scope remains readonly:

```text
https://www.googleapis.com/auth/youtube.readonly
```

## Required Environment Variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_PUBLIC_KEY
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
VITE_GOOGLE_APP_ID=YOUR_GOOGLE_PROJECT_NUMBER
```

No new environment variables are required for ARC 6.

## Google Cloud Setup

Enable these APIs in Google Cloud Console:

- Google Drive API
- Google Picker API, if available in your console
- YouTube Data API v3

OAuth consent screen scopes used so far:

```text
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/youtube.readonly
```

Add your local and Vercel origins to the OAuth Client ID Authorized JavaScript origins. Also add your YouTube/Drive account email as a Test User while the app is in Testing mode.

## Supabase Tables

AutoTube Lite currently uses:

- `upload_queue` for scheduled queue metadata
- `drive_videos` for selected Google Drive video metadata

ARC 6 does not require new database tables.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Deployment Notes

Deploy to Vercel with the same environment variables listed above. After changing Vercel env variables, redeploy the project.
