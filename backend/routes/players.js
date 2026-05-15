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

async function getRankings() {
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .eq('active', true)
    .order('mmr', { ascending: false });
  if (error) throw new Error(error.message);

  const { bestDiffId, onFireId, badStreakId } = computeBadges(players);
  return players.map((p, i) => ({
    ...p,
    rank: i + 1,
    diff: p.points_scored - p.points_conceded,
    win_pct: p.wins + p.losses > 0 ? Math.round((p.wins / (p.wins + p.losses)) * 100) : 0,
    badges: {
      bestDiff: p.id === bestDiffId,
      onFire: p.id === onFireId,
      badStreak: p.id === badStreakId,
    },
  }));
}

router.get('/', async (req, res) => {
  try { res.json(await getRankings()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/all', async (req, res) => {
  const { data, error } = await supabase
    .from('players').select('*').order('mmr', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('players').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Player not found' });
  res.json(data);
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
