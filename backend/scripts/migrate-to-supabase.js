#!/usr/bin/env node
/**
 * One-shot SQLite -> Supabase data migration. Idempotent (upserts on id).
 * After migration, advances the identity sequences past the max migrated id.
 *
 * Usage:
 *   node backend/scripts/migrate-to-supabase.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const knex = require('knex');
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

const sqlite = knex({
  client: 'sqlite3',
  connection: { filename: path.join(__dirname, '..', 'pingpong.db') },
  useNullAsDefault: true,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function mapPlayer(row) {
  return {
    id: row.id,
    name: row.name,
    mmr: row.mmr,
    wins: row.wins,
    losses: row.losses,
    points_scored: row.points_scored,
    points_conceded: row.points_conceded,
    current_win_streak: row.current_win_streak,
    current_loss_streak: row.current_loss_streak,
    active: row.active === 1 || row.active === true,
    department: row.department ?? null,
    created_at: row.created_at, // ISO-ish string; Postgres timestamptz accepts it
  };
}

function mapMatch(row) {
  return {
    id: row.id,
    player_a_id: row.player_a_id,
    player_b_id: row.player_b_id,
    score_a: row.score_a,
    score_b: row.score_b,
    mmr_delta_a: row.mmr_delta_a,
    mmr_delta_b: row.mmr_delta_b,
    played_at: row.played_at,
  };
}

async function resetSequence(table) {
  // Identity columns generated ALWAYS need pg_get_serial_sequence to find their sequence.
  const { error } = await supabase.rpc('exec_sql', {
    sql: `select setval(pg_get_serial_sequence('${table}', 'id'), coalesce((select max(id) from ${table}), 1), true);`,
  });
  if (error) {
    // RPC may not exist; non-fatal — fall back to a notice.
    console.warn(`[warn] could not auto-reset sequence for ${table}: ${error.message}`);
    console.warn(`       Run manually in Supabase SQL editor:`);
    console.warn(`       select setval(pg_get_serial_sequence('${table}', 'id'), (select max(id) from ${table}), true);`);
  }
}

(async () => {
  try {
    const players = await sqlite('players').select('*');
    const matches = await sqlite('matches').select('*');

    console.log(`Source: players=${players.length} matches=${matches.length}`);

    if (players.length) {
      const { error } = await supabase
        .from('players')
        .upsert(players.map(mapPlayer), { onConflict: 'id' });
      if (error) throw new Error(`players upsert failed: ${error.message}`);
    }

    if (matches.length) {
      const { error } = await supabase
        .from('matches')
        .upsert(matches.map(mapMatch), { onConflict: 'id' });
      if (error) throw new Error(`matches upsert failed: ${error.message}`);
    }

    await resetSequence('players');
    await resetSequence('matches');

    const { count: pCount } = await supabase
      .from('players').select('*', { count: 'exact', head: true });
    const { count: mCount } = await supabase
      .from('matches').select('*', { count: 'exact', head: true });

    console.log(`Migrated. Supabase now has players=${pCount} matches=${mCount}`);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await sqlite.destroy();
  }
})();
