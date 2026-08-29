const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Players
  getPlayers: (params = {}) => {
    const opts = typeof params === 'object' && params !== null ? params : { season: params };
    const query = new URLSearchParams();
    if (opts.season != null) query.append('season', opts.season);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/players${qs}`);
  },
  getAllPlayers: () => request('/players/all'),
  getPlayer: (id) => request(`/players/${id}`),
  createPlayer: ({ name, department }) => request('/players', { method: 'POST', body: JSON.stringify({ name, department }) }),
  updatePlayer: (id, { name, department }) => request(`/players/${id}`, { method: 'PUT', body: JSON.stringify({ name, department }) }),
  deactivatePlayer: (id) => request(`/players/${id}`, { method: 'DELETE' }),
  reactivatePlayer: (id) => request(`/players/${id}/reactivate`, { method: 'PATCH' }),

  // Matches
  getMatches: (params = {}) => {
    const opts = typeof params === 'object' && params !== null ? params : { season: params };
    const query = new URLSearchParams();
    if (opts.season != null) query.append('season', opts.season);
    if (opts.type != null) query.append('type', opts.type);
    if (opts.mode != null) query.append('mode', opts.mode);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/matches${qs}`);
  },
  getPlayerMatches: (id, params = {}) => {
    const opts = typeof params === 'object' && params !== null ? params : { season: params };
    const query = new URLSearchParams();
    if (opts.season != null) query.append('season', opts.season);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/matches/player/${id}${qs}`);
  },
  getH2H: (id1, id2) => request(`/matches/h2h/${id1}/${id2}`),
  createMatch: (data) => request('/matches', { method: 'POST', body: JSON.stringify(data) }),
  deleteMatch: (id) => request(`/matches/${id}`, { method: 'DELETE' }),

  // Seasons
  getSeasons: () => request('/seasons'),
  getActiveSeason: () => request('/seasons/active'),
  resetSeason: (targetSeason = 2) => request('/seasons/reset', { method: 'POST', body: JSON.stringify({ targetSeason }) }),
};
