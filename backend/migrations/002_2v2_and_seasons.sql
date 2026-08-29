-- 002_2v2_and_seasons.sql: Schema Extension for 2v2 Doubles and Season Archiving

-- 1. Extend matches table to support 2v2 doubles matches and seasons
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player_a2_id BIGINT REFERENCES players(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player_b2_id BIGINT REFERENCES players(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT '1v1';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS season INTEGER NOT NULL DEFAULT 1;

-- 2. Create seasons table to track season lifecycle
CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Initialize Season 1 and Season 2
INSERT INTO seasons (id, name, active, started_at)
VALUES 
  (1, 'Season 1', false, '2026-01-01 00:00:00Z'),
  (2, 'Season 2', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Create index for fast seasonal and player lookups
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season);
CREATE INDEX IF NOT EXISTS idx_matches_played_at ON matches(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_players ON matches(player_a_id, player_b_id, player_a2_id, player_b2_id);
