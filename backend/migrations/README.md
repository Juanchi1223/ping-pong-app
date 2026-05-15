# Migrations

Versioned SQL applied manually to the Supabase Cloud project.

## How to apply

1. Open the Supabase dashboard → SQL Editor → New query.
2. Paste the contents of the migration file.
3. Run. Verify success in the Tables panel.

## Files

- `001_init.sql` — initial `players` + `matches` schema, indexes, and Realtime publication.

## Verifying Realtime

In the Supabase dashboard → Database → Replication, confirm both `players` and `matches` are included in the `supabase_realtime` publication.
