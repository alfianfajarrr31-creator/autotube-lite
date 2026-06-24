# AutoTube Lite ARC 7.2 — Cleanup Labels & Metadata

AutoTube Lite is a lightweight YouTube Shorts upload and scheduling dashboard.

ARC 7.2 cleans up leftover AI Studio/Gemini metadata and outdated ARC labels to ensure consistency. Single manual video upload remains fully active, while batch upload and automatic background scheduling are not active yet. No new environment variables or database tables have been added.

## Key Changes in ARC 7.2

- **Metadata Cleanup**: Removed unrequested Gemini API capability declarations and refined applet definitions.
- **Outdated Label Purge**: Cleaned up legacy reference points to ARC 6 or obsolete readiness-only descriptions in the workspace and simulator warnings.
- **Status & Wording Alignment**: Highlighted that real single-video manual upload is fully active while simulation mode remains distinct as a separate playground tool.

## Key Features in ARC 7.1

- **Branded Success Experience**: Uploaded queue cards transition to a distinct, emerald green glowing container with an "Uploaded" success indicator.
- **Copy Video URL Link**: A copy action button copies the live YouTube video link (`youtube_video_url`) to the user's clipboard and provides a floating feedback toast.
- **Full-Width Collapsible Readiness Drawer**: Redesigned readiness checker layouts into clean, full-width drawers that present detailed checklists clearly.
- **"Upload Complete" Readiness Panel**: Replaces error-style "Blocked" alerts with neutral/positive "Upload Complete" panels explaining that duplicate uploads are disabled for safety.
- **Layout Rhythm Cleanup**: Separated visual video cover previews and scheduling data from action elements, preventing layout shifts or text wrapping on multiple screen sizes.

## Key Features in ARC 7

- Supabase upload queue persistence
- Google Drive Picker and Drive Bank persistence
- Metadata presets for faster manual metadata entry
- YouTube Connect using readonly & upload access
- Upload readiness badges for every queue item
- Check Readiness panel with blocked issues and warnings
- Check All Queue summary: Ready, Needs Review, and Blocked
- Manual upload to YouTube for any ready/warning item in the queue
- Real-time download of selected video from Google Drive and upload to YouTube using YouTube Data API v3

## Important Scope

ARC 7 supports **manual upload for ONE selected queue item**. It does **not** support batch uploads or automatic background scheduling yet.

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

No new environment variables are required for ARC 7.

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

ARC 7 does not require other new database tables.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Deployment Notes

Deploy to Vercel with the same environment variables listed above. After changing Vercel env variables, redeploy the project.
