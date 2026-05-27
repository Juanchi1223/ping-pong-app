import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import PageHeader from '../components/ui/PageHeader';
import ScoreStepper from '../components/ui/ScoreStepper';
import EloPreviewCard from '../components/ui/EloPreviewCard';
import PlayerPickerModal from '../components/ui/PlayerPickerModal';
import Avatar from '../components/common/Avatar';
import Delta from '../components/common/Delta';
import H2HBar from '../components/ui/H2HBar';

const K = 32;
function calcElo(mmrA, mmrB, aWins) {
  const exp = 1 / (1 + Math.pow(10, (mmrB - mmrA) / 400));
  const delta = Math.round(K * ((aWins ? 1 : 0) - exp));
  return { deltaA: delta, deltaB: -delta };
}

function MatchSlot({ player, score, setScore, isWinner, onPick }) {
  return (
    <div className="card-row" style={{
      flex: 1, padding: '12px 12px 14px', borderRadius: 4,
      border: isWinner ? '1px solid var(--accent)' : '1px solid var(--border)',
      background: isWinner ? 'linear-gradient(180deg, rgba(255,61,84,0.08), var(--surface))' : 'var(--surface)',
      position: 'relative',
    }}>
      <button onClick={onPick} style={{ width: '100%', textAlign: 'center', padding: 0, background: 'none', border: 0, cursor: 'pointer' }}>
        <Avatar name={player?.name ?? '?'} size={48} />
        <div className="disp" style={{ fontSize: 15, marginTop: 8, lineHeight: 1.1 }}>
          {player ? player.name : 'Select player'}
        </div>
        {player && (
          <div className="label-eyebrow" style={{ fontSize: 9, marginTop: 2, color: 'var(--text-3)' }}>
            {player.department} · {player.mmr} MMR
          </div>
        )}
      </button>
      <ScoreStepper value={score} onChange={setScore} isWinner={isWinner} />
    </div>
  );
}

