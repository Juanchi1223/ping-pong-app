const express = require('express');
const router = express.Router();
const { db } = require('../db');

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
  const players = await db('players').where({ active: 1 }).orderBy('mmr', 'desc');
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

// GET all active players with ranking badges
router.get('/', async (req, res) => {
  try {
    res.json(await getRankings());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all players including inactive (for selectors)
router.get('/all', async (req, res) => {
  try {
    const players = await db('players').orderBy('mmr', 'desc');
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single player
router.get('/:id', async (req, res) => {
  try {
    const player = await db('players').where({ id: req.params.id }).first();
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create player
router.post('/', async (req, res) => {
  const { name, department } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  try {
    const [id] = await db('players').insert({
      name: name.trim(),
      department: department?.trim() || null,
    });
    const player = await db('players').where({ id }).first();
    res.status(201).json(player);

    try {
      req.app.get('io').emit('ranking:update', await getRankings());
    } catch (emitErr) {
      console.error('[ws] ranking:update emit failed:', emitErr.message);
    }
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Player name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT update player
router.put('/:id', async (req, res) => {
  const { name, department } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  try {
    await db('players').where({ id: req.params.id }).update({
      name: name.trim(),
      department: department?.trim() || null,
    });
    const player = await db('players').where({ id: req.params.id }).first();
    res.json(player);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Player name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE (soft delete) player
router.delete('/:id', async (req, res) => {
  try {
    await db('players').where({ id: req.params.id }).update({ active: 0 });
    res.json({ success: true });

    try {
      req.app.get('io').emit('ranking:update', await getRankings());
    } catch (emitErr) {
      console.error('[ws] ranking:update emit failed:', emitErr.message);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH reactivate player
router.patch('/:id/reactivate', async (req, res) => {
  try {
    await db('players').where({ id: req.params.id }).update({ active: 1 });
    res.json({ success: true });

    try {
      req.app.get('io').emit('ranking:update', await getRankings());
    } catch (emitErr) {
      console.error('[ws] ranking:update emit failed:', emitErr.message);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
