const express = require('express');
const router = express.Router();
const { supabase } = require('../db');
const { calculateElo, calculateTeamElo } = require('../elo');
const { computeSeasonalRankings, getActiveSeasonId, syncActiveSeasonStats } = require('./players');

async function attachNames(matches) {
  if (!matches || !matches.length) return matches;
  const ids = [
    ...new Set(
      matches.flatMap(m => [m.player_a_id, m.player_b_id, m.player_a2_id, m.player_b2_id].filter(Boolean))
    ),
  ];
  if (!ids.length) return matches;

  const { data: players, error } = await supabase
    .from('players')
    .select('id, name')
    .in('id', ids);
  if (error) throw new Error(error.message);

  const nameById = new Map(players.map(p => [Number(p.id), p.name]));
  return matches.map(m => {
    const is2v2 = Boolean(m.player_a2_id || m.player_b2_id) || m.match_type === '2v2' || m.mode === '2v2';
    const matchType = is2v2 ? '2v2' : '1v1';
    return {
      ...m,
      match_type: matchType,
      mode: matchType,
      season: m.season != null ? Number(m.season) : 1,
      player_a_name: nameById.get(Number(m.player_a_id)) ?? null,
      player_b_name: nameById.get(Number(m.player_b_id)) ?? null,
      player_a2_name: m.player_a2_id ? (nameById.get(Number(m.player_a2_id)) ?? null) : null,
      player_b2_name: m.player_b2_id ? (nameById.get(Number(m.player_b2_id)) ?? null) : null,
    };
  });
}

