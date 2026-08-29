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

function calcTeamElo(teamA_mmrs, teamB_mmrs, aWins) {
  const avgA = (teamA_mmrs[0] + teamA_mmrs[1]) / 2;
  const avgB = (teamB_mmrs[0] + teamB_mmrs[1]) / 2;
  const exp = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
  const delta = Math.round(K * ((aWins ? 1 : 0) - exp));
  return {
    deltaA: delta,
    deltaB: -delta,
    teamAvgA: Math.round(avgA),
    teamAvgB: Math.round(avgB),
  };
}

function PlayerPickerButton({ player, onPick, label = 'Select player' }) {
  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        width: '100%',
        textAlign: 'center',
        padding: '8px 6px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px dashed var(--border)',
        borderRadius: 4,
        cursor: 'pointer',
        minHeight: 74,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Avatar name={player?.name ?? '?'} size={36} />
      <div className="disp" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.1 }}>
        {player ? player.name : label}
      </div>
      {player && (
        <div className="label-eyebrow" style={{ fontSize: 9, marginTop: 2, color: 'var(--text-3)' }}>
          {player.department} · {player.mmr} MMR
        </div>
      )}
    </button>
  );
}

function SinglesSlot({ player, score, setScore, isWinner, onPick }) {
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
  const [mode, setMode] = useState('1v1'); // '1v1' | '2v2'
  const [players, setPlayers] = useState([]);

  // 1v1 state
  const [playerAId, setPlayerAId] = useState(null);
  const [playerBId, setPlayerBId] = useState(null);

  // 2v2 state
  const [playerA1Id, setPlayerA1Id] = useState(null);
  const [playerA2Id, setPlayerA2Id] = useState(null);
  const [playerB1Id, setPlayerB1Id] = useState(null);
  const [playerB2Id, setPlayerB2Id] = useState(null);

  // Scores
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);

  // Picking slot identifier: 'a' | 'b' | 'a1' | 'a2' | 'b1' | 'b2' | null
  const [picking, setPicking] = useState(null);
  const [h2h, setH2h] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { api.getPlayers().then(setPlayers); }, []);

  // 1v1 H2H summary
  useEffect(() => {
    if (mode !== '1v1' || !playerAId || !playerBId || playerAId === playerBId) {
      setH2h(null);
      return;
    }
    api.getH2H(playerAId, playerBId).then(setH2h).catch(() => setH2h(null));
  }, [mode, playerAId, playerBId]);

  // Player lookups
  const playerA = players.find(p => p.id === playerAId);
  const playerB = players.find(p => p.id === playerBId);

  const playerA1 = players.find(p => p.id === playerA1Id);
  const playerA2 = players.find(p => p.id === playerA2Id);
  const playerB1 = players.find(p => p.id === playerB1Id);
  const playerB2 = players.find(p => p.id === playerB2Id);

  const tie = scoreA === scoreB;
  const aWon = scoreA > scoreB;

  // Validation
  const valid1v1 = mode === '1v1' && playerAId && playerBId && playerAId !== playerBId && !tie;
  const valid2v2 = mode === '2v2' &&
    playerA1Id && playerA2Id && playerB1Id && playerB2Id &&
    new Set([playerA1Id, playerA2Id, playerB1Id, playerB2Id]).size === 4 &&
    !tie;
  const valid = mode === '1v1' ? valid1v1 : valid2v2;

  // Live ELO preview calculation
  const elo1v1 = useMemo(() => {
    if (!playerA || !playerB || tie) return null;
    return calcElo(playerA.mmr, playerB.mmr, aWon);
  }, [playerA, playerB, scoreA, scoreB, tie, aWon]);

  const elo2v2 = useMemo(() => {
    if (!playerA1 || !playerA2 || !playerB1 || !playerB2 || tie) return null;
    return calcTeamElo([playerA1.mmr, playerA2.mmr], [playerB1.mmr, playerB2.mmr], aWon);
  }, [playerA1, playerA2, playerB1, playerB2, scoreA, scoreB, tie, aWon]);

  // Calculate exclude list for picker modal
  const getExcludeList = (slot) => {
    if (mode === '1v1') {
      return slot === 'a' ? [playerBId].filter(Boolean) : [playerAId].filter(Boolean);
    }
    const allSlots = { a1: playerA1Id, a2: playerA2Id, b1: playerB1Id, b2: playerB2Id };
    return Object.entries(allSlots)
      .filter(([k, v]) => k !== slot && Boolean(v))
      .map(([, v]) => v);
  };

  const handlePick = (id) => {
    if (picking === 'a') setPlayerAId(id);
    else if (picking === 'b') setPlayerBId(id);
    else if (picking === 'a1') setPlayerA1Id(id);
    else if (picking === 'a2') setPlayerA2Id(id);
    else if (picking === 'b1') setPlayerB1Id(id);
    else if (picking === 'b2') setPlayerB2Id(id);
    setPicking(null);
  };

  const handleSubmit = async () => {
    setError(null);
    if (tie) { setError('Ties are not allowed'); return; }

    if (mode === '1v1') {
      if (!playerAId || !playerBId) { setError('Select both players'); return; }
      if (playerAId === playerBId) { setError('Players must be different'); return; }
    } else {
      if (!playerA1Id || !playerA2Id || !playerB1Id || !playerB2Id) {
        setError('Select all 4 players for 2v2 match');
        return;
      }
      if (new Set([playerA1Id, playerA2Id, playerB1Id, playerB2Id]).size !== 4) {
        setError('All 4 players must be distinct');
        return;
      }
    }

    setSaving(true);
    try {
      if (mode === '1v1') {
        await api.createMatch({
          player_a_id: playerAId,
          player_b_id: playerBId,
          score_a: scoreA,
          score_b: scoreB,
          mode: '1v1',
        });
      } else {
        await api.createMatch({
          player_a_id: playerA1Id,
          player_a2_id: playerA2Id,
          player_b_id: playerB1Id,
          player_b2_id: playerB2Id,
          score_a: scoreA,
          score_b: scoreB,
          mode: '2v2',
        });
      }
      setSaved(true);
      setTimeout(() => navigate('/'), 1300);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setPlayerAId(null);
    setPlayerBId(null);
    setPlayerA1Id(null);
    setPlayerA2Id(null);
    setPlayerB1Id(null);
    setPlayerB2Id(null);
    setScoreA(0);
    setScoreB(0);
    setError(null);
    setSaved(false);
  };

  if (saved) {
    const winnerLabel = mode === '1v1'
      ? (aWon ? playerA?.name.split(' ')[0] : playerB?.name.split(' ')[0])
      : (aWon ? `${playerA1?.name.split(' ')[0]} & ${playerA2?.name.split(' ')[0]}` : `${playerB1?.name.split(' ')[0]} & ${playerB2?.name.split(' ')[0]}`);

    return (
      <div className="rise" style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 18, minHeight: '60vh' }}>
        <div className="label-eyebrow" style={{ color: 'var(--accent)' }}>● MATCH SAVED · {mode.toUpperCase()}</div>
        <div className="disp-ex" style={{ fontSize: mode === '1v1' ? 52 : 36, lineHeight: 0.95, textTransform: 'uppercase' }}>
          {winnerLabel}<br/>WINS
        </div>
        <div className="num" style={{ fontSize: 32, fontWeight: 600 }}>
          {scoreA} <span style={{ color: 'var(--text-3)' }}>—</span> {scoreB}
        </div>
        {mode === '1v1' && elo1v1 && (
          <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
            <div>
              <div className="label-eyebrow">{playerA?.name.split(' ')[0]}</div>
              <div style={{ marginTop: 4 }}><Delta value={elo1v1.deltaA} large /></div>
            </div>
            <div>
              <div className="label-eyebrow">{playerB?.name.split(' ')[0]}</div>
              <div style={{ marginTop: 4 }}><Delta value={elo1v1.deltaB} large /></div>
            </div>
          </div>
        )}
        {mode === '2v2' && elo2v2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 8, textAlign: 'left' }}>
            <div style={{ padding: '8px 12px', background: 'var(--surface)', borderRadius: 4, border: '1px solid var(--border)' }}>
              <div className="label-eyebrow" style={{ color: 'var(--accent)' }}>TEAM A ({elo2v2.teamAvgA} MMR)</div>
              <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span>{playerA1?.name.split(' ')[0]}</span>
                <Delta value={elo2v2.deltaA} />
              </div>
              <div style={{ marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                <span>{playerA2?.name.split(' ')[0]}</span>
                <Delta value={elo2v2.deltaA} />
              </div>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--surface)', borderRadius: 4, border: '1px solid var(--border)' }}>
              <div className="label-eyebrow">TEAM B ({elo2v2.teamAvgB} MMR)</div>
              <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span>{playerB1?.name.split(' ')[0]}</span>
                <Delta value={elo2v2.deltaB} />
              </div>
              <div style={{ marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                <span>{playerB2?.name.split(' ')[0]}</span>
                <Delta value={elo2v2.deltaB} />
              </div>
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
      <PageHeader
        eyebrow="NEW RECORD"
        title="Register match"
        right={
          <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}>
            <button
              type="button"
              onClick={() => { setMode('1v1'); }}
              className="label-eyebrow"
              style={{
                padding: '6px 10px',
                borderRadius: 3,
                background: mode === '1v1' ? 'var(--accent)' : 'transparent',
                color: mode === '1v1' ? '#0a0a0d' : 'var(--text-2)',
                border: 0,
                cursor: 'pointer',
                fontWeight: mode === '1v1' ? 700 : 500,
              }}
            >
              1V1 SINGLES
            </button>
            <button
              type="button"
              onClick={() => { setMode('2v2'); }}
              className="label-eyebrow"
              style={{
                padding: '6px 10px',
                borderRadius: 3,
                background: mode === '2v2' ? 'var(--accent)' : 'transparent',
                color: mode === '2v2' ? '#0a0a0d' : 'var(--text-2)',
                border: 0,
                cursor: 'pointer',
                fontWeight: mode === '2v2' ? 700 : 500,
              }}
            >
              2V2 DOUBLES
            </button>
          </div>
        }
      />

      <div className="scrollarea" style={{ flex: 1, padding: '14px 16px 20px' }}>
        {/* 1v1 MATCH FORM */}
        {mode === '1v1' && (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', position: 'relative' }}>
              <SinglesSlot player={playerA} score={scoreA} setScore={setScoreA} isWinner={aWon && !tie} onPick={() => setPicking('a')} />
              <div style={{ position: 'absolute', top: '36%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
                <div className="disp-ex" style={{ fontSize: 13, color: 'var(--text-3)', background: 'var(--bg)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 2 }}>VS</div>
              </div>
              <SinglesSlot player={playerB} score={scoreB} setScore={setScoreB} isWinner={!aWon && !tie} onPick={() => setPicking('b')} />
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
            {playerA && playerB && elo1v1 && (
              <div style={{ marginTop: 16 }}>
                <EloPreviewCard mode="1v1" a={playerA} b={playerB} deltaA={elo1v1.deltaA} deltaB={elo1v1.deltaB} />
              </div>
            )}
          </>
        )}

        {/* 2v2 MATCH FORM */}
        {mode === '2v2' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Team A */}
              <div style={{
                padding: '12px',
                borderRadius: 4,
                border: aWon && !tie ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: aWon && !tie ? 'linear-gradient(180deg, rgba(255,61,84,0.08), var(--surface))' : 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="label-eyebrow" style={{ color: 'var(--accent)' }}>TEAM A</div>
                  {elo2v2 && <div className="label-eyebrow" style={{ color: 'var(--text-3)' }}>AVG {elo2v2.teamAvgA}</div>}
                </div>
                <PlayerPickerButton player={playerA1} onPick={() => setPicking('a1')} label="Player A1" />
                <PlayerPickerButton player={playerA2} onPick={() => setPicking('a2')} label="Player A2" />
                <div style={{ marginTop: 4 }}>
                  <ScoreStepper value={scoreA} onChange={setScoreA} isWinner={aWon && !tie} />
                </div>
              </div>

              {/* Team B */}
              <div style={{
                padding: '12px',
                borderRadius: 4,
                border: !aWon && !tie ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: !aWon && !tie ? 'linear-gradient(180deg, rgba(255,61,84,0.08), var(--surface))' : 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="label-eyebrow" style={{ color: 'var(--text-2)' }}>TEAM B</div>
                  {elo2v2 && <div className="label-eyebrow" style={{ color: 'var(--text-3)' }}>AVG {elo2v2.teamAvgB}</div>}
                </div>
                <PlayerPickerButton player={playerB1} onPick={() => setPicking('b1')} label="Player B1" />
                <PlayerPickerButton player={playerB2} onPick={() => setPicking('b2')} label="Player B2" />
                <div style={{ marginTop: 4 }}>
                  <ScoreStepper value={scoreB} onChange={setScoreB} isWinner={!aWon && !tie} />
                </div>
              </div>
            </div>

            {/* Live 2v2 Elo Preview */}
            {playerA1 && playerA2 && playerB1 && playerB2 && elo2v2 && (
              <div style={{ marginTop: 14 }}>
                <EloPreviewCard
                  mode="2v2"
                  teamA={[playerA1, playerA2]}
                  teamB={[playerB1, playerB2]}
                  teamAvgA={elo2v2.teamAvgA}
                  teamAvgB={elo2v2.teamAvgB}
                  deltaA={elo2v2.deltaA}
                  deltaB={elo2v2.deltaB}
                />
              </div>
            )}
          </div>
        )}

        {/* Validation messages */}
        {tie && (scoreA > 0 || scoreB > 0) && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(251,113,133,0.08)', border: '1px solid var(--loss)', borderRadius: 4, color: 'var(--loss)', fontSize: 12.5 }}>
            ⚠ Ties aren't allowed. Adjust a score.
          </div>
        )}
        {mode === '1v1' && playerAId && playerBId && playerAId === playerBId && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(251,113,133,0.08)', border: '1px solid var(--loss)', borderRadius: 4, color: 'var(--loss)', fontSize: 12.5 }}>
            ⚠ Players must be different.
          </div>
        )}
        {mode === '2v2' && (playerA1Id || playerA2Id || playerB1Id || playerB2Id) &&
          new Set([playerA1Id, playerA2Id, playerB1Id, playerB2Id].filter(Boolean)).size !== [playerA1Id, playerA2Id, playerB1Id, playerB2Id].filter(Boolean).length && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(251,113,133,0.08)', border: '1px solid var(--loss)', borderRadius: 4, color: 'var(--loss)', fontSize: 12.5 }}>
            ⚠ Each player can only be selected once across both teams.
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
          {saving ? 'SAVING…' : `RECORD ${mode.toUpperCase()} MATCH`}
        </button>

        <button onClick={reset} style={{ marginTop: 10, width: '100%', padding: 10, color: 'var(--text-3)', fontSize: 12, background: 'none', border: 0, cursor: 'pointer' }}>
          Clear form
        </button>
      </div>

      {picking && (
        <PlayerPickerModal
          players={players}
          exclude={getExcludeList(picking)}
          onPick={handlePick}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}
