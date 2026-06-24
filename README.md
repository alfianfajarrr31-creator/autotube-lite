# AutoTube Lite ARC 11 — Schedule Planning Mode

AutoTube Lite is a lightweight YouTube Shorts upload and scheduling dashboard.

ARC 11 adds an interactive Schedule Planning view that groups and filters planned YouTube Shorts uploads by publication date, allowing users to organize their weekly posting density, track goals, and catch timing conflicts before manual publishing.

## Key Changes in ARC 11

- **Schedule Planning Section**: A dedicated full-width dashboard showing queue items grouped chronologically by their planned publish dates.
- **Active Planning Filters**: Quick segmented controls to filter planning boards by **Today**, **This Week** (next 7 days), **All Planned**, or identify items with **Missing Schedule** info.
- **Goal Target Widget & Helper**: A customizable weekly content target goal (storing target count in `localStorage`, defaulting to 14) displaying planning counts and proactive target insights ("You still need X more planned videos", "Weekly target reached").
- **Timing Overlap Conflicts**: Automatic background checks that flag date/time schedule overlaps with a warning badge and warning helper ("Another video is planned at the same date and time").
- **Missing Metadata Audits**: Proactive visual prompts identifying queue items lacking publish dates or times with suggestions to configure details in the metadata editor.
- **Integration & Safety**:
  - Does NOT auto-upload in the background (no server cron or backend queue managers).
  - Preserves manual single upload, manual batch upload (up to 3 selected items sequentially), and retry upload capabilities.
  - No new environment variables.
  - No new database tables.

## Important Scope

ARC 11 supports manual batch upload for up to 3 selected queue items. Uploads run sequentially, not in parallel. Automatic background scheduling is not active yet.

YouTube scopes used:

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

No new environment variables are required for ARC 11.

## Google Cloud Setup

Enable these APIs in Google Cloud Console:

- Google Drive API
- Google Picker API, if available in your console
- YouTube Data API v3

OAuth consent screen scopes used so far:

```text
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/youtube.readonly
https://www.googleapis.com/auth/youtube.upload
```

Add your local and Vercel origins to the OAuth Client ID Authorized JavaScript origins. Also add your YouTube/Drive account email as a Test User while the app is in Testing mode.

## Supabase Tables

AutoTube Lite currently uses:

- `upload_queue` for scheduled queue metadata
- `drive_videos` for selected Google Drive video metadata

### SQL Migration for ARC 7

Run this SQL statement in your Supabase SQL Editor to extend the `upload_queue` table safely for ARC 7:

```sql
alter table upload_queue
add column if not exists youtube_video_id text,
add column if not exists youtube_video_url text,
add column if not exists upload_error text,
add column if not exists uploaded_at timestamptz;
```

ARC 11 does not require new database tables.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Deployment Notes

Deploy to Vercel with the same environment variables listed above. After changing Vercel env variables, redeploy the project.
