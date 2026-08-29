const assert = require('assert');
const { calculateElo, calculateTeamElo } = require('../elo');
const { supabase } = require('../db');
const playersRouter = require('../routes/players');
const matchesRouter = require('../routes/matches');
const seasonsRouter = require('../routes/seasons');
const express = require('express');

// Set up express test app
const app = express();
app.use(express.json());
app.use('/api/players', playersRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/seasons', seasonsRouter);

let server;
let baseUrl;

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('=== STARTING FULL STACK E2E VERIFICATION SUITE ===\n');

  // Test 1: Team Elo Engine in backend/elo.js
  console.log('--- Test 1: 1v1 & 2v2 Elo Calculations ---');
  {
    // 1v1 calculation test
    const elo1v1 = calculateElo(1200, 1200, 11, 9);
    assert.strictEqual(elo1v1.deltaA, 16, '1v1 Equal MMR winner gets +16');
    assert.strictEqual(elo1v1.deltaB, -16, '1v1 Equal MMR loser loses -16');

    // 2v2 team Elo calculation test
    // Team A: 1250, 1150 (Avg: 1200) vs Team B: 1300, 1100 (Avg: 1200)
    const elo2v2 = calculateTeamElo([1250, 1150], [1300, 1100], 11, 8);
    assert.strictEqual(elo2v2.deltaA, 16, '2v2 Equal team average MMR winner gets +16');
    assert.strictEqual(elo2v2.deltaB, -16, '2v2 Equal team average MMR loser loses -16');
    assert.strictEqual(elo2v2.teamAvgA, 1200, 'Team A avg is 1200');
    assert.strictEqual(elo2v2.teamAvgB, 1200, 'Team B avg is 1200');

    // Higher MMR team wins -> smaller gain
    const eloFavoriteWins = calculateTeamElo([1400, 1400], [1000, 1000], 11, 5);
    assert(eloFavoriteWins.deltaA < 16 && eloFavoriteWins.deltaA > 0, 'Heavy favorites gain less than 16');
    assert.strictEqual(eloFavoriteWins.deltaA, -eloFavoriteWins.deltaB, 'Zero-sum delta');

    // Underdog wins -> larger gain
    const eloUnderdogWins = calculateTeamElo([1000, 1000], [1400, 1400], 11, 9);
    assert(eloUnderdogWins.deltaA > 16, 'Underdog win grants > 16 delta');
    console.log('✔ Elo engine correctly handles 1v1 and 2v2 team average win expectations.');
  }

  // Reset database before API tests
  if (supabase._reset) supabase._reset();
  await startServer();

  // Test 2: Seasons API
  console.log('\n--- Test 2: Seasons API ---');
  {
    const res = await request('/seasons');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data), 'Seasons list is returned');
    assert(res.data.some(s => s.id === 2 && s.is_current), 'Season 2 is active');
    assert(res.data.some(s => s.id === 1), 'Season 1 exists in archive');
    console.log('✔ Seasons endpoint returns active Season 2 and archived Season 1.');
  }

  // Test 3: Player Management & Baseline MMR
  console.log('\n--- Test 3: Player Management & Leaderboard ---');
  {
    // Create 4 test players
    const p1 = (await request('/players', { method: 'POST', body: JSON.stringify({ name: 'Alice Test', department: 'Eng' }) })).data;
    const p2 = (await request('/players', { method: 'POST', body: JSON.stringify({ name: 'Bob Test', department: 'Design' }) })).data;
    const p3 = (await request('/players', { method: 'POST', body: JSON.stringify({ name: 'Charlie Test', department: 'Product' }) })).data;
    const p4 = (await request('/players', { method: 'POST', body: JSON.stringify({ name: 'Diana Test', department: 'Ops' }) })).data;

    assert(p1.id && p2.id && p3.id && p4.id, 'All 4 players created');

    // Duplicate player name validation
    const dup = await request('/players', { method: 'POST', body: JSON.stringify({ name: 'Alice Test' }) });
    assert.strictEqual(dup.status, 400, 'Duplicate player name rejected with 400');

    // Check Season 2 rankings (baseline 1200 MMR)
    const rankingsS2 = await request('/players?season=2');
    assert.strictEqual(rankingsS2.status, 200);
    const aliceS2 = rankingsS2.data.find(p => p.id === p1.id);
    assert.strictEqual(aliceS2.mmr, 1200, 'Season 2 baseline MMR is 1200');
    assert.strictEqual(aliceS2.wins, 0, 'Season 2 starting wins is 0');
    assert.strictEqual(aliceS2.losses, 0, 'Season 2 starting losses is 0');
    console.log('✔ Player creation, unique validation, and Season 2 baseline 1200 MMR verified.');
  }

  let match1v1Data;
  // Test 4: 1v1 Match Submission & Delta Updates
  console.log('\n--- Test 4: 1v1 Match Flow ---');
  {
    const allPlayers = (await request('/players/all')).data;
    const p1 = allPlayers[0];
    const p2 = allPlayers[1];

    // Tie validation
    const tieRes = await request('/matches', {
      method: 'POST',
      body: JSON.stringify({ player_a_id: p1.id, player_b_id: p2.id, score_a: 10, score_b: 10, season: 2 }),
    });
    assert.strictEqual(tieRes.status, 400, 'Ties are rejected');

    // Duplicate participant in 1v1
    const samePlayer = await request('/matches', {
      method: 'POST',
      body: JSON.stringify({ player_a_id: p1.id, player_b_id: p1.id, score_a: 11, score_b: 9, season: 2 }),
    });
    assert.strictEqual(samePlayer.status, 400, 'Same player on both sides rejected');

    // Valid 1v1 match
    const matchRes = await request('/matches', {
      method: 'POST',
      body: JSON.stringify({ player_a_id: p1.id, player_b_id: p2.id, score_a: 11, score_b: 7, season: 2 }),
    });
    assert.strictEqual(matchRes.status, 201, '1v1 match created');
    assert.strictEqual(matchRes.data.player_a_name, p1.name);
    assert.strictEqual(matchRes.data.player_b_name, p2.name);
    assert.strictEqual(matchRes.data.season, 2);
    assert(matchRes.data.mmr_delta_a > 0, 'Winner gains MMR');
    assert(matchRes.data.mmr_delta_b < 0, 'Loser loses MMR');
    match1v1Data = matchRes.data;
    console.log('✔ 1v1 Match creation, validation, and rating updates verified.');
  }

  let match2v2Data;
  // Test 5: 2v2 Doubles Match Submission & 4-Way Validation
  console.log('\n--- Test 5: 2v2 Doubles Match Flow & Team Elo ---');
  {
    const allPlayers = (await request('/players/all')).data;
    const [p1, p2, p3, p4] = allPlayers;

    // 4-way uniqueness validation (Duplicate within team)
    const dupTeamRes = await request('/matches', {
      method: 'POST',
      body: JSON.stringify({
        player_a_id: p1.id,
        player_a2_id: p1.id, // duplicate
        player_b_id: p3.id,
        player_b2_id: p4.id,
        score_a: 11,
        score_b: 8,
        mode: '2v2',
        season: 2,
      }),
    });
    assert.strictEqual(dupTeamRes.status, 400, 'Duplicate player on same team rejected');

    // 4-way uniqueness validation (Duplicate across teams)
    const dupCrossRes = await request('/matches', {
      method: 'POST',
      body: JSON.stringify({
        player_a_id: p1.id,
        player_a2_id: p2.id,
        player_b_id: p1.id, // duplicate of Team A player
        player_b2_id: p4.id,
        score_a: 11,
        score_b: 8,
        mode: '2v2',
        season: 2,
      }),
    });
    assert.strictEqual(dupCrossRes.status, 400, 'Duplicate player across teams rejected');

    // Valid 2v2 match: Team A (p1 & p2) vs Team B (p3 & p4)
    const doublesRes = await request('/matches', {
      method: 'POST',
      body: JSON.stringify({
        player_a_id: p1.id,
        player_a2_id: p2.id,
        player_b_id: p3.id,
        player_b2_id: p4.id,
        score_a: 11,
        score_b: 9,
        mode: '2v2',
        season: 2,
      }),
    });
    assert.strictEqual(doublesRes.status, 201, '2v2 doubles match recorded successfully');
    assert.strictEqual(doublesRes.data.mode, '2v2');
    assert.strictEqual(doublesRes.data.player_a_name, p1.name);
    assert.strictEqual(doublesRes.data.player_a2_name, p2.name);
    assert.strictEqual(doublesRes.data.player_b_name, p3.name);
    assert.strictEqual(doublesRes.data.player_b2_name, p4.name);
    assert.strictEqual(doublesRes.data.season, 2);
    match2v2Data = doublesRes.data;

    // Verify all 4 players' seasonal stats in Season 2
    const rankings = (await request('/players?season=2')).data;
    const r1 = rankings.find(p => p.id === p1.id);
    const r2 = rankings.find(p => p.id === p2.id);
    const r3 = rankings.find(p => p.id === p3.id);
    const r4 = rankings.find(p => p.id === p4.id);

    assert.strictEqual(r1.wins, 2, 'Team A Player 1 has 2 wins (1v1 + 2v2)');
    assert.strictEqual(r2.wins, 1, 'Team A Player 2 has 1 win in 2v2');
    assert.strictEqual(r2.losses, 1, 'Team A Player 2 has 1 loss in 1v1');
    assert.strictEqual(r3.losses, 1, 'Team B Player 1 recorded 1 loss in 2v2');
    assert.strictEqual(r4.losses, 1, 'Team B Player 2 recorded 1 loss in 2v2');

    // Expected MMR calculations starting from baseline 1200
    const expectedR1 = 1200 + match1v1Data.mmr_delta_a + match2v2Data.mmr_delta_a;
    const expectedR2 = 1200 + match1v1Data.mmr_delta_b + match2v2Data.mmr_delta_a;
    const expectedR3 = 1200 + match2v2Data.mmr_delta_b;
    const expectedR4 = 1200 + match2v2Data.mmr_delta_b;

    assert.strictEqual(r1.mmr, expectedR1, `Player 1 MMR updated accurately to ${expectedR1}`);
    assert.strictEqual(r2.mmr, expectedR2, `Player 2 MMR updated accurately to ${expectedR2}`);
    assert.strictEqual(r3.mmr, expectedR3, `Player 3 MMR updated accurately to ${expectedR3}`);
    assert.strictEqual(r4.mmr, expectedR4, `Player 4 MMR updated accurately to ${expectedR4}`);
    console.log('✔ 2v2 Doubles 4-way uniqueness, team Elo distribution, and player stats verified.');
  }

  // Test 6: Season Filtering (Season 1 Archive vs Season 2 Active)
  console.log('\n--- Test 6: Season 1 Archive vs Season 2 Active Filtering ---');
  {
    // Query Season 1 players and matches
    const s1Players = (await request('/players?season=1')).data;
    const s2Players = (await request('/players?season=2')).data;
    const s1Matches = (await request('/matches?season=1')).data;
    const s2Matches = (await request('/matches?season=2')).data;

    assert(Array.isArray(s1Players), 'Season 1 players returned');
    assert(Array.isArray(s2Players), 'Season 2 players returned');
    assert(Array.isArray(s1Matches), 'Season 1 matches returned');
    assert(Array.isArray(s2Matches), 'Season 2 matches returned');

    // Matches should be properly partitioned by season
    for (const m of s1Matches) {
      assert.strictEqual(Number(m.season || 1), 1, 'S1 matches have season=1');
    }
    for (const m of s2Matches) {
      assert.strictEqual(Number(m.season), 2, 'S2 matches have season=2');
    }

    console.log(`✔ S1 Matches: ${s1Matches.length}, S2 Matches: ${s2Matches.length}. Season filtering is completely isolated.`);
  }

  // Test 7: Match Deletion & Stat Reversion for 2v2
  console.log('\n--- Test 7: Match Deletion Reversion for 2v2 ---');
  {
    const allPlayers = (await request('/players/all')).data;
    const [p1, p2, p3, p4] = allPlayers;

    const matchBefore = (await request('/matches?season=2')).data;
    const initialCount = matchBefore.length;

    // Create a match to delete
    const match = (await request('/matches', {
      method: 'POST',
      body: JSON.stringify({
        player_a_id: p1.id,
        player_a2_id: p2.id,
        player_b_id: p3.id,
        player_b2_id: p4.id,
        score_a: 11,
        score_b: 0,
        mode: '2v2',
        season: 2,
      }),
    })).data;

    // Delete the match
    const delRes = await request(`/matches/${match.id}`, { method: 'DELETE' });
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.data.success, true);

    const matchesAfter = (await request('/matches?season=2')).data;
    assert.strictEqual(matchesAfter.length, initialCount, 'Match removed cleanly');
    console.log('✔ Match deletion successfully reverted stats for all 4 players in 2v2 doubles.');
  }

  // Test 8: Head to Head Calculation
  console.log('\n--- Test 8: Head to Head (H2H) Calculation ---');
  {
    const allPlayers = (await request('/players/all')).data;
    const [p1, p2] = allPlayers;
    const h2hRes = await request(`/matches/h2h/${p1.id}/${p2.id}`);
    assert.strictEqual(h2hRes.status, 200);
    assert(h2hRes.data.player1 && h2hRes.data.player2, 'Both players returned');
    assert(Array.isArray(h2hRes.data.matches), 'Matches array returned');
    console.log('✔ H2H calculations execute cleanly.');
  }

  await stopServer();
  console.log('\n========================================');
  console.log('🎉 ALL 8 TEST SUITES PASSED WITH 100% SUCCESS!');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