router.get('/', async (req, res) => {
  try {
    let query = supabase.from('matches').select('*');
    if (req.query.season) {
      query = query.eq('season', Number(req.query.season));
    }
    if (req.query.mode) {
      query = query.eq('mode', req.query.mode);
    }
    const { data, error } = await query.order('played_at', { ascending: false });
    if (error) throw new Error(error.message);
    res.json(await attachNames(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/player/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    let query = supabase
      .from('matches')
      .select('*')
      .or(`player_a_id.eq.${id},player_b_id.eq.${id},player_a2_id.eq.${id},player_b2_id.eq.${id}`);

    if (req.query.season) {
      query = query.eq('season', Number(req.query.season));
    }

    const { data, error } = await query.order('played_at', { ascending: false });
    if (error) throw new Error(error.message);
    res.json(await attachNames(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/h2h/:id1/:id2', async (req, res) => {
  try {
    const id1 = Number(req.params.id1);
    const id2 = Number(req.params.id2);

    const { data: rawMatches, error } = await supabase
      .from('matches')
      .select('*')
      .or(`player_a_id.eq.${id1},player_b_id.eq.${id1},player_a2_id.eq.${id1},player_b2_id.eq.${id1}`)
      .order('played_at', { ascending: false });
    if (error) throw new Error(error.message);

    // Filter to matches where id1 and id2 are on opposing teams
    const relevant = (rawMatches || []).filter(m => {
      const teamA = [Number(m.player_a_id), Number(m.player_a2_id)].filter(Boolean);
      const teamB = [Number(m.player_b_id), Number(m.player_b2_id)].filter(Boolean);
      return (teamA.includes(id1) && teamB.includes(id2)) || (teamA.includes(id2) && teamB.includes(id1));
    });

    const matches = await attachNames(relevant);

    let p1wins = 0;
    let p2wins = 0;
    let p1PointsScored = 0;
    let p2PointsScored = 0;

    for (const m of matches) {
      const teamA = [Number(m.player_a_id), Number(m.player_a2_id)].filter(Boolean);
      const p1InA = teamA.includes(id1);
      const aWon = Number(m.score_a) > Number(m.score_b);

      if ((p1InA && aWon) || (!p1InA && !aWon)) {
        p1wins++;
      } else {
        p2wins++;
      }

      p1PointsScored += p1InA ? Number(m.score_a) : Number(m.score_b);
      p2PointsScored += p1InA ? Number(m.score_b) : Number(m.score_a);
    }

    const [{ data: player1 }, { data: player2 }] = await Promise.all([
      supabase.from('players').select('*').eq('id', id1).maybeSingle(),
      supabase.from('players').select('*').eq('id', id2).maybeSingle(),
    ]);

    res.json({ matches, p1wins, p2wins, p1PointsScored, p2PointsScored, player1, player2 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const {
    player_a_id, player_b_id,
    player_a2_id, player_b2_id,
    score_a, score_b,
    season,
    mode,
  } = req.body;

  if (score_a == null || score_b == null) return res.status(400).json({ error: 'Scores are required' });
  if (Number(score_a) === Number(score_b)) return res.status(400).json({ error: 'Ties are not allowed' });
  if (Number(score_a) < 0 || Number(score_b) < 0) return res.status(400).json({ error: 'Scores must be non-negative' });

  const is2v2 = Boolean(player_a2_id || player_b2_id || mode === '2v2');

  try {
    const targetSeason = season != null ? Number(season) : (await getActiveSeasonId());

    // Calculate current seasonal standings/MMRs for targetSeason
    const seasonalRankings = await computeSeasonalRankings(targetSeason);
    const seasonPlayerMap = new Map(seasonalRankings.map(p => [Number(p.id), p]));

    if (is2v2) {
      // 2v2 Doubles Match
      const a1 = Number(player_a_id);
      const a2 = Number(player_a2_id);
      const b1 = Number(player_b_id);
      const b2 = Number(player_b2_id);

      if (!a1 || !a2 || !b1 || !b2) {
        return res.status(400).json({ error: 'All 4 players are required for 2v2 matches' });
      }

      const playerIds = [a1, a2, b1, b2];
      if (new Set(playerIds).size !== 4) {
        return res.status(400).json({ error: 'All 4 players must be distinct' });
      }

      const pA1 = seasonPlayerMap.get(a1);
      const pA2 = seasonPlayerMap.get(a2);
      const pB1 = seasonPlayerMap.get(b1);
      const pB2 = seasonPlayerMap.get(b2);

      if (!pA1 || !pA2 || !pB1 || !pB2) {
        return res.status(404).json({ error: 'One or more players not found or inactive' });
      }

      // Compute Elo using isolated seasonal MMR
      const { deltaA, deltaB } = calculateTeamElo(
        [pA1.mmr, pA2.mmr],
        [pB1.mmr, pB2.mmr],
        Number(score_a),
        Number(score_b)
      );

      const { data: inserted, error: insertErr } = await supabase
        .from('matches')
        .insert({
          player_a_id: a1,
          player_a2_id: a2,
          player_b_id: b1,
          player_b2_id: b2,
          score_a: Number(score_a),
          score_b: Number(score_b),
          mmr_delta_a: deltaA,
          mmr_delta_b: deltaB,
          mode: '2v2',
          season: targetSeason,
        })
        .select()
        .single();
      if (insertErr) throw new Error(insertErr.message);

      // Sync active season stats into players table
      await syncActiveSeasonStats();

      const [withNames] = await attachNames([inserted]);
      return res.status(201).json(withNames);
    }

    // 1v1 Singles Match
    const a1 = Number(player_a_id);
    const b1 = Number(player_b_id);

    if (!a1 || !b1) return res.status(400).json({ error: 'Both players are required' });
    if (a1 === b1) return res.status(400).json({ error: 'Players must be different' });

    const pA = seasonPlayerMap.get(a1);
    const pB = seasonPlayerMap.get(b1);
    if (!pA || !pB) return res.status(404).json({ error: 'Player not found or inactive' });

    // Compute Elo using isolated seasonal MMR
    const { deltaA, deltaB } = calculateElo(pA.mmr, pB.mmr, Number(score_a), Number(score_b));

    const { data: inserted, error: insertErr } = await supabase
      .from('matches')
      .insert({
        player_a_id: a1,
        player_a2_id: null,
        player_b_id: b1,
        player_b2_id: null,
        score_a: Number(score_a),
        score_b: Number(score_b),
        mmr_delta_a: deltaA,
        mmr_delta_b: deltaB,
        mode: '1v1',
        season: targetSeason,
      })
      .select()
      .single();
    if (insertErr) throw new Error(insertErr.message);

    // Sync active season stats into players table
    await syncActiveSeasonStats();

    const [withNames] = await attachNames([inserted]);
    res.status(201).json(withNames);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { data: match, error: mErr } = await supabase
      .from('matches').select('*').eq('id', req.params.id).maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const { error: delErr } = await supabase
      .from('matches').delete().eq('id', req.params.id);
    if (delErr) throw new Error(delErr.message);

    // Recalculate and synchronize active season stats to players table
    await syncActiveSeasonStats();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

