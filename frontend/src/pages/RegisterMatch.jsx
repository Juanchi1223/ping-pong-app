import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const K = 32;
function previewElo(mmrA, mmrB, aWins) {
  const expectedA = 1 / (1 + Math.pow(10, (mmrB - mmrA) / 400));
  const expectedB = 1 - expectedA;
  const actualA = aWins ? 1 : 0;
  const actualB = 1 - actualA;
  return {
    deltaA: Math.round(K * (actualA - expectedA)),
    deltaB: Math.round(K * (actualB - expectedB)),
  };
}

export default function RegisterMatch() {
  const [players, setPlayers] = useState([]);
  const [playerAId, setPlayerAId] = useState('');
  const [playerBId, setPlayerBId] = useState('');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.getPlayers().then(setPlayers);
  }, []);

  const playerA = players.find(p => p.id == playerAId);
  const playerB = players.find(p => p.id == playerBId);

  const preview = useMemo(() => {
    if (!playerA || !playerB || scoreA === '' || scoreB === '' || Number(scoreA) === Number(scoreB)) return null;
    return previewElo(playerA.mmr, playerB.mmr, Number(scoreA) > Number(scoreB));
  }, [playerA, playerB, scoreA, scoreB]);

  const winner = scoreA !== '' && scoreB !== '' && Number(scoreA) !== Number(scoreB)
    ? Number(scoreA) > Number(scoreB) ? 'a' : 'b'
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!playerAId || !playerBId) { setError('Select both players'); return; }
    if (playerAId === playerBId) { setError('Players must be different'); return; }
    if (scoreA === '' || scoreB === '') { setError('Enter both scores'); return; }
    if (Number(scoreA) === Number(scoreB)) { setError('Ties are not allowed'); return; }

    setSaving(true);
    try {
      await api.createMatch({ player_a_id: playerAId, player_b_id: playerBId, score_a: Number(scoreA), score_b: Number(scoreB) });
      setSaved(true);
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { setPlayerAId(''); setPlayerBId(''); setScoreA(''); setScoreB(''); setError(null); setSaved(false); };

  if (saved) {
    return (
      <div className="p-8 max-w-xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-5xl">🏆</div>
        <div className="font-display text-3xl text-accent tracking-wide">Match Saved!</div>
        <div className="text-white/40 text-sm font-body">Redirecting to rankings...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-white tracking-wide">New Match</h1>
        <p className="text-white/35 text-sm font-body mt-1">Register a match result and update MMR</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Player selectors */}
        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-end">
            {/* Player A */}
            <div>
              <label className="label">Player A</label>
              <div className="relative">
                <select
                  className="select pr-8"
                  value={playerAId}
                  onChange={e => setPlayerAId(e.target.value)}
                >
                  <option value="">Select player...</option>
                  {players.filter(p => p.id != playerBId).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.mmr})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
              {playerA && (
                <div className="mt-1.5 text-white/35 text-[11px] font-mono">MMR: {playerA.mmr}</div>
              )}
            </div>

            {/* VS */}
            <div className="vs-divider pb-6">VS</div>

            {/* Player B */}
            <div>
              <label className="label">Player B</label>
              <div className="relative">
                <select
                  className="select pr-8"
                  value={playerBId}
                  onChange={e => setPlayerBId(e.target.value)}
                >
                  <option value="">Select player...</option>
                  {players.filter(p => p.id != playerAId).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.mmr})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
              {playerB && (
                <div className="mt-1.5 text-white/35 text-[11px] font-mono">MMR: {playerB.mmr}</div>
              )}
            </div>
          </div>
        </div>

        {/* Score inputs */}
        <div className="card p-5">
          <label className="label mb-4 block">Score</label>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-6 items-center">
            <div className="flex flex-col items-center gap-2">
              {playerA && <div className="text-white/40 text-xs font-body truncate max-w-full">{playerA.name}</div>}
              <div className={`relative ${winner === 'a' ? 'after:absolute after:inset-0 after:rounded after:bg-accent/5' : ''}`}>
                <input
                  type="number"
                  min="0"
                  className={`score-input ${winner === 'a' ? 'border-b-accent' : ''}`}
                  style={{ borderBottomColor: winner === 'a' ? 'var(--accent)' : undefined }}
                  value={scoreA}
                  onChange={e => setScoreA(e.target.value)}
                  placeholder="0"
                />
              </div>
              {winner === 'a' && <WinLabel />}
            </div>

            <div className="vs-divider text-center">:</div>

            <div className="flex flex-col items-center gap-2">
              {playerB && <div className="text-white/40 text-xs font-body truncate max-w-full">{playerB.name}</div>}
              <input
                type="number"
                min="0"
                className={`score-input`}
                style={{ borderBottomColor: winner === 'b' ? 'var(--accent)' : undefined }}
                value={scoreB}
                onChange={e => setScoreB(e.target.value)}
                placeholder="0"
              />
              {winner === 'b' && <WinLabel />}
            </div>
          </div>

          {scoreA !== '' && scoreB !== '' && Number(scoreA) === Number(scoreB) && (
            <p className="text-center text-fire text-xs font-mono mt-3">Ties are not allowed</p>
          )}
        </div>

        {/* ELO Preview */}
        {preview && playerA && playerB && (
          <div className="card p-4 border-accent/10 bg-accent/[0.03]">
            <div className="text-white/30 text-[10px] font-mono uppercase tracking-widest mb-3">MMR Preview</div>
            <div className="grid grid-cols-2 gap-4">
              <EloPreviewCard name={playerA.name} mmr={playerA.mmr} delta={preview.deltaA} />
              <EloPreviewCard name={playerB.name} mmr={playerB.mmr} delta={preview.deltaB} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card p-3 border-loss/20 bg-loss/[0.05]">
            <p className="text-loss text-xs font-mono">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button type="button" onClick={reset} className="btn-ghost px-5">Reset</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 text-base">
            {saving ? 'Saving...' : 'Save Match'}
          </button>
        </div>
      </form>
    </div>
  );
}

function EloPreviewCard({ name, mmr, delta }) {
  const isPos = delta > 0;
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-white/60 text-xs font-body truncate">{name}</div>
        <div className="mmr-display text-white/80 text-sm">{mmr} → {mmr + delta}</div>
      </div>
      <div className={`font-mono text-sm font-bold ${isPos ? 'text-accent' : 'text-loss'}`}>
        {isPos ? '+' : ''}{delta}
      </div>
    </div>
  );
}

function WinLabel() {
  return (
    <span className="text-[10px] font-mono text-accent uppercase tracking-widest border border-accent/25 bg-accent/10 px-2 py-0.5 rounded">
      Winner
    </span>
  );
}

function ChevronDown({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
