# AutoTube Lite V1 — Final Polish

AutoTube Lite is a lightweight YouTube Shorts upload and scheduling dashboard.

V1 Complete introduces a highly focused step-by-step interface alongside the advanced full dashboard to help users prepare, organize, and upload YouTube Shorts sequentially with complete visibility.

## V1 Core Features

- **Google Drive Video Bank**: High-performance sync with Google Drive drafts and direct integration with Google Drive Picker to select and fetch files instantly.
- **Supabase Queue Persistence**: Persistent, real-time relational storage keeping scheduled queues synchronized across sessions.
- **Metadata Presets**: Configurable content presets to automatically apply custom title formats, descriptions, and hashtags. Includes handy "Apply Preset" and "Clear Metadata" controls.
- **YouTube Channel Connect**: One-click authentication using Google OAuth to safely link and switch between active YouTube channels.
- **Upload Readiness Check**: Auto-auditor checking draft properties and warning about missing information or blocked items before publishing.
- **Single YouTube Upload**: Sequential and manual direct publishing from your queue to YouTube.
- **Manual Batch Upload**: Manually batch up to 3 videos at a time with sequential upload progress monitors.
- **Retry Failed Upload**: Clear, persistent error logs paired with one-click direct retry on failed queue items.
- **Upload History and Error Log**: Track successful uploads, errors, metadata configurations, and timestamps with clean searchable stats.
- **Schedule Planning**: A robust visual calendar layout with weekly publishing targets, status segmentation, and volume indicators.
- **Queue Management**: Comprehensive search, sort, and state filtering controls to duplicate, delete, and inline-edit queued entries.
- **Daily Workflow Mode**: A streamlined step-by-step wizard to guide creators from video acquisition to readiness-audited publishing on a single focused screen.

## V1 Limitations & Exclusions

To maintain predictable manual workflow control, the following capabilities are explicitly **excluded** from V1:
- **No AI metadata generator** is included in V1.
- **No automatic background scheduler** is included in V1 (uploads require manual or batch trigger execution).
- **No multi-platform upload** is included in V1 (focused purely on YouTube Shorts).
- **No new database tables** are required for V1 Final Polish.
- **No new env variables** are required for V1 Final Polish.

## YouTube Scopes Used

```text
https://www.googleapis.com/auth/youtube.readonly
https://www.googleapis.com/auth/youtube.upload
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

No new environment variables are required for V1 Final Polish.

## Google Cloud Setup

Enable these APIs in Google Cloud Console:

- Google Drive API
- Google Picker API, if available in your console
- YouTube Data API v3

OAuth consent screen scopes used:

```text
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/youtube.readonly
https://www.googleapis.com/auth/youtube.upload
```

Add your local and Vercel origins to the OAuth Client ID Authorized JavaScript origins. Also add your YouTube/Drive account email as a Test User while the app is in Testing mode.

## Supabase Tables

AutoTube Lite uses:

- `upload_queue` for scheduled queue metadata
- `drive_videos` for selected Google Drive video metadata

### SQL Migration for extension

Run this SQL statement in your Supabase SQL Editor to extend the `upload_queue` table safely if you haven't already:

```sql
alter table upload_queue
add column if not exists youtube_video_id text,
add column if not exists youtube_video_url text,
add column if not exists upload_error text,
add column if not exists uploaded_at timestamptz;
```

No new database tables are required for V1 Final Polish.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Deployment Notes

Deploy with the same environment variables listed above.

## Google Auth Troubleshooting

If Google authentication or library loading fails in production, follow these verification steps:
- **Environment Variables**: Confirm `VITE_GOOGLE_CLIENT_ID` exists in your Vercel/Production dashboard and matches your active Google Cloud Project credentials exactly.
- **Client ID Type**: Confirm that your OAuth 2.0 Client ID type is set to **Web Application** in the Google Cloud Console.
- **Authorized JavaScript Origins**: Confirm that your **Authorized JavaScript origins** configuration includes the correct production domain (e.g. `https://your-app.vercel.app`) **without** any trailing slash.
- **API Key Restrictions**: If your Google API Key has HTTP referrer website restrictions, confirm they include the production domain with `/*` suffix (e.g. `https://your-app.vercel.app/*`).
- **Redeployment**: Always trigger a new deployment or redeploy after editing environment variables to ensure they are properly injected.
