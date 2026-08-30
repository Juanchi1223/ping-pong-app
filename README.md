# PingPongZS

Internal app for tracking and ranking ping pong matches with LoL-style ranks, 1v1 and 2v2 doubles matchmaking, and multi-season archiving.

## Development

```bash
npm run install:all
npm run dev   # backend on :3001, frontend on :3000
```

## Supabase & Production Database Setup

This app uses Supabase Cloud (PostgreSQL + Realtime).

### 1. Fresh Database Setup
If setting up a new Supabase project from scratch:
1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. In **SQL Editor**, run the following scripts in order:
   - `backend/migrations/001_init.sql` (Creates `players` and `matches` tables, indexes, and Realtime publications)
   - `backend/migrations/002_identity_by_default.sql` (Sets identity defaults)
   - `backend/migrations/003_doubles_and_seasons.sql` (Adds 2v2 doubles match columns, `seasons`, and seasonal indexes)

### 2. Upgrading an Existing Database (to v2 / 2v2 & Seasons)
If you already have the initial `players` and `matches` tables in your Supabase database:
1. Go to **SQL Editor** in Supabase.
2. Execute the migration script `backend/migrations/003_doubles_and_seasons.sql`:
   - Adds `player_a2_id`, `player_b2_id`, `mode`, `match_type`, `season` columns to `matches`.
   - Creates the `seasons` table and seeds Season 1 (archived) and Season 2 (active).
   - Creates `player_seasons` table and enables Realtime publication.

### 3. Environment Variables
From **Project Settings → API** in Supabase, copy your keys:
- `SUPABASE_URL`: Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role secret (backend only)
- `VITE_SUPABASE_URL`: Project URL (frontend)
- `VITE_SUPABASE_ANON_KEY`: Anon public key (frontend)

Configure your `.env` files:
```bash
# backend/.env
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
PORT=3001

# frontend/.env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:3001 # Or your production backend API URL
```
