const assert = require('assert');
const { calculateElo, calculateTeamElo } = require('./elo');

async function runTests() {
  console.log('--- STARTING PINGPONGZS VERIFICATION SUITE ---');

  // Test 1: Team Elo Calculation
  console.log('\n[Test 1] Testing Team Elo Calculation...');
  {
    // Equal teams
    const res1 = calculateTeamElo([1200, 1200], [1200, 1200], 11, 8);
    assert.strictEqual(res1.teamAvgA, 1200);
    assert.strictEqual(res1.teamAvgB, 1200);
    assert.strictEqual(res1.deltaA, 16);
    assert.strictEqual(res1.deltaB, -16);
    console.log('✓ Equal MMR 2v2 produces +16 / -16 delta for winner/loser teams');

    // Unequal teams: Higher MMR team wins
    const res2 = calculateTeamElo([1300, 1300], [1100, 1100], 11, 5);
    assert.strictEqual(res2.teamAvgA, 1300);
    assert.strictEqual(res2.teamAvgB, 1100);
    assert(res2.deltaA > 0 && res2.deltaA < 16, 'Favored team wins fewer points');
    assert.strictEqual(res2.deltaA, -res2.deltaB);
    console.log(`✓ Favored team (1300 vs 1100) win yields ${res2.deltaA} delta`);

    // Underdog team wins
    const res3 = calculateTeamElo([1100, 1100], [1300, 1300], 11, 9);
    assert(res3.deltaA > 16, 'Underdog win yields larger points');
    assert.strictEqual(res3.deltaA, -res3.deltaB);
    console.log(`✓ Underdog team (1100 vs 1300) win yields ${res3.deltaA} delta`);
  }

  // Test 2: Express Server & API Routes
  console.log('\n[Test 2] Testing API Routes with in-memory DB...');
  process.env.PORT = '3098';
  process.env.NODE_ENV = 'test';
  const app = require('./server');
  const http = require('http');
  const server = http.createServer(app);

  await new Promise(resolve => server.listen(3098, resolve));
  const baseUrl = 'http://127.0.0.1:3098/api';

  try {
    // 2.1 Players & Seasons
    const playersRes = await fetch(`${baseUrl}/players?season=2`);
    assert.strictEqual(playersRes.status, 200);
    const players = await playersRes.json();
    assert(Array.isArray(players) && players.length >= 4);
    assert.strictEqual(players[0].mmr, 1200, 'Season 2 starts active players at 1200 baseline MMR');
    console.log('✓ Season 2 rankings initialize at 1200 MMR baseline');

    const seasonsRes = await fetch(`${baseUrl}/seasons`);
    assert.strictEqual(seasonsRes.status, 200);
    const seasons = await seasonsRes.json();
    assert(seasons.some(s => s.id === 2 && s.active));
    assert(seasons.some(s => s.id === 1 && !s.active));
    console.log('✓ Seasons endpoint returns Season 1 (archive) and Season 2 (active)');

    // 2.2 1v1 Match in Season 1 (Historical)
    console.log('\n[Test 2.2] Recording Season 1 Historical Match...');
    const m1Res = await fetch(`${baseUrl}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_type: '1v1',
        player_a_id: players[0].id,
        player_b_id: players[1].id,
        score_a: 11,
        score_b: 6,
        season: 1,
      }),
    });
    assert.strictEqual(m1Res.status, 201);
    const m1 = await m1Res.json();
    assert.strictEqual(m1.match_type, '1v1');
    assert.strictEqual(m1.season, 1);
    assert(m1.player_a_name);
    assert(m1.player_b_name);
    console.log(`✓ Recorded 1v1 Season 1 match: ${m1.player_a_name} vs ${m1.player_b_name}`);

    // Check Season 1 vs Season 2 isolation
    const s1Rankings = await (await fetch(`${baseUrl}/players?season=1`)).json();
    const s2Rankings = await (await fetch(`${baseUrl}/players?season=2`)).json();
    const p1InS1 = s1Rankings.find(p => p.id === players[0].id);
    const p1InS2 = s2Rankings.find(p => p.id === players[0].id);
    assert(p1InS1.mmr > 1200, 'Player 1 MMR increased in Season 1');
    assert.strictEqual(p1InS1.wins, 2, 'Player 1 has 2 wins in Season 1 (1 seed + 1 recorded)');
    assert.strictEqual(p1InS2.wins, 0, 'Player 1 still has 0 wins in Season 2');
    assert.strictEqual(p1InS2.mmr, 1200, 'Player 1 MMR remains 1200 in Season 2');
    console.log('✓ Verified strict isolation between Season 1 archive and Season 2 active stats');

    // 2.3 2v2 Doubles Match in Season 2
    console.log('\n[Test 2.3] Recording Season 2 2v2 Doubles Match...');
    const m2Res = await fetch(`${baseUrl}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_type: '2v2',
        player_a_id: players[0].id,
        player_a2_id: players[1].id,
        player_b_id: players[2].id,
        player_b2_id: players[3].id,
        score_a: 11,
        score_b: 9,
        season: 2,
      }),
    });
    assert.strictEqual(m2Res.status, 201);
    const m2 = await m2Res.json();
    assert.strictEqual(m2.match_type, '2v2');
    assert.strictEqual(m2.season, 2);
    assert.strictEqual(m2.player_a_name, players[0].name);
    assert.strictEqual(m2.player_a2_name, players[1].name);
    assert.strictEqual(m2.player_b_name, players[2].name);
    assert.strictEqual(m2.player_b2_name, players[3].name);
    console.log('✓ Recorded 2v2 doubles match with 4 players and attached names');

    // Verify rating updates across all 4 players in Season 2
    const s2AfterDoubles = await (await fetch(`${baseUrl}/players?season=2`)).json();
    const p1 = s2AfterDoubles.find(p => p.id === players[0].id);
    const p2 = s2AfterDoubles.find(p => p.id === players[1].id);
    const p3 = s2AfterDoubles.find(p => p.id === players[2].id);
    const p4 = s2AfterDoubles.find(p => p.id === players[3].id);
    assert.strictEqual(p1.wins, 1);
    assert.strictEqual(p2.wins, 1);
    assert.strictEqual(p3.losses, 1);
    assert.strictEqual(p4.losses, 1);
    assert.strictEqual(p1.mmr, 1200 + m2.mmr_delta_a);
    assert.strictEqual(p2.mmr, 1200 + m2.mmr_delta_a);
    assert.strictEqual(p3.mmr, 1200 + m2.mmr_delta_b);
    assert.strictEqual(p4.mmr, 1200 + m2.mmr_delta_b);
    console.log(`✓ Verified rating & record updates for all 4 players: Team A (+${m2.mmr_delta_a}), Team B (${m2.mmr_delta_b})`);

    // 2.4 4-way uniqueness validation
    console.log('\n[Test 2.4] Testing 4-way duplicate rejection...');
    const dupRes = await fetch(`${baseUrl}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_type: '2v2',
        player_a_id: players[0].id,
        player_a2_id: players[1].id,
        player_b_id: players[0].id, // Duplicate!
        player_b2_id: players[3].id,
        score_a: 11,
        score_b: 7,
      }),
    });
    assert.strictEqual(dupRes.status, 400);
    const dupJson = await dupRes.json();
    assert(dupJson.error.includes('distinct'));
    console.log('✓ Correctly rejected 2v2 match with duplicate player slot');

    // 2.5 Match deletion and rating revert
    console.log('\n[Test 2.5] Testing Match Deletion & Rating Reversion...');
    const delRes = await fetch(`${baseUrl}/matches/${m2.id}`, { method: 'DELETE' });
    assert.strictEqual(delRes.status, 200);
    const s2AfterDelete = await (await fetch(`${baseUrl}/players?season=2`)).json();
    const p1Reverted = s2AfterDelete.find(p => p.id === players[0].id);
    assert.strictEqual(p1Reverted.wins, 0);
    assert.strictEqual(p1Reverted.mmr, 1200);
    console.log('✓ Deleting 2v2 match reverted ratings and stats for all participants');

  } finally {
    server.close();
  }

  console.log('\n========================================');
  console.log(' ALL VERIFICATION SUITE TESTS PASSED! ');
  console.log('========================================\n');
}

runTests().then(() => process.exit(0)).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
