# AutoTube Lite ARC 12 — Queue Management Polish

AutoTube Lite is a lightweight YouTube Shorts upload and scheduling dashboard.

ARC 12 adds comprehensive queue management controls allowing users to filter, sort, search, duplicate, edit-in-place, and execute bulk-selections on scheduled items, keeping workflows efficient even with high-volume video pipelines.

## Key Changes in ARC 12

- **Interactive Queue Filters**: Segmented filter selectors with dynamic badge counts to filter by **All**, **Scheduled**, **Uploaded**, **Failed**, **Missing Schedule**, **Ready**, **Needs Review**, or **Blocked**.
- **Flexible Queue Sorting**: Order the upload queue dynamically by **Publish Date Ascending/Descending**, **Newest First**, **Oldest First**, or **Status**.
- **Hide Uploaded Toggle**: A persistent user preference (`localStorage` bound) to automatically hide completed uploads from the active working view, keeping focus on remaining action items.
- **In-place Metadata Editor**: Click "Edit" on any non-uploaded item to customize titles (with safe 100-character limit checks), descriptions, hashtags, visibility modes, and planned publication dates/times in a gorgeous inline form.
- **Queue Item Duplication**: Clone existing queued videos with a single click to easily test different scheduling, titles, or tag variants.
- **Bulk Batch Selectors**: Add quick-batch actions ("Select Ready" or "Select Failed") to instantly select up to 3 compatible items for batch uploads or batch retry runs.
- **Safer Queue Deletions**: Added confirmation prompts before removing items from the queue to prevent accidental deletion of draft metadata.
- **Integration & Safety**:
  - Does NOT auto-upload in the background (no server cron or backend queue managers).
  - Preserves manual single upload, manual batch upload (up to 3 selected items sequentially), and retry upload capabilities.
  - No new environment variables or new database tables.

## Important Scope

ARC 12 supports manual batch upload for up to 3 selected queue items. Uploads run sequentially, not in parallel. Automatic background scheduling is not active yet.

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

No new environment variables are required for ARC 12.

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

ARC 12 does not require new database tables.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Deployment Notes

Deploy to Vercel with the same environment variables listed above. After changing Vercel env variables, redeploy the project.
