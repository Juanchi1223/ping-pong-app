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
  getPlayers: () => request('/players'),
  getAllPlayers: () => request('/players/all'),
  getPlayer: (id) => request(`/players/${id}`),
  createPlayer: ({ name, department }) => request('/players', { method: 'POST', body: JSON.stringify({ name, department }) }),
  updatePlayer: (id, { name, department }) => request(`/players/${id}`, { method: 'PUT', body: JSON.stringify({ name, department }) }),
  deactivatePlayer: (id) => request(`/players/${id}`, { method: 'DELETE' }),
  reactivatePlayer: (id) => request(`/players/${id}/reactivate`, { method: 'PATCH' }),

  // Matches
  getMatches: () => request('/matches'),
  getPlayerMatches: (id) => request(`/matches/player/${id}`),
  getH2H: (id1, id2) => request(`/matches/h2h/${id1}/${id2}`),
  createMatch: (data) => request('/matches', { method: 'POST', body: JSON.stringify(data) }),
  deleteMatch: (id) => request(`/matches/${id}`, { method: 'DELETE' }),
};
