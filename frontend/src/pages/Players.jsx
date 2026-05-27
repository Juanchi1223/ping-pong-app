import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import Avatar from '../components/common/Avatar';
import Toggle from '../components/common/Toggle';
import { Icons } from '../components/common/Icons';
import { PageLoader } from '../components/common/Loader';

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

  const handleDeactivate = async (id) => { await api.deactivatePlayer(id); load(); };
  const handleReactivate = async (id) => { await api.reactivatePlayer(id); load(); };
  const handleSaved = () => { setShowModal(false); setEditPlayer(null); load(); };

  if (loading) return <PageLoader />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        eyebrow="ROSTER"
        title="Players"
        sub={`${active.length} active · ${inactive.length} inactive`}
        right={
          <button
            onClick={() => { setEditPlayer(null); setShowModal(true); }}
            className="btn-primary"
            style={{ fontSize: 12 }}
          >
            <Icons.plus /> ADD
          </button>
        }
      />

      <div className="scrollarea" style={{ flex: 1, padding: '14px 16px 20px' }}>
        <Toggle
          checked={showInactive}
          onChange={setShowInactive}
          label="SHOW INACTIVE"
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12 }}>
          {displayed.map((p, i) => {
            const diff = (p.points_scored ?? 0) - (p.points_conceded ?? 0);
            const wp = p.wins + p.losses > 0 ? Math.round(p.wins / (p.wins + p.losses) * 100) : 0;

            return (
              <div
                key={p.id}
                className="card-row table-row-anim"
                style={{
                  padding: '10px 12px', borderRadius: 4,
                  display: 'grid', gridTemplateColumns: 'auto 1fr auto auto',
                  gap: 10, alignItems: 'center',
                  opacity: p.active ? 1 : 0.5,
                  animationDelay: `${i * 30}ms`,
                }}
              >
                <Avatar name={p.name} size={32} />
                <div style={{ minWidth: 0 }}>
                  <div className="disp" style={{ fontSize: 14, lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.active
                      ? <Link to={`/players/${p.id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>{p.name}</Link>
                      : <span>{p.name}</span>}
                    {!p.active && (
                      <span className="label-eyebrow" style={{ fontSize: 8, color: 'var(--loss)', marginLeft: 4 }}>INACTIVE</span>
                    )}
                  </div>
                  <div className="label-eyebrow" style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 1 }}>
                    {p.department} · {p.mmr} MMR · {p.wins}–{p.losses} · {wp}% · diff {diff >= 0 ? '+' : ''}{diff}
                  </div>
                </div>
                {p.active && (
                  <button
                    onClick={() => { setEditPlayer(p); setShowModal(true); }}
                    style={{ color: 'var(--text-2)', padding: 6, background: 'none', border: 0, cursor: 'pointer' }}
                  >
                    <Icons.edit />
                  </button>
                )}
                <button
                  onClick={() => p.active ? handleDeactivate(p.id) : handleReactivate(p.id)}
                  style={{ color: p.active ? 'var(--text-3)' : 'var(--win)', padding: 6, background: 'none', border: 0, cursor: 'pointer' }}
                >
                  {p.active ? <Icons.trash /> : <Icons.plus />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditPlayer(null); }} title={editPlayer ? 'Edit player' : 'New player'}>
        <PlayerForm
          player={editPlayer}
          onClose={() => { setShowModal(false); setEditPlayer(null); }}
          onSaved={handleSaved}
        />
      </Modal>
    </div>
  );
}

function PlayerForm({ player, onClose, onSaved }) {
  const [name, setName] = useState(player?.name ?? '');
  const [department, setDepartment] = useState(player?.department ?? '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      if (player) {
        await api.updatePlayer(player.id, { name, department });
      } else {
        await api.createPlayer({ name, department });
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div className="label">NAME *</div>
        <input
          className="input"
          value={name}
          onChange={e => { setName(e.target.value); setError(null); }}
          placeholder="e.g. Carmen Wu"
          autoFocus
        />
      </div>
      <div>
        <div className="label">DEPARTMENT</div>
        <input
          className="input"
          value={department}
          onChange={e => { setDepartment(e.target.value); }}
          placeholder="Optional"
        />
      </div>
      {error && <div style={{ color: 'var(--loss)', fontSize: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>CANCEL</button>
        <button type="submit" disabled={!name.trim() || saving} className="btn-primary" style={{ flex: 2 }}>
          {saving ? 'SAVING…' : player ? 'SAVE CHANGES' : 'ADD PLAYER'}
        </button>
      </div>
    </form>
  );
}
