const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { calculateElo } = require('../elo');

function withNames(query) {
  return query
    .join('players as pa', 'matches.player_a_id', 'pa.id')
    .join('players as pb', 'matches.player_b_id', 'pb.id')
    .select(
      'matches.*',
      'pa.name as player_a_name',
      'pb.name as player_b_name'
    );
}

// GET all matches
router.get('/', async (req, res) => {
  try {
    const matches = await withNames(db('matches')).orderBy('matches.played_at', 'desc');
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET matches for a specific player
router.get('/player/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const matches = await withNames(db('matches'))
      .where('matches.player_a_id', id)
      .orWhere('matches.player_b_id', id)
      .orderBy('matches.played_at', 'desc');
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET head-to-head between two players
router.get('/h2h/:id1/:id2', async (req, res) => {
  try {
    const { id1, id2 } = req.params;

    const matches = await withNames(db('matches'))
      .where(function () {
        this.where('matches.player_a_id', id1).andWhere('matches.player_b_id', id2);
      })
      .orWhere(function () {
        this.where('matches.player_a_id', id2).andWhere('matches.player_b_id', id1);
      })
      .orderBy('matches.played_at', 'desc');

    const p1wins = matches.filter(m =>
      (m.player_a_id == id1 && m.score_a > m.score_b) ||
      (m.player_b_id == id1 && m.score_b > m.score_a)
    ).length;

    const p2wins = matches.length - p1wins;

    const p1PointsScored = matches.reduce((acc, m) =>
      acc + (m.player_a_id == id1 ? m.score_a : m.score_b), 0);
    const p2PointsScored = matches.reduce((acc, m) =>
      acc + (m.player_a_id == id2 ? m.score_a : m.score_b), 0);

    const [player1, player2] = await Promise.all([
      db('players').where({ id: id1 }).first(),
      db('players').where({ id: id2 }).first(),
    ]);

    res.json({ matches, p1wins, p2wins, p1PointsScored, p2PointsScored, player1, player2 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST register a match
router.post('/', async (req, res) => {
  const { player_a_id, player_b_id, score_a, score_b } = req.body;

  if (!player_a_id || !player_b_id) return res.status(400).json({ error: 'Both players are required' });
  if (Number(player_a_id) === Number(player_b_id)) return res.status(400).json({ error: 'Players must be different' });
  if (score_a == null || score_b == null) return res.status(400).json({ error: 'Scores are required' });
  if (Number(score_a) === Number(score_b)) return res.status(400).json({ error: 'Ties are not allowed' });
  if (Number(score_a) < 0 || Number(score_b) < 0) return res.status(400).json({ error: 'Scores must be non-negative' });

  try {
    const [playerA, playerB] = await Promise.all([
      db('players').where({ id: player_a_id, active: 1 }).first(),
      db('players').where({ id: player_b_id, active: 1 }).first(),
    ]);

    if (!playerA || !playerB) return res.status(404).json({ error: 'Player not found or inactive' });

    const { deltaA, deltaB } = calculateElo(playerA.mmr, playerB.mmr, Number(score_a), Number(score_b));
    const aWon = Number(score_a) > Number(score_b);

    const matchId = await db.transaction(async (trx) => {
      const [id] = await trx('matches').insert({
        player_a_id, player_b_id,
        score_a: Number(score_a), score_b: Number(score_b),
        mmr_delta_a: deltaA, mmr_delta_b: deltaB,
      });

      await trx('players').where({ id: player_a_id }).update({
        mmr: playerA.mmr + deltaA,
        wins: playerA.wins + (aWon ? 1 : 0),
        losses: playerA.losses + (aWon ? 0 : 1),
        points_scored: playerA.points_scored + Number(score_a),
        points_conceded: playerA.points_conceded + Number(score_b),
        current_win_streak: aWon ? playerA.current_win_streak + 1 : 0,
        current_loss_streak: aWon ? 0 : playerA.current_loss_streak + 1,
      });

      await trx('players').where({ id: player_b_id }).update({
        mmr: playerB.mmr + deltaB,
        wins: playerB.wins + (aWon ? 0 : 1),
        losses: playerB.losses + (aWon ? 1 : 0),
        points_scored: playerB.points_scored + Number(score_b),
        points_conceded: playerB.points_conceded + Number(score_a),
        current_win_streak: aWon ? 0 : playerB.current_win_streak + 1,
        current_loss_streak: aWon ? playerB.current_loss_streak + 1 : 0,
      });

      return id;
    });

    const match = await withNames(db('matches')).where('matches.id', matchId).first();
    res.status(201).json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a match and reverse all player stats
router.delete('/:id', async (req, res) => {
  try {
    const match = await db('matches').where({ id: req.params.id }).first();
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const [playerA, playerB] = await Promise.all([
      db('players').where({ id: match.player_a_id }).first(),
      db('players').where({ id: match.player_b_id }).first(),
    ]);

    const aWon = match.score_a > match.score_b;

    await db.transaction(async (trx) => {
      await trx('matches').where({ id: req.params.id }).delete();

      await trx('players').where({ id: match.player_a_id }).update({
        mmr: playerA.mmr - match.mmr_delta_a,
        wins: playerA.wins - (aWon ? 1 : 0),
        losses: playerA.losses - (aWon ? 0 : 1),
        points_scored: playerA.points_scored - match.score_a,
        points_conceded: playerA.points_conceded - match.score_b,
      });

      await trx('players').where({ id: match.player_b_id }).update({
        mmr: playerB.mmr - match.mmr_delta_b,
        wins: playerB.wins - (aWon ? 0 : 1),
        losses: playerB.losses - (aWon ? 1 : 0),
        points_scored: playerB.points_scored - match.score_b,
        points_conceded: playerB.points_conceded - match.score_a,
      });

      // Recalculate streaks for both players from remaining matches
      const [streakA, streakB] = await Promise.all([
        recalculateStreak(trx, match.player_a_id),
        recalculateStreak(trx, match.player_b_id),
      ]);

      await trx('players').where({ id: match.player_a_id }).update(streakA);
      await trx('players').where({ id: match.player_b_id }).update(streakB);
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function recalculateStreak(trx, playerId) {
  const matches = await trx('matches')
    .where(function () { this.where('player_a_id', playerId).orWhere('player_b_id', playerId); })
    .orderBy('played_at', 'desc');

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
