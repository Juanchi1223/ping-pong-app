import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const load = () => {
    api.getAllPlayers()
      .then(setPlayers)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const active = players.filter(p => p.active);
  const inactive = players.filter(p => !p.active);
  const displayed = showInactive ? players : active;

  const handleDeactivate = async (id) => {
    await api.deactivatePlayer(id);
    load();
  };

  const handleReactivate = async (id) => {
    await api.reactivatePlayer(id);
    load();
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditPlayer(null);
    load();
  };

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8 gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl md:text-4xl text-white tracking-wide">Players</h1>
          <p className="text-white/35 text-sm font-body mt-1">
            {active.length} active{inactive.length > 0 ? ` · ${inactive.length} inactive` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {inactive.length > 0 && (
            <button
              onClick={() => setShowInactive(v => !v)}
              className="btn-ghost text-xs hidden sm:inline-flex"
            >
              {showInactive ? 'Hide' : 'Show'} inactive
            </button>
          )}
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
            <span className="sm:hidden">+ Add</span>
            <span className="hidden sm:inline">+ Add Player</span>
          </button>
        </div>
      </div>

      {/* Players list */}
      {displayed.length === 0 ? (
        <div className="card py-16 flex flex-col items-center gap-3">
          <div className="text-4xl opacity-30">👤</div>
          <div className="text-white/30 font-body text-sm">No players yet. Add the first one!</div>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((player, i) => (
            <div
              key={player.id}
              className={`card-raised px-4 md:px-5 py-3 md:py-4 flex items-center gap-3 md:gap-4 table-row-anim ${!player.active ? 'opacity-40' : ''}`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {/* MMR */}
              <div className="w-16 text-right flex-shrink-0">
                <div className="mmr-display text-white/80 text-sm">{player.mmr}</div>
                <div className="text-white/25 text-[10px] font-mono">MMR</div>
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-white/[0.06]" />

              {/* Name & stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {player.active ? (
                    <Link to={`/players/${player.id}`} className="font-body font-medium text-white/90 hover:text-accent transition-colors truncate">
                      {player.name}
                    </Link>
                  ) : (
                    <span className="font-body font-medium text-white/50 truncate">{player.name}</span>
                  )}
                  {!player.active && (
                    <span className="text-[10px] font-mono text-white/25 border border-white/10 px-1.5 py-0.5 rounded">inactive</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs font-mono text-accent/60">{player.wins}W</span>
                  <span className="text-xs font-mono text-loss/60">{player.losses}L</span>
                  <span className="text-xs font-mono text-white/25">
                    {player.wins + player.losses > 0
                      ? `${Math.round((player.wins / (player.wins + player.losses)) * 100)}%`
                      : '—'}
                  </span>
                  <span className={`hidden sm:inline text-xs font-mono ${(player.points_scored - player.points_conceded) >= 0 ? 'text-white/30' : 'text-loss/40'}`}>
                    diff {player.points_scored - player.points_conceded >= 0 ? '+' : ''}{player.points_scored - player.points_conceded}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {player.active && (
                  <>
                    <button
                      onClick={() => { setEditPlayer(player); setShowModal(true); }}
                      className="btn-ghost text-xs px-3 py-1.5"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeactivate(player.id)}
                      className="btn-danger"
                    >
                      Deactivate
                    </button>
                  </>
                )}
                {!player.active && (
                  <button
                    onClick={() => handleReactivate(player.id)}
                    className="btn-ghost text-xs px-3 py-1.5"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PlayerModal
          player={editPlayer}
          onClose={() => { setShowModal(false); setEditPlayer(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function PlayerModal({ player, onClose, onSaved }) {
  const [name, setName] = useState(player?.name || '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      if (player) {
        await api.updatePlayer(player.id, name);
      } else {
        await api.createPlayer(name);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="modal-content card-raised w-full max-w-sm p-6">
        <h2 className="font-display text-2xl text-white tracking-wide mb-5">
          {player ? 'Edit Player' : 'Add Player'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Player Name</label>
            <input
              className="input"
              value={name}
              onChange={e => { setName(e.target.value); setError(null); }}
              placeholder="Enter name..."
              autoFocus
            />
            {error && <p className="text-loss text-xs font-mono mt-1.5">{error}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : player ? 'Save Changes' : 'Add Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="h-8 w-32 bg-white/[0.06] rounded animate-pulse mb-8" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white/[0.04] rounded-xl animate-pulse" />)}
      </div>
    </div>
  );
}
