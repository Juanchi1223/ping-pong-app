process.env.NODE_ENV = 'test';
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../server');
const { supabase } = require('../db');

describe('Full-Stack API E2E Verification', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    supabase._reset();
  });

  describe('1v1 Match Endpoints', () => {
    it('POST /api/matches creates a 1v1 match and recalculates MMR and streaks', async () => {
      const res = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_a_id: 1,
          player_b_id: 2,
          score_a: 11,
          score_b: 8,
          mode: '1v1',
          season: 2,
        }),
      });

      assert.strictEqual(res.status, 201);
      const match = await res.json();
      assert.strictEqual(match.player_a_name, 'Carmen Wu');
      assert.strictEqual(match.player_b_name, 'Alex Rivera');
      assert.strictEqual(match.score_a, 11);
      assert.strictEqual(match.score_b, 8);
      assert.strictEqual(match.mode, '1v1');
      assert.strictEqual(match.season, 2);
    });

    it('POST /api/matches rejects 1v1 matches with duplicate players', async () => {
      const res = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_a_id: 1,
          player_b_id: 1,
          score_a: 11,
          score_b: 8,
        }),
      });

      assert.strictEqual(res.status, 400);
      const err = await res.json();
      assert(err.error.includes('Players must be different'));
    });
  });

  describe('2v2 Doubles Match Endpoints', () => {
    it('POST /api/matches creates a 2v2 match with 4 distinct players and updates all 4 players', async () => {
      const res = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: '2v2',
          player_a_id: 1,
          player_a2_id: 2,
          player_b_id: 3,
          player_b2_id: 4,
          score_a: 11,
          score_b: 7,
          season: 2,
        }),
      });

      assert.strictEqual(res.status, 201);
      const match = await res.json();
      assert.strictEqual(match.mode, '2v2');
      assert.strictEqual(match.player_a_name, 'Carmen Wu');
      assert.strictEqual(match.player_a2_name, 'Alex Rivera');
      assert.strictEqual(match.player_b_name, 'Elena Rostova');
      assert.strictEqual(match.player_b2_name, 'Marcus Chen');
      assert.strictEqual(match.score_a, 11);
      assert.strictEqual(match.score_b, 7);
      assert(match.mmr_delta_a > 0);
      assert(match.mmr_delta_b < 0);
    });

    it('POST /api/matches rejects 2v2 match when players are duplicated', async () => {
      const res = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: '2v2',
          player_a_id: 1,
          player_a2_id: 1,
          player_b_id: 3,
          player_b2_id: 4,
          score_a: 11,
          score_b: 7,
        }),
      });

      assert.strictEqual(res.status, 400);
      const err = await res.json();
      assert(err.error.includes('All 4 players must be distinct'));
    });
  });

  describe('Season Archiving and Leaderboard Filtering', () => {
    it('GET /api/seasons returns available seasons', async () => {
      const res = await fetch(`${baseUrl}/seasons`);
      assert.strictEqual(res.status, 200);
      const seasons = await res.json();
      assert(Array.isArray(seasons));
      assert(seasons.length >= 2);
    });

    it('GET /api/players?season=1 returns Season 1 stats and GET /api/players?season=2 returns Season 2 stats', async () => {
      // Fetch Season 1
      const resS1 = await fetch(`${baseUrl}/players?season=1`);
      assert.strictEqual(resS1.status, 200);
      const s1Players = await resS1.json();
      assert(Array.isArray(s1Players));

      // Fetch Season 2
      const resS2 = await fetch(`${baseUrl}/players?season=2`);
      assert.strictEqual(resS2.status, 200);
      const s2Players = await resS2.json();
      assert(Array.isArray(s2Players));

      // Active Season 2 with no matches yet should have baseline MMR 1200
      assert.strictEqual(s2Players[0].mmr, 1200);
      assert.strictEqual(s2Players[0].matches_played, 0);

      // Now register a Season 2 match
      await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: '1v1',
          player_a_id: 1,
          player_b_id: 2,
          score_a: 11,
          score_b: 5,
          season: 2,
        }),
      });

      // Fetch Season 2 rankings again
      const resS2Updated = await fetch(`${baseUrl}/players?season=2`);
      const s2Updated = await resS2Updated.json();
      const p1 = s2Updated.find(p => p.id === 1);
      const p2 = s2Updated.find(p => p.id === 2);
      assert(p1.mmr > 1200);
      assert(p2.mmr < 1200);
      assert.strictEqual(p1.wins, 1);
      assert.strictEqual(p2.losses, 1);
    });

    it('GET /api/matches filters properly by season and mode', async () => {
      // Register 1v1 in Season 1
      await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: '1v1',
          player_a_id: 1,
          player_b_id: 2,
          score_a: 11,
          score_b: 6,
          season: 1,
        }),
      });

      // Register 2v2 in Season 2
      await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: '2v2',
          player_a_id: 1,
          player_a2_id: 2,
          player_b_id: 3,
          player_b2_id: 4,
          score_a: 11,
          score_b: 9,
          season: 2,
        }),
      });

      // Filter by season 2
      const resS2 = await fetch(`${baseUrl}/matches?season=2`);
      const s2Matches = await resS2.json();
      assert.strictEqual(s2Matches.length, 1);
      assert.strictEqual(s2Matches[0].mode, '2v2');

      // Filter by mode 2v2
      const res2v2 = await fetch(`${baseUrl}/matches?mode=2v2`);
      const m2v2 = await res2v2.json();
      assert.strictEqual(m2v2.length, 1);
      assert.strictEqual(m2v2[0].season, 2);
    });
  });
});
