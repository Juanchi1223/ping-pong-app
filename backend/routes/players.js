const express = require('express');
const router = express.Router();
const { supabase } = require('../db');

function computeBadges(players) {
  let bestDiffId = null, bestDiff = -Infinity;
  let onFireId = null, bestWinStreak = 0;
  let badStreakId = null, bestLossStreak = 0;

  for (const p of players) {
    const diff = p.points_scored - p.points_conceded;
    if (diff > bestDiff) { bestDiff = diff; bestDiffId = p.id; }
    if (p.current_win_streak > bestWinStreak) { bestWinStreak = p.current_win_streak; onFireId = p.id; }
    if (p.current_loss_streak > bestLossStreak) { bestLossStreak = p.current_loss_streak; badStreakId = p.id; }
  }

  return {
    bestDiffId,
    onFireId: bestWinStreak >= 2 ? onFireId : null,
    badStreakId: bestLossStreak >= 2 ? badStreakId : null,
  };
}

async function computeSeasonalRankings(season) {
  const targetSeason = Number(season) || 2;
  const [{ data: players, error: pErr }, { data: allMatches, error: mErr }] = await Promise.all([
    supabase.from('players').select('*').eq('active', true),
    supabase.from('matches').select('*').order('played_at', { ascending: true }),
  ]);

  if (pErr) throw new Error(pErr.message);
  if (mErr) throw new Error(mErr.message);

  // Filter matches belonging to the target season (season 1 includes null/undefined)
  const matches = (allMatches || []).filter(m => {
    const s = m.season != null ? Number(m.season) : 1;
    return s === targetSeason;
  });

  // Initialize seasonal stats map for all active players
  const playerStats = new Map();
  const baseline = 1200;
  for (const p of players) {
    playerStats.set(Number(p.id), {
      ...p,
      id: Number(p.id),
      mmr: baseline,
      wins: 0,
      losses: 0,
      points_scored: 0,
      points_conceded: 0,
      current_win_streak: 0,
      current_loss_streak: 0,
      matches_played: 0,
    });
  }

  // Aggregate matches in chronological order
  for (const m of matches) {
    const is2v2 = Boolean(m.player_a2_id || m.player_b2_id) || m.match_type === '2v2' || m.mode === '2v2';
    const teamAIds = [m.player_a_id, is2v2 ? m.player_a2_id : null].filter(Boolean).map(Number);
    const teamBIds = [m.player_b_id, is2v2 ? m.player_b2_id : null].filter(Boolean).map(Number);

    const aWon = Number(m.score_a) > Number(m.score_b);

    for (const id of teamAIds) {
      const stats = playerStats.get(id);
      if (!stats) continue;
      stats.matches_played++;
      stats.mmr += (m.mmr_delta_a || 0);
      stats.points_scored += Number(m.score_a);
      stats.points_conceded += Number(m.score_b);
      if (aWon) {
        stats.wins++;
        stats.current_win_streak++;
        stats.current_loss_streak = 0;
      } else {
        stats.losses++;
        stats.current_loss_streak++;
        stats.current_win_streak = 0;
      }
    }

    for (const id of teamBIds) {
      const stats = playerStats.get(id);
      if (!stats) continue;
      stats.matches_played++;
      stats.mmr += (m.mmr_delta_b || 0);
      stats.points_scored += Number(m.score_b);
      stats.points_conceded += Number(m.score_a);
      if (!aWon) {
        stats.wins++;
        stats.current_win_streak++;
        stats.current_loss_streak = 0;
      } else {
        stats.losses++;
        stats.current_loss_streak++;
        stats.current_win_streak = 0;
      }
    }
  }

  const results = Array.from(playerStats.values()).sort((a, b) => b.mmr - a.mmr);
  const { bestDiffId, onFireId, badStreakId } = computeBadges(results);

  return results.map((p, i) => ({
    ...p,
    rank: i + 1,
    diff: p.points_scored - p.points_conceded,
    win_pct: p.wins + p.losses > 0 ? Math.round((p.wins / (p.wins + p.losses)) * 100) : 0,
    badges: {
      bestDiff: p.id === bestDiffId && p.matches_played > 0,
      onFire: p.id === onFireId,
      badStreak: p.id === badStreakId,
    },
  }));
}

async function getRankings(season) {
  // If season query is passed (e.g. 1 or 2), compute seasonal rankings dynamically
  if (season != null) {
    return await computeSeasonalRankings(season);
  }

  // Default to Season 2 (current active season)
  return await computeSeasonalRankings(2);
}

router.get('/', async (req, res) => {
  try {
    const season = req.query.season !== undefined ? Number(req.query.season) : null;
    res.json(await getRankings(season));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/all', async (req, res) => {
  const { data, error } = await supabase
    .from('players').select('*').order('mmr', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  try {
    const season = req.query.season !== undefined ? Number(req.query.season) : null;
    if (season != null) {
      const rankings = await computeSeasonalRankings(season);
      const player = rankings.find(p => Number(p.id) === Number(req.params.id));
      if (!player) return res.status(404).json({ error: 'Player not found' });
      return res.json(player);
    }
    const { data, error } = await supabase
      .from('players').select('*').eq('id', req.params.id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Player not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, department } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  const { data, error } = await supabase
    .from('players')
    .insert({ name: name.trim(), department: department?.trim() || null })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Player name already exists' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { name, department } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  const { data, error } = await supabase
    .from('players')
    .update({ name: name.trim(), department: department?.trim() || null })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Player name already exists' });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('players').update({ active: false }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

router.patch('/:id/reactivate', async (req, res) => {
  const { error } = await supabase
    .from('players').update({ active: true }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
module.exports.getRankings = getRankings;
