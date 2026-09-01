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

describe('MMR Season Isolation & Deletion Regression Tests', () => {
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

  it('calculates full symmetrical Elo delta (+16) at start of Season 2 regardless of Season 1 disparity', async () => {
    // 1. In Season 1, Carmen won and Alex lost, creating a gap in Season 1 archive
    const s1Players = await makeRequest(server, 'GET', '/api/players?season=1');
    const carmenS1 = s1Players.body.find(p => p.id === 1);
    const alexS1 = s1Players.body.find(p => p.id === 2);
    assert.strictEqual(carmenS1.mmr, 1216);
    assert.strictEqual(alexS1.mmr, 1184);

    // 2. In Season 2, both players start at 1200 baseline MMR
    const s2PlayersBefore = await makeRequest(server, 'GET', '/api/players?season=2');
    const carmenS2Before = s2PlayersBefore.body.find(p => p.id === 1);
    const alexS2Before = s2PlayersBefore.body.find(p => p.id === 2);
    assert.strictEqual(carmenS2Before.mmr, 1200);
    assert.strictEqual(alexS2Before.mmr, 1200);

    // 3. Register a 1v1 match in Season 2 between Carmen (Player 1) and Alex (Player 2)
    const matchRes = await makeRequest(server, 'POST', '/api/matches', {
      player_a_id: 1,
      player_b_id: 2,
      score_a: 11,
      score_b: 8,
      mode: '1v1',
      season: 2,
    });

    assert.strictEqual(matchRes.status, 201);
    // Because both players were at 1200 in Season 2, winner MUST get +16 (not distorted by Season 1)
    assert.strictEqual(matchRes.body.mmr_delta_a, 16);
    assert.strictEqual(matchRes.body.mmr_delta_b, -16);

    // 4. Verify active leaderboard reflects exactly 1216 and 1184 for Season 2
    const s2PlayersAfter = await makeRequest(server, 'GET', '/api/players');
    const carmenS2After = s2PlayersAfter.body.find(p => p.id === 1);
    const alexS2After = s2PlayersAfter.body.find(p => p.id === 2);
    assert.strictEqual(carmenS2After.mmr, 1216);
    assert.strictEqual(alexS2After.mmr, 1184);
    assert.strictEqual(carmenS2After.wins, 1);
    assert.strictEqual(alexS2After.losses, 1);
  });

  it('deleting a Season 2 match does not pollute streaks or MMR with Season 1 data', async () => {
    // 1. Create a match in Season 2
    const matchRes = await makeRequest(server, 'POST', '/api/matches', {
      player_a_id: 1,
      player_b_id: 2,
      score_a: 11,
      score_b: 9,
      mode: '1v1',
      season: 2,
    });
    const matchId = matchRes.body.id;

    // Verify player 1 has 1 win streak
    const p1BeforeDel = await makeRequest(server, 'GET', '/api/players/1');
    assert.strictEqual(p1BeforeDel.body.current_win_streak, 1);
    assert.strictEqual(p1BeforeDel.body.mmr, 1216);

    // 2. Delete the match
    const delRes = await makeRequest(server, 'DELETE', `/api/matches/${matchId}`);
    assert.strictEqual(delRes.status, 200);

    // 3. Verify player 1 reverted to baseline 1200 and 0 streak in Season 2
    const p1AfterDel = await makeRequest(server, 'GET', '/api/players/1');
    assert.strictEqual(p1AfterDel.body.mmr, 1200);
    assert.strictEqual(p1AfterDel.body.wins, 0);
    assert.strictEqual(p1AfterDel.body.current_win_streak, 0);

    // 4. Verify Season 1 archive remained untouched
    const s1Player1 = await makeRequest(server, 'GET', '/api/players/1?season=1');
    assert.strictEqual(s1Player1.body.wins, 1);
    assert.strictEqual(s1Player1.body.mmr, 1216);
  });

  it('GET /api/players/:id defaults to active season and supports explicit season query', async () => {
    // Active season (S2) default
    const pActive = await makeRequest(server, 'GET', '/api/players/1');
    assert.strictEqual(pActive.status, 200);
    assert.strictEqual(pActive.body.mmr, 1200);
    assert.strictEqual(pActive.body.wins, 0);

    // Season 1 explicit query
    const pS1 = await makeRequest(server, 'GET', '/api/players/1?season=1');
    assert.strictEqual(pS1.status, 200);
    assert.strictEqual(pS1.body.mmr, 1216);
    assert.strictEqual(pS1.body.wins, 1);
  });
});
