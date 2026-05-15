const express = require('express');
const router = express.Router();
const { supabase } = require('../db');
const { calculateElo } = require('../elo');

async function attachNames(matches) {
  if (!matches.length) return matches;
  const ids = [...new Set(matches.flatMap(m => [m.player_a_id, m.player_b_id]))];
  const { data: players, error } = await supabase
    .from('players').select('id, name').in('id', ids);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map(p => [p.id, p.name]));
  return matches.map(m => ({
    ...m,
    player_a_name: nameById.get(m.player_a_id) ?? null,
    player_b_name: nameById.get(m.player_b_id) ?? null,
  }));
}

async function getRankings() {
  const { data: players, error } = await supabase
    .from('players').select('*').eq('active', true).order('mmr', { ascending: false });
  if (error) throw new Error(error.message);
  return players.map((p, i) => ({
    ...p,
    rank: i + 1,
    diff: p.points_scored - p.points_conceded,
    win_pct: p.wins + p.losses > 0 ? Math.round((p.wins / (p.wins + p.losses)) * 100) : 0,
  }));
}

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('matches').select('*').order('played_at', { ascending: false });
    if (error) throw new Error(error.message);
    res.json(await attachNames(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/player/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .or(`player_a_id.eq.${id},player_b_id.eq.${id}`)
      .order('played_at', { ascending: false });
    if (error) throw new Error(error.message);
    res.json(await attachNames(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/h2h/:id1/:id2', async (req, res) => {
  try {
    const id1 = Number(req.params.id1);
    const id2 = Number(req.params.id2);

    const { data: rawMatches, error } = await supabase
      .from('matches')
      .select('*')
      .or(`and(player_a_id.eq.${id1},player_b_id.eq.${id2}),and(player_a_id.eq.${id2},player_b_id.eq.${id1})`)
      .order('played_at', { ascending: false });
    if (error) throw new Error(error.message);

    const matches = await attachNames(rawMatches);

    const p1wins = matches.filter(m =>
      (m.player_a_id === id1 && m.score_a > m.score_b) ||
      (m.player_b_id === id1 && m.score_b > m.score_a)
    ).length;
    const p2wins = matches.length - p1wins;

    const p1PointsScored = matches.reduce((acc, m) =>
      acc + (m.player_a_id === id1 ? m.score_a : m.score_b), 0);
    const p2PointsScored = matches.reduce((acc, m) =>
      acc + (m.player_a_id === id2 ? m.score_a : m.score_b), 0);

    const [{ data: player1 }, { data: player2 }] = await Promise.all([
      supabase.from('players').select('*').eq('id', id1).maybeSingle(),
      supabase.from('players').select('*').eq('id', id2).maybeSingle(),
    ]);

    res.json({ matches, p1wins, p2wins, p1PointsScored, p2PointsScored, player1, player2 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { player_a_id, player_b_id, score_a, score_b } = req.body;

  if (!player_a_id || !player_b_id) return res.status(400).json({ error: 'Both players are required' });
  if (Number(player_a_id) === Number(player_b_id)) return res.status(400).json({ error: 'Players must be different' });
  if (score_a == null || score_b == null) return res.status(400).json({ error: 'Scores are required' });
  if (Number(score_a) === Number(score_b)) return res.status(400).json({ error: 'Ties are not allowed' });
  if (Number(score_a) < 0 || Number(score_b) < 0) return res.status(400).json({ error: 'Scores must be non-negative' });

  try {
    const [{ data: playerA }, { data: playerB }] = await Promise.all([
      supabase.from('players').select('*').eq('id', player_a_id).eq('active', true).maybeSingle(),
      supabase.from('players').select('*').eq('id', player_b_id).eq('active', true).maybeSingle(),
    ]);
    if (!playerA || !playerB) return res.status(404).json({ error: 'Player not found or inactive' });

    const { deltaA, deltaB } = calculateElo(playerA.mmr, playerB.mmr, Number(score_a), Number(score_b));
    const aWon = Number(score_a) > Number(score_b);

    const { data: inserted, error: insertErr } = await supabase
      .from('matches')
      .insert({
        player_a_id, player_b_id,
        score_a: Number(score_a), score_b: Number(score_b),
        mmr_delta_a: deltaA, mmr_delta_b: deltaB,
      })
      .select()
      .single();
    if (insertErr) throw new Error(insertErr.message);

    const updatesA = {
      mmr: playerA.mmr + deltaA,
      wins: playerA.wins + (aWon ? 1 : 0),
      losses: playerA.losses + (aWon ? 0 : 1),
      points_scored: playerA.points_scored + Number(score_a),
      points_conceded: playerA.points_conceded + Number(score_b),
      current_win_streak: aWon ? playerA.current_win_streak + 1 : 0,
      current_loss_streak: aWon ? 0 : playerA.current_loss_streak + 1,
    };
    const updatesB = {
      mmr: playerB.mmr + deltaB,
      wins: playerB.wins + (aWon ? 0 : 1),
      losses: playerB.losses + (aWon ? 1 : 0),
      points_scored: playerB.points_scored + Number(score_b),
      points_conceded: playerB.points_conceded + Number(score_a),
      current_win_streak: aWon ? 0 : playerB.current_win_streak + 1,
      current_loss_streak: aWon ? playerB.current_loss_streak + 1 : 0,
    };

    const [{ error: errA }, { error: errB }] = await Promise.all([
      supabase.from('players').update(updatesA).eq('id', player_a_id),
      supabase.from('players').update(updatesB).eq('id', player_b_id),
    ]);
    if (errA) throw new Error(errA.message);
    if (errB) throw new Error(errB.message);

    const [withNames] = await attachNames([inserted]);
    res.status(201).json(withNames);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { data: match, error: mErr } = await supabase
      .from('matches').select('*').eq('id', req.params.id).maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const [{ data: playerA }, { data: playerB }] = await Promise.all([
      supabase.from('players').select('*').eq('id', match.player_a_id).maybeSingle(),
      supabase.from('players').select('*').eq('id', match.player_b_id).maybeSingle(),
    ]);

    const aWon = match.score_a > match.score_b;

    const { error: delErr } = await supabase
      .from('matches').delete().eq('id', req.params.id);
    if (delErr) throw new Error(delErr.message);

    await supabase.from('players').update({
      mmr: playerA.mmr - match.mmr_delta_a,
      wins: playerA.wins - (aWon ? 1 : 0),
      losses: playerA.losses - (aWon ? 0 : 1),
      points_scored: playerA.points_scored - match.score_a,
      points_conceded: playerA.points_conceded - match.score_b,
    }).eq('id', match.player_a_id);

    await supabase.from('players').update({
      mmr: playerB.mmr - match.mmr_delta_b,
      wins: playerB.wins - (aWon ? 0 : 1),
      losses: playerB.losses - (aWon ? 1 : 0),
      points_scored: playerB.points_scored - match.score_b,
      points_conceded: playerB.points_conceded - match.score_a,
    }).eq('id', match.player_b_id);

    const [streakA, streakB] = await Promise.all([
      recalculateStreak(match.player_a_id),
      recalculateStreak(match.player_b_id),
    ]);
    await Promise.all([
      supabase.from('players').update(streakA).eq('id', match.player_a_id),
      supabase.from('players').update(streakB).eq('id', match.player_b_id),
    ]);

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function recalculateStreak(playerId) {
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)
    .order('played_at', { ascending: false });
  if (error) throw new Error(error.message);

  let current_win_streak = 0, current_loss_streak = 0;
  for (const m of matches) {
    const won = (m.player_a_id === playerId && m.score_a > m.score_b) ||
                (m.player_b_id === playerId && m.score_b > m.score_a);
    if (current_win_streak === 0 && current_loss_streak === 0) {
      if (won) current_win_streak = 1; else current_loss_streak = 1;
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
