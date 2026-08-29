const express = require('express');
const router = express.Router();
const { supabase } = require('../db');
const { calculateElo, calculateTeamElo } = require('../elo');

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
      const aWon = m.score_a > m.score_b;

      if ((p1InA && aWon) || (!p1InA && !aWon)) {
        p1wins++;
      } else {
        p2wins++;
      }

      p1PointsScored += p1InA ? m.score_a : m.score_b;
      p2PointsScored += p1InA ? m.score_b : m.score_a;
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
    season = 2,
    mode,
  } = req.body;

  if (score_a == null || score_b == null) return res.status(400).json({ error: 'Scores are required' });
  if (Number(score_a) === Number(score_b)) return res.status(400).json({ error: 'Ties are not allowed' });
  if (Number(score_a) < 0 || Number(score_b) < 0) return res.status(400).json({ error: 'Scores must be non-negative' });

  const is2v2 = Boolean(player_a2_id || player_b2_id || mode === '2v2');

  try {
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

      const { data: activePlayers, error: pErr } = await supabase
        .from('players')
        .select('*')
        .in('id', playerIds)
        .eq('active', true);
      if (pErr) throw new Error(pErr.message);

      if (!activePlayers || activePlayers.length !== 4) {
        return res.status(404).json({ error: 'One or more players not found or inactive' });
      }

      const playerMap = new Map(activePlayers.map(p => [Number(p.id), p]));
      const pA1 = playerMap.get(a1);
      const pA2 = playerMap.get(a2);
      const pB1 = playerMap.get(b1);
      const pB2 = playerMap.get(b2);

      const { deltaA, deltaB } = calculateTeamElo(
        [pA1.mmr, pA2.mmr],
        [pB1.mmr, pB2.mmr],
        Number(score_a),
        Number(score_b)
      );

      const aWon = Number(score_a) > Number(score_b);

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
          season: Number(season) || 1,
        })
        .select()
        .single();
      if (insertErr) throw new Error(insertErr.message);

      const updateTeamMember = (player, delta, won, scored, conceded) => ({
        mmr: player.mmr + delta,
        wins: player.wins + (won ? 1 : 0),
        losses: player.losses + (won ? 0 : 1),
        points_scored: player.points_scored + scored,
        points_conceded: player.points_conceded + conceded,
        current_win_streak: won ? player.current_win_streak + 1 : 0,
        current_loss_streak: won ? 0 : player.current_loss_streak + 1,
      });

      const sA = Number(score_a);
      const sB = Number(score_b);

      await Promise.all([
        supabase.from('players').update(updateTeamMember(pA1, deltaA, aWon, sA, sB)).eq('id', a1),
        supabase.from('players').update(updateTeamMember(pA2, deltaA, aWon, sA, sB)).eq('id', a2),
        supabase.from('players').update(updateTeamMember(pB1, deltaB, !aWon, sB, sA)).eq('id', b1),
        supabase.from('players').update(updateTeamMember(pB2, deltaB, !aWon, sB, sA)).eq('id', b2),
      ]);

      const [withNames] = await attachNames([inserted]);
      return res.status(201).json(withNames);
    }

    // 1v1 Singles Match
    const a1 = Number(player_a_id);
    const b1 = Number(player_b_id);

    if (!a1 || !b1) return res.status(400).json({ error: 'Both players are required' });
    if (a1 === b1) return res.status(400).json({ error: 'Players must be different' });

    const [{ data: playerA }, { data: playerB }] = await Promise.all([
      supabase.from('players').select('*').eq('id', a1).eq('active', true).maybeSingle(),
      supabase.from('players').select('*').eq('id', b1).eq('active', true).maybeSingle(),
    ]);
    if (!playerA || !playerB) return res.status(404).json({ error: 'Player not found or inactive' });

    const { deltaA, deltaB } = calculateElo(playerA.mmr, playerB.mmr, Number(score_a), Number(score_b));
    const aWon = Number(score_a) > Number(score_b);

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
        season: Number(season) || 1,
      })
      .select()
      .single();
    if (insertErr) throw new Error(insertErr.message);

    const sA = Number(score_a);
    const sB = Number(score_b);

    const updatesA = {
      mmr: playerA.mmr + deltaA,
      wins: playerA.wins + (aWon ? 1 : 0),
      losses: playerA.losses + (aWon ? 0 : 1),
      points_scored: playerA.points_scored + sA,
      points_conceded: playerA.points_conceded + sB,
      current_win_streak: aWon ? playerA.current_win_streak + 1 : 0,
      current_loss_streak: aWon ? 0 : playerA.current_loss_streak + 1,
    };
    const updatesB = {
      mmr: playerB.mmr + deltaB,
      wins: playerB.wins + (aWon ? 0 : 1),
      losses: playerB.losses + (aWon ? 1 : 0),
      points_scored: playerB.points_scored + sB,
      points_conceded: playerB.points_conceded + sA,
      current_win_streak: aWon ? 0 : playerB.current_win_streak + 1,
      current_loss_streak: aWon ? playerB.current_loss_streak + 1 : 0,
    };

    const [{ error: errA }, { error: errB }] = await Promise.all([
      supabase.from('players').update(updatesA).eq('id', a1),
      supabase.from('players').update(updatesB).eq('id', b1),
    ]);
    if (errA) throw new Error(errA.message);
    if (errB) throw new Error(errB.message);

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

    const is2v2 = Boolean(match.player_a2_id && match.player_b2_id) || match.mode === '2v2';
    const aWon = Number(match.score_a) > Number(match.score_b);

    const playerIds = is2v2
      ? [match.player_a_id, match.player_a2_id, match.player_b_id, match.player_b2_id].filter(Boolean)
      : [match.player_a_id, match.player_b_id];

    const { data: players, error: pErr } = await supabase
      .from('players').select('*').in('id', playerIds);
    if (pErr) throw new Error(pErr.message);

    const playerMap = new Map(players.map(p => [Number(p.id), p]));

    const { error: delErr } = await supabase
      .from('matches').delete().eq('id', req.params.id);
    if (delErr) throw new Error(delErr.message);

    const revertTeamPlayer = async (id, delta, won, scored, conceded) => {
      const p = playerMap.get(Number(id));
      if (!p) return;
      await supabase.from('players').update({
        mmr: p.mmr - delta,
        wins: Math.max(0, p.wins - (won ? 1 : 0)),
        losses: Math.max(0, p.losses - (won ? 0 : 1)),
        points_scored: Math.max(0, p.points_scored - scored),
        points_conceded: Math.max(0, p.points_conceded - conceded),
      }).eq('id', id);
    };

    const sA = Number(match.score_a);
    const sB = Number(match.score_b);

    if (is2v2) {
      await Promise.all([
        revertTeamPlayer(match.player_a_id, match.mmr_delta_a, aWon, sA, sB),
        revertTeamPlayer(match.player_a2_id, match.mmr_delta_a, aWon, sA, sB),
        revertTeamPlayer(match.player_b_id, match.mmr_delta_b, !aWon, sB, sA),
        revertTeamPlayer(match.player_b2_id, match.mmr_delta_b, !aWon, sB, sA),
      ]);
    } else {
      await Promise.all([
        revertTeamPlayer(match.player_a_id, match.mmr_delta_a, aWon, sA, sB),
        revertTeamPlayer(match.player_b_id, match.mmr_delta_b, !aWon, sB, sA),
      ]);
    }

    // Recalculate streaks for all participants
    await Promise.all(playerIds.map(async id => {
      const streaks = await recalculateStreak(Number(id));
      await supabase.from('players').update(streaks).eq('id', id);
    }));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function recalculateStreak(playerId) {
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId},player_a2_id.eq.${playerId},player_b2_id.eq.${playerId}`)
    .order('played_at', { ascending: false });
  if (error) throw new Error(error.message);

  let current_win_streak = 0, current_loss_streak = 0;
  for (const m of (matches || [])) {
    const isTeamA = Number(m.player_a_id) === playerId || Number(m.player_a2_id) === playerId;
    const won = isTeamA ? Number(m.score_a) > Number(m.score_b) : Number(m.score_b) > Number(m.score_a);

    if (current_win_streak === 0 && current_loss_streak === 0) {
      if (won) current_win_streak = 1;
      else current_loss_streak = 1;
    } else if (current_win_streak > 0 && won) {
      current_win_streak++;
    } else if (current_loss_streak > 0 && !won) {
      current_loss_streak++;
    } else {
      break;
    }
  }
  return { current_win_streak, current_loss_streak };
}

module.exports = router;
