# AutoTube Lite ARC 3.1 — Google Drive Script Loader Fix

AutoTube Lite is a lightweight YouTube Shorts upload and scheduling dashboard. 

With **ARC 3.1**, dynamic loading of Google Client Libraries has been completely revamped to ensure seamless, reliable initialization on production hosting platforms like Vercel. 

---

## 🛠️ Required Environment Variables

To connect AutoTube Lite to your Supabase and Google Developer projects, create a `.env.local` file in the root directory and specify your API credentials:

```env
# Supabase Persistence Configuration (ARC 2)
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_PUBLIC_KEY

# Google Drive Connect & Picker Configuration (ARC 3)
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
VITE_GOOGLE_APP_ID=YOUR_GOOGLE_PROJECT_NUMBER
```

> 💡 **Graceful Fallbacks**: If environment variables are missing for either service, AutoTube Lite will automatically run in high-fidelity **Local Demo Mode** (with clear warning badges) without crashing. You can use standard mock videos to test out the dashboard and scheduling actions out-of-the-box!

---

## 🌐 ARC 3 — Google Drive Setup Reference

To establish a functioning Google Picker inside the app, complete the following setup on Google Cloud Console:

### 1. Enable APIs in Google Cloud Console
- Go to the [Google Cloud Console](https://console.cloud.google.com/).
- Navigate to **APIs & Services > Library**.
- Locate and Enable:
  - **Google Drive API**
  - **Google Picker API**

### 2. Configure OAuth Consent Screen
- Navigate to **APIs & Services > OAuth consent screen**.
- Create/Configure your screen and specify your contact details.
- Add the required scope:
  - `https://www.googleapis.com/auth/drive.file` (gives access only to files opened/created with the app via Google Picker).

### 3. Create App Credentials
- Navigate to **APIs & Services > Credentials** and click **+ Create Credentials**:
  - **A. OAuth client ID** (Application type: **Web application**):
    - Add **Authorized JavaScript origins** for your local test environment and live preview URLs:
      - `http://localhost:3000` (or local port `5173`/`3000`)
      - Your dynamic AI Studio development URL (e.g. `https://ais-dev-7v3a2gy3hmazdpezt7kq5j-904379685516.asia-east1.run.app`)
      - Your Shared/Deployed preview URL (e.g. `https://ais-pre-7v3a2gy3hmazdpezt7kq5j-904379685516.asia-east1.run.app`)
  - **B. API key**:
    - Select and copy the newly generated browser API key.
- **C. Google App ID (Project Number)**:
  - Copy the **Project number** found on the main Google Cloud Project Dashboard.

---

## 💾 Supabase Database Table Configuration

Execute the following SQL DDL query inside your Supabase **SQL Editor** to provision the `upload_queue` table:

```sql
create table if not exists upload_queue (
id text primary key,
video_id text not null,
video_title text not null,
file_name text not null,
duration text,
youtube_title text not null,
description text,
hashtags text,
thumbnail_text text,
visibility text not null check (visibility in ('Private', 'Unlisted', 'Public')),
publish_date text,
publish_time text,
status text not null default 'Scheduled' check (status in ('Draft', 'Scheduled', 'Uploaded', 'Failed')),
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);

alter table upload_queue enable row level security;

create policy "Allow public read upload_queue for prototype"
on upload_queue
for select
using (true);

create policy "Allow public insert upload_queue for prototype"
on upload_queue
for insert
with check (true);

create policy "Allow public update upload_queue for prototype"
on upload_queue
for update
using (true)
with check (true);

create policy "Allow public delete upload_queue for prototype"
on upload_queue
for delete
using (true);
```

---

## 📋 Commands & Operations

### 1. Install Dependencies
Install all required npm packages including `@supabase/supabase-js`:
```bash
npm install
```

### 2. Run Local Development
Boot the React/Vite live dev server on port `3000`:
```bash
npm run dev
```

### 3. Production Build
Compile TypeScript code and package static output files into the browser-ready `dist/` directory:
```bash
npm run build
```

### 4. Static Syntax Linter
Formulate checks for code diagnostics, type definitions, and structural safety:
```bash
npm run lint
```

---

## 🔍 Google Drive Troubleshooting (Vercel & Production)

If you encounter the message *"Google services could not be loaded. Please try hard refresh, disable ad-blocker for this site, or open in Chrome Incognito."* or issues opening the Google Picker, review these troubleshooting steps:

1. **Add Vercel Domain to Google OAuth Authorized JavaScript Origins**
   - Head over to the [Google Cloud Console Credentials Screen](https://console.cloud.google.com/apis/credentials).
   - Under **OAuth 2.0 Client IDs**, edit your Web application Client ID.
   - In **Authorized JavaScript origins**, make sure to add both your local URLs and **all Vercel production and preview domains** (e.g., `https://your-app-name.vercel.app`).

2. **Add Vercel Domain to API Key Website Restrictions**
   - Go back to the Credentials Screen and click on your **API Key**.
   - If you restrict your API Key to specific HTTP referrers, verify that your **Vercel domains are allowed** (e.g., `https://your-app-name.vercel.app/*`). If not restricted, make sure you configure restraints properly to limit public exploitation.

3. **Redeploy After Changing Vercel Environment Variables**
   - Vercel loads environment variables at build-time. Any changes to `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`, or `VITE_GOOGLE_APP_ID` require you to **rebuild and redeploy** the application on Vercel to take effect.

4. **Try Chrome Incognito If Google Scripts Are Blocked**
   - Content blockers, ad blockers, or strict Brave shields can sometimes block standard client scripts from Google (`gsi/client` or `api.js`). Opening the site in a clean Chrome Incognito tab allows you to check if extensions are causing blockages.

