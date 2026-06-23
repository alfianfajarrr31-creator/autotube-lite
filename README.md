# AutoTube Lite (ARC 2 — Supabase Edition)

AutoTube Lite is a lightweight YouTube Shorts upload and scheduling dashboard. 

With **ARC 2**, AutoTube Lite integrates directly with **Supabase Database** to persist scheduled upload items so they are preserved across page refreshes.

---

## 🛠️ Required Environment Variables

To connect AutoTube Lite to your Supabase project, create a `.env.local` file in the root directory and specify your API credentials:

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_PUBLIC_KEY
```

> 💡 **Graceful Fallback**: If these environment variables are missing, AutoTube Lite will automatically run in high-fidelity **Local Demo Mode** (with clear badges) without crashing.

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
