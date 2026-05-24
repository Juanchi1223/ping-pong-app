# PingPongZS

Internal app for tracking and ranking ping pong matches.

## Development

```bash
npm run install:all
npm run dev   # backend on :3001, frontend on :3000
```

## Supabase Setup

This app uses Supabase Cloud (Postgres + Realtime).

1. Create a project at <https://supabase.com/dashboard>.
2. In **SQL Editor**, run `backend/migrations/001_init.sql` and `backend/migrations/002_identity_by_default.sql` to create the `players` and `matches` tables and enable Realtime.
3. From **Project Settings → API**, copy:
   - Project URL
   - `anon` public key
   - `service_role` key (server only — never ship to the frontend)
4. Create `.env` files from the examples:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   Fill in the values.
