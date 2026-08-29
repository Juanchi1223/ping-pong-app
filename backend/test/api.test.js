process.env.NODE_ENV = 'test';
process.env.USE_MOCK_DB = 'true';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../server');
const { supabase } = require('../db');

function makeRequest(server, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const data = rawData ? JSON.parse(rawData) : null;
            resolve({ status: res.statusCode, body: data });
          } catch (e) {
            resolve({ status: res.statusCode, body: rawData });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('Full-Stack API Integration Tests', () => {
  let server;

  beforeEach((t, done) => {
    supabase._reset();
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      done();
    });
  });

  afterEach((t, done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  it('GET /api/players returns seeded players with calculated ranks & badges', async () => {
    const res = await makeRequest(server, 'GET', '/api/players');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.body));
    assert.strictEqual(res.body.length, 4);
    assert.strictEqual(res.body[0].rank, 1);
    assert(res.body[0].mmr >= res.body[1].mmr);
    assert(res.body[0].badges);
  });

  it('POST /api/matches registers a 1v1 match and updates MMR/streaks', async () => {
    const matchPayload = {
      player_a_id: 1,
      player_b_id: 2,
      score_a: 11,
      score_b: 4,
      mode: '1v1',
      season: 2,
    };
    const res = await makeRequest(server, 'POST', '/api/matches', matchPayload);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.mode, '1v1');
    assert.strictEqual(res.body.player_a_name, 'Carmen Wu');
    assert.strictEqual(res.body.player_b_name, 'Alex Rivera');
    assert(res.body.mmr_delta_a > 0);
    assert(res.body.mmr_delta_b < 0);
  });

  it('POST /api/matches registers a 2v2 doubles match with 4 distinct players', async () => {
    const matchPayload = {
      player_a_id: 1,
      player_a2_id: 2,
      player_b_id: 3,
      player_b2_id: 4,
      score_a: 11,
      score_b: 9,
      mode: '2v2',
      season: 2,
    };
    const res = await makeRequest(server, 'POST', '/api/matches', matchPayload);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.mode, '2v2');
    assert.strictEqual(res.body.player_a_name, 'Carmen Wu');
    assert.strictEqual(res.body.player_a2_name, 'Alex Rivera');
    assert.strictEqual(res.body.player_b_name, 'Elena Rostova');
    assert.strictEqual(res.body.player_b2_name, 'Marcus Chen');
    assert(res.body.mmr_delta_a > 0);
    assert(res.body.mmr_delta_b < 0);

    // Verify all 4 players have updated stats in the DB
    const pRes = await makeRequest(server, 'GET', '/api/players/all');
    const p1 = pRes.body.find(p => p.id === 1);
    const p2 = pRes.body.find(p => p.id === 2);
    const p3 = pRes.body.find(p => p.id === 3);
    const p4 = pRes.body.find(p => p.id === 4);

    assert.strictEqual(p1.wins, 9); // Initial 8 + 1
    assert.strictEqual(p2.wins, 8); // Initial 7 + 1
    assert.strictEqual(p3.losses, 6); // Initial 5 + 1
    assert.strictEqual(p4.losses, 7); // Initial 6 + 1
  });

  it('POST /api/matches rejects 2v2 match with duplicate players', async () => {
    const duplicatePayload = {
      player_a_id: 1,
      player_a2_id: 1, // Duplicate!
      player_b_id: 2,
      player_b2_id: 3,
      score_a: 11,
      score_b: 5,
      mode: '2v2',
    };
    const res = await makeRequest(server, 'POST', '/api/matches', duplicatePayload);
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /distinct/i);
  });

  it('POST /api/matches rejects tied scores', async () => {
    const tiePayload = {
      player_a_id: 1,
      player_b_id: 2,
      score_a: 10,
      score_b: 10,
    };
    const res = await makeRequest(server, 'POST', '/api/matches', tiePayload);
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /ties are not allowed/i);
  });

  it('DELETE /api/matches/:id rolls back match and recalculates streaks', async () => {
    // 1. Create a 2v2 match
    const createRes = await makeRequest(server, 'POST', '/api/matches', {
      player_a_id: 1,
      player_a2_id: 2,
      player_b_id: 3,
      player_b2_id: 4,
      score_a: 11,
      score_b: 5,
      mode: '2v2',
    });
    const matchId = createRes.body.id;

    // 2. Delete the match
    const delRes = await makeRequest(server, 'DELETE', `/api/matches/${matchId}`);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.success, true);

    // 3. Verify player 1 returned to original wins (8)
    const pRes = await makeRequest(server, 'GET', '/api/players/1');
    assert.strictEqual(pRes.body.wins, 8);
  });

  it('Season Lifecycle: Supports Season 1 Archive and Season 2 Reset', async () => {
    // 1. Check Season 1 archive standings
    const s1Res = await makeRequest(server, 'GET', '/api/players?season=1');
    assert.strictEqual(s1Res.status, 200);
    assert(Array.isArray(s1Res.body));

    // 2. Query available seasons
    const seasonsRes = await makeRequest(server, 'GET', '/api/seasons');
    assert.strictEqual(seasonsRes.status, 200);
    assert.strictEqual(seasonsRes.body.length, 2);

    // 3. Trigger Season 2 reset
    const resetRes = await makeRequest(server, 'POST', '/api/seasons/reset', { targetSeason: 2 });
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.body.activeSeason, 2);

    // 4. Verify all players baseline MMR in active season
    const activePlayers = await makeRequest(server, 'GET', '/api/players');
    for (const p of activePlayers.body) {
      assert.strictEqual(p.mmr, 1200);
      assert.strictEqual(p.wins, 0);
      assert.strictEqual(p.losses, 0);
    }

    // 5. Verify Season 1 matches and historical records are still preserved
    const s1Matches = await makeRequest(server, 'GET', '/api/matches?season=1');
    assert.strictEqual(s1Matches.status, 200);
    assert.strictEqual(s1Matches.body.length, 2);
  });
});
