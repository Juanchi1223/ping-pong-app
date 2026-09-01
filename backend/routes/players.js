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

async function getActiveSeason() {
  try {
    const { data: seasons, error } = await supabase
      .from('seasons')
      .select('*')
      .order('id', { ascending: false });

    if (!error && seasons && seasons.length > 0) {
      const active = seasons.find(s => s.status === 'active' || s.active === true);
      if (active) return active;
    }
  } catch (err) {
    // Fallback below
  }
  return { id: 2, name: 'Season 2', status: 'active', active: true, baseline_mmr: 1200 };
}

async function getActiveSeasonId() {
  const active = await getActiveSeason();
  return Number(active.id) || 2;
}

async function computeSeasonalRankings(season) {
  let targetSeason = season != null ? Number(season) : null;
  if (targetSeason == null) {
    targetSeason = await getActiveSeasonId();
  }

  // Get baseline MMR for the target season
  let baseline = 1200;
  try {
    const { data: sRow } = await supabase.from('seasons').select('*').eq('id', targetSeason).maybeSingle();
    if (sRow && sRow.baseline_mmr != null) {
      baseline = Number(sRow.baseline_mmr);
    }
  } catch (e) {
    baseline = 1200;
  }

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
  for (const p of (players || [])) {
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

async function syncActiveSeasonStats() {
  const activeSeasonId = await getActiveSeasonId();
  const rankings = await computeSeasonalRankings(activeSeasonId);
  for (const p of rankings) {
    await supabase.from('players').update({
      mmr: p.mmr,
      wins: p.wins,
      losses: p.losses,
      points_scored: p.points_scored,
      points_conceded: p.points_conceded,
      current_win_streak: p.current_win_streak,
      current_loss_streak: p.current_loss_streak,
    }).eq('id', p.id);
  }
}

async function getRankings(season) {
  if (season != null) {
    return await computeSeasonalRankings(season);
  }
  const activeSeasonId = await getActiveSeasonId();
  return await computeSeasonalRankings(activeSeasonId);
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
  try {
    const { data, error } = await supabase
      .from('players').select('*').order('name', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const isSeasonAll = req.query.season === 'all';
    if (isSeasonAll) {
      const { data, error } = await supabase
        .from('players').select('*').eq('id', req.params.id).maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'Player not found' });
      return res.json(data);
    }

    const targetSeason = req.query.season !== undefined
      ? Number(req.query.season)
      : await getActiveSeasonId();

    const rankings = await computeSeasonalRankings(targetSeason);
    const player = rankings.find(p => Number(p.id) === Number(req.params.id));
    if (!player) {
      // Check if player exists in players table (e.g. inactive)
      const { data: rawPlayer } = await supabase.from('players').select('*').eq('id', req.params.id).maybeSingle();
      if (!rawPlayer) return res.status(404).json({ error: 'Player not found' });
      return res.json(rawPlayer);
    }
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, department } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  const activeSeason = await getActiveSeason();
  const baseline_mmr = activeSeason.baseline_mmr || 1200;

  const { data, error } = await supabase
    .from('players')
    .insert({
      name: name.trim(),
      department: department?.trim() || null,
      mmr: baseline_mmr,
      wins: 0,
      losses: 0,
      points_scored: 0,
      points_conceded: 0,
      current_win_streak: 0,
      current_loss_streak: 0,
    })
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
module.exports.getActiveSeason = getActiveSeason;
module.exports.getActiveSeasonId = getActiveSeasonId;
module.exports.computeSeasonalRankings = computeSeasonalRankings;
module.exports.syncActiveSeasonStats = syncActiveSeasonStats;

