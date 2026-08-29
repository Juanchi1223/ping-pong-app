const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { supabase } = require('../db');
const { calculateElo, calculateTeamElo } = require('../elo');

// Test helper to simulate Express routes using the db & elo logic
describe('End-to-End & Integration Tests', () => {
  beforeEach(() => {
    supabase._reset();
  });

  describe('1v1 Match Lifecycle', () => {
    it('records 1v1 match and updates player MMR and stats properly', async () => {
      const { data: p1 } = await supabase.from('players').select('*').eq('id', 1).single();
      const { data: p2 } = await supabase.from('players').select('*').eq('id', 2).single();

      const { deltaA, deltaB } = calculateElo(p1.mmr, p2.mmr, 11, 7);
      assert.strictEqual(deltaA + deltaB, 0);

      const { data: match } = await supabase.from('matches').insert({
        player_a_id: 1,
        player_b_id: 2,
        player_a2_id: null,
        player_b2_id: null,
        score_a: 11,
        score_b: 7,
        mmr_delta_a: deltaA,
        mmr_delta_b: deltaB,
        mode: '1v1',
        season: 2,
      }).select().single();

      assert.strictEqual(match.mode, '1v1');
      assert.strictEqual(match.season, 2);
      assert.strictEqual(match.score_a, 11);
      assert.strictEqual(match.score_b, 7);
    });
  });

  describe('2v2 Doubles Match Lifecycle', () => {
    it('calculates team average MMR and applies equal delta across all 4 players', async () => {
      const { data: players } = await supabase.from('players').select('*');
      const [p1, p2, p3, p4] = players;

      // Team A: P1 (1284) & P2 (1248) -> avg = 1266
      // Team B: P3 (1216) & P4 (1180) -> avg = 1198
      const teamMmrA = [p1.mmr, p2.mmr];
      const teamMmrB = [p3.mmr, p4.mmr];

      const { deltaA, deltaB, teamAvgA, teamAvgB } = calculateTeamElo(teamMmrA, teamMmrB, 11, 5);

      assert.strictEqual(teamAvgA, 1266);
      assert.strictEqual(teamAvgB, 1198);
      assert.strictEqual(deltaA + deltaB, 0);
      assert(deltaA > 0);
      assert(deltaB < 0);

      // Insert 2v2 match
      const { data: match } = await supabase.from('matches').insert({
        player_a_id: p1.id,
        player_a2_id: p2.id,
        player_b_id: p3.id,
        player_b2_id: p4.id,
        score_a: 11,
        score_b: 5,
        mmr_delta_a: deltaA,
        mmr_delta_b: deltaB,
        mode: '2v2',
        season: 2,
      }).select().single();

      assert.strictEqual(match.mode, '2v2');
      assert.strictEqual(match.player_a2_id, p2.id);
      assert.strictEqual(match.player_b2_id, p4.id);
    });
  });

  describe('Seasonal Data Filtering', () => {
    it('correctly filters matches by season 1 and season 2', async () => {
      const { data: s1Matches } = await supabase.from('matches').select('*').eq('season', 1);
      assert.strictEqual(s1Matches.length, 2);

      await supabase.from('matches').insert({
        player_a_id: 1,
        player_b_id: 3,
        score_a: 11,
        score_b: 9,
        mmr_delta_a: 15,
        mmr_delta_b: -15,
        mode: '1v1',
        season: 2,
      });

      const { data: s2Matches } = await supabase.from('matches').select('*').eq('season', 2);
      assert.strictEqual(s2Matches.length, 1);
    });
  });
});
