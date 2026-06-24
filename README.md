# AutoTube Lite ARC 10 — Manual Batch Upload

AutoTube Lite is a lightweight YouTube Shorts upload and scheduling dashboard.

ARC 10 adds manual batch upload capabilities, allowing users to select multiple eligible queue items and upload them sequentially in a controlled batch.

## Key Changes in ARC 10

- **Batch Selection**: Added checkbox selections on queue items to choose up to 3 eligible videos for batch uploading.
- **Sequential Upload Processing**: Processes each selected item sequentially with comprehensive status feedback, preventing concurrent request errors.
- **Batch Action Buttons**: Added "Upload Selected" and "Clear Selection" controls directly in the queue header.
- **Stop-On-Error Behavior**: Optional config checkbox allowing the batch to halt immediately after any upload failure, preserving remaining tokens and preventing consecutive errors.
- **Batch Progress UI**: Beautiful realtime progress tracker displaying active progress bars, current item titles, and a detailed summary table of batch results.
- **Integration & Safety**: Preserves manual single upload, retry upload, and does not alter the underlying database schema.

## Key Changes in ARC 8

- **Upload History Section**: Added a new section below the Upload Queue that organizes queue items with status filtering (All, Uploaded, Failed, Scheduled).
- **Searchable Logging**: Users can search their upload history by video title, YouTube title, file name, or status.
- **Improved Error Logging**: Failed items present highly readable diagnostic details from `upload_error` paired with explanatory helper text.
- **Visual Badge Refinement**: Uploaded and Failed items now include beautiful, high-contrast visual badges and custom tracking cards.
- **Summary Bento Cards**: Integrated small summary cards calculating Total Queue Items, Uploaded count, Failed count, and Scheduled count in real time from existing `upload_queue` data.
- **No Scope Bloat**: No batch upload, automatic background scheduler, new environment variables, or database schema additions have been introduced.

## Important Scope

ARC 10 supports manual batch upload for up to 3 selected queue items. Uploads run sequentially, not in parallel. Automatic background scheduling is not active yet.

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

No new environment variables are required for ARC 10.

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

ARC 10 does not require new database tables.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Deployment Notes

Deploy to Vercel with the same environment variables listed above. After changing Vercel env variables, redeploy the project.