export default function RegisterMatch() {
  const [players, setPlayers] = useState([]);
  const [playerAId, setPlayerAId] = useState(null);
  const [playerBId, setPlayerBId] = useState(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [picking, setPicking] = useState(null);
  const [h2h, setH2h] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { api.getPlayers().then(setPlayers); }, []);

  useEffect(() => {
    if (!playerAId || !playerBId || playerAId === playerBId) { setH2h(null); return; }
    api.getH2H(playerAId, playerBId).then(setH2h).catch(() => setH2h(null));
  }, [playerAId, playerBId]);

  const playerA = players.find(p => p.id === playerAId);
  const playerB = players.find(p => p.id === playerBId);
  const tie = scoreA === scoreB;
  const aWon = scoreA > scoreB;
  const valid = playerAId && playerBId && playerAId !== playerBId && !tie;

  const elo = useMemo(() => {
    if (!playerA || !playerB || tie) return null;
    return calcElo(playerA.mmr, playerB.mmr, aWon);
  }, [playerA, playerB, scoreA, scoreB]);

  const handleSubmit = async () => {
    setError(null);
    if (!playerAId || !playerBId) { setError('Select both players'); return; }
    if (playerAId === playerBId) { setError('Players must be different'); return; }
    if (tie) { setError('Ties are not allowed'); return; }
    setSaving(true);
    try {
      await api.createMatch({ player_a_id: playerAId, player_b_id: playerBId, score_a: scoreA, score_b: scoreB });
      setSaved(true);
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { setPlayerAId(null); setPlayerBId(null); setScoreA(0); setScoreB(0); setError(null); setSaved(false); };

  if (saved) {
    return (
      <div className="rise" style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 18, minHeight: '60vh' }}>
        <div className="label-eyebrow" style={{ color: 'var(--accent)' }}>● MATCH SAVED</div>
        <div className="disp-ex" style={{ fontSize: 52, lineHeight: 0.9, textTransform: 'uppercase' }}>
          {aWon ? playerA?.name.split(' ')[0] : playerB?.name.split(' ')[0]}<br/>WINS
        </div>
        <div className="num" style={{ fontSize: 32, fontWeight: 600 }}>
          {scoreA} <span style={{ color: 'var(--text-3)' }}>—</span> {scoreB}
        </div>
        {elo && (
          <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
            <div>
              <div className="label-eyebrow">{playerA?.name.split(' ')[0]}</div>
              <div style={{ marginTop: 4 }}><Delta value={elo.deltaA} large /></div>
            </div>
            <div>
              <div className="label-eyebrow">{playerB?.name.split(' ')[0]}</div>
              <div style={{ marginTop: 4 }}><Delta value={elo.deltaB} large /></div>
            </div>
          </div>
        )}
        <button className="btn-primary pressable" onClick={() => navigate('/')} style={{ marginTop: 12 }}>
          VIEW RANKINGS
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <PageHeader eyebrow="NEW RECORD" title="Register match" />

      <div className="scrollarea" style={{ flex: 1, padding: '14px 16px 20px' }}>
        {/* Match slots */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', position: 'relative' }}>
          <MatchSlot player={playerA} score={scoreA} setScore={setScoreA} isWinner={aWon && !tie} onPick={() => setPicking('a')} />
          <div style={{ position: 'absolute', top: '36%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
            <div className="disp-ex" style={{ fontSize: 13, color: 'var(--text-3)', background: 'var(--bg)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 2 }}>VS</div>
          </div>
          <MatchSlot player={playerB} score={scoreB} setScore={setScoreB} isWinner={!aWon && !tie} onPick={() => setPicking('b')} />
        </div>

        {/* H2H summary */}
        {h2h && (h2h.p1wins + h2h.p2wins) > 0 && (
          <div style={{ marginTop: 16 }}>
            <H2HBar
              w1={h2h.p1wins}
              w2={h2h.p2wins}
              label1={playerA?.name.split(' ')[0] ?? ''}
              label2={playerB?.name.split(' ')[0] ?? ''}
              pts1={h2h.p1PointsScored}
              pts2={h2h.p2PointsScored}
            />
          </div>
        )}

        {/* ELO preview */}
        {playerA && playerB && elo && (
          <div style={{ marginTop: 16 }}>
            <EloPreviewCard a={playerA} b={playerB} deltaA={elo.deltaA} deltaB={elo.deltaB} />
          </div>
        )}

        {/* Validation messages */}
        {tie && scoreA > 0 && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(251,113,133,0.08)', border: '1px solid var(--loss)', borderRadius: 4, color: 'var(--loss)', fontSize: 12.5 }}>
            ⚠ Ties aren't allowed. Adjust a score.
          </div>
        )}
        {playerAId && playerBId && playerAId === playerBId && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(251,113,133,0.08)', border: '1px solid var(--loss)', borderRadius: 4, color: 'var(--loss)', fontSize: 12.5 }}>
            ⚠ Players must be different.
          </div>
        )}
        {error && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(251,113,133,0.08)', border: '1px solid var(--loss)', borderRadius: 4, color: 'var(--loss)', fontSize: 12.5 }}>
            ⚠ {error}
          </div>
        )}

        <button
          disabled={!valid || saving}
          onClick={handleSubmit}
          className="btn-primary pressable"
          style={{ marginTop: 16, width: '100%', height: 52, fontSize: 18, letterSpacing: '0.14em' }}
        >
          {saving ? 'SAVING…' : 'RECORD MATCH'}
        </button>

        <button onClick={reset} style={{ marginTop: 10, width: '100%', padding: 10, color: 'var(--text-3)', fontSize: 12, background: 'none', border: 0, cursor: 'pointer' }}>
          Clear form
        </button>
      </div>

      {picking && (
        <PlayerPickerModal
          players={players}
          exclude={picking === 'a' ? playerBId : playerAId}
          onPick={id => { picking === 'a' ? setPlayerAId(id) : setPlayerBId(id); setPicking(null); }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}
