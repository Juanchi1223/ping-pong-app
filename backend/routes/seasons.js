const express = require('express');
const router = express.Router();
const { supabase } = require('../db');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw new Error(error.message);

    const seasons = (data && data.length > 0) ? data : [
      { id: 2, name: 'Season 2', status: 'active', active: true, baseline_mmr: 1200, is_current: true },
      { id: 1, name: 'Season 1', status: 'archived', active: false, baseline_mmr: 1200, is_current: false },
    ];

    res.json(seasons.map(s => ({
      ...s,
      active: s.status === 'active' || s.active === true,
      status: s.status || (s.active ? 'active' : 'archived'),
      is_current: s.status === 'active' || s.active === true || s.id === 2,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/active', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw new Error(error.message);

    const seasons = (data && data.length > 0) ? data : [
      { id: 2, name: 'Season 2', status: 'active', active: true, baseline_mmr: 1200, is_current: true },
      { id: 1, name: 'Season 1', status: 'archived', active: false, baseline_mmr: 1200, is_current: false },
    ];

    const activeSeason = seasons.find(s => s.status === 'active' || s.active === true) || seasons[0];
    res.json({
      ...activeSeason,
      active: true,
      status: 'active',
      is_current: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset', async (req, res) => {
  try {
    const season = Number(req.body.season || req.body.targetSeason || 2);
    const baseline_mmr = Number(req.body.baseline_mmr || 1200);
    // Archive previous seasons and set target season as active
    await supabase.from('seasons').update({ status: 'archived', active: false }).neq('id', season);
    await supabase.from('seasons').update({ status: 'active', active: true, baseline_mmr }).eq('id', season);

    res.json({ success: true, activeSeason: season, baseline_mmr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
