import { Link } from 'react-router-dom';
import Delta from '../common/Delta';
import { Icons } from '../common/Icons';

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MatchRow({ match: m, perspectiveId, mode = 'history', onDelete, onOpenPlayer, deletingId }) {
  if (!m) return null;
  const is2v2 = Boolean(m.player_a2_id || m.player_b2_id) || m.match_type === '2v2' || m.mode === '2v2';


  if (mode === 'profile') {
    const isTeamA = Number(m.player_a_id) === Number(perspectiveId) || Number(m.player_a2_id) === Number(perspectiveId);
    const myScore = isTeamA ? m.score_a : m.score_b;
    const oppScore = isTeamA ? m.score_b : m.score_a;
    const won = myScore > oppScore;
    const delta = isTeamA ? m.mmr_delta_a : m.mmr_delta_b;
    const isDeleting = deletingId === m.id;

    let titleNode;
    if (is2v2) {
      const teammateName = isTeamA
        ? (Number(m.player_a_id) === Number(perspectiveId) ? m.player_a2_name : m.player_a_name)
        : (Number(m.player_b_id) === Number(perspectiveId) ? m.player_b2_name : m.player_b_name);
      const oppNames = isTeamA
        ? `${m.player_b_name || 'Player'} & ${m.player_b2_name || 'Player'}`
        : `${m.player_a_name || 'Player'} & ${m.player_a2_name || 'Player'}`;

      titleNode = (
        <div>
          <div className="disp" style={{ fontSize: 13, lineHeight: 1.1, color: 'var(--text)' }}>
            vs <span style={{ color: 'var(--text)' }}>{oppNames}</span>
          </div>
          <div className="label-eyebrow" style={{ fontSize: 8.5, color: 'var(--accent)', marginTop: 1 }}>
            w/ {teammateName || 'Teammate'} · 2V2
          </div>
        </div>
      );
    } else {
      const oppId = isTeamA ? m.player_b_id : m.player_a_id;
      const oppName = isTeamA ? m.player_b_name : m.player_a_name;
      titleNode = (
        <Link to={`/players/${oppId}`} style={{ textDecoration: 'none' }}>
          <div className="disp" style={{ fontSize: 13, lineHeight: 1.1, color: 'var(--text)' }}>vs {oppName}</div>
        </Link>
      );
    }

    return (
      <div className="card-row" style={{
        padding: '10px 12px', borderRadius: 4,
        display: 'grid', gridTemplateColumns: '36px 1fr auto auto auto',
        gap: 10, alignItems: 'center',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: won ? 'rgba(74,222,128,0.15)' : 'rgba(251,113,133,0.10)',
          color: won ? 'var(--win)' : 'var(--loss)',
          fontFamily: "'Saira Condensed', sans-serif", fontWeight: 700, fontSize: 14,
        }}>{won ? 'W' : 'L'}</div>
        <div style={{ minWidth: 0 }}>
          {titleNode}
          <div className="label-eyebrow" style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 1 }}>
            {fmtDate(m.played_at)} {m.season ? `· S${m.season}` : ''}
          </div>
        </div>
        <div className="num" style={{ fontSize: 14, fontWeight: 600 }}>{myScore}–{oppScore}</div>
        <Delta value={delta} />
        {onDelete && (
          <button
            onClick={() => onDelete(m.id)}
            disabled={isDeleting}
            style={{ color: 'var(--text-3)', background: 'none', border: 0, cursor: 'pointer', padding: 4, opacity: isDeleting ? 0.4 : 1 }}
          >
            <Icons.close />
          </button>
        )}
      </div>
    );
  }

  if (mode === 'h2h') {
    const isTeamA = Number(m.player_a_id) === Number(perspectiveId) || Number(m.player_a2_id) === Number(perspectiveId);
    const myScore = isTeamA ? m.score_a : m.score_b;
    const oppScore = isTeamA ? m.score_b : m.score_a;
    const myDelta = isTeamA ? m.mmr_delta_a : m.mmr_delta_b;
    const oppDelta = isTeamA ? m.mmr_delta_b : m.mmr_delta_a;

    return (
      <div className="card-row" style={{ padding: '10px 12px', borderRadius: 4, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
        <div style={{ textAlign: 'right' }}>
          <div className="num" style={{ fontSize: 16, fontWeight: 600, color: myScore > oppScore ? 'var(--accent)' : 'var(--text-3)' }}>{myScore}</div>
          <Delta value={myDelta} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="label-eyebrow" style={{ fontSize: 8.5 }}>
            {fmtDate(m.played_at)} {is2v2 ? '· 2v2' : ''}
          </span>
          <span className="disp" style={{ fontSize: 10, color: 'var(--text-3)' }}>—</span>
        </div>
        <div>
          <div className="num" style={{ fontSize: 16, fontWeight: 600, color: oppScore > myScore ? 'var(--accent)' : 'var(--text-3)' }}>{oppScore}</div>
          <Delta value={oppDelta} />
        </div>
      </div>
    );
  }

  // mode === 'history'
  const aWon = m.score_a > m.score_b;
  const d = new Date(m.played_at);

  let winnerDisplay;
  let loserDisplay;
  let winnerId;

  if (is2v2) {
    const teamANames = `${m.player_a_name || 'P1'} & ${m.player_a2_name || 'P2'}`;
    const teamBNames = `${m.player_b_name || 'P3'} & ${m.player_b2_name || 'P4'}`;
    winnerDisplay = aWon ? teamANames : teamBNames;
    loserDisplay = aWon ? teamBNames : teamANames;
    winnerId = aWon ? m.player_a_id : m.player_b_id;
  } else {
    winnerDisplay = aWon ? m.player_a_name : m.player_b_name;
    loserDisplay = aWon ? m.player_b_name : m.player_a_name;
    winnerId = aWon ? m.player_a_id : m.player_b_id;
  }

  const winnerDelta = aWon ? m.mmr_delta_a : m.mmr_delta_b;

  return (
    <div className="card-row" style={{ padding: '10px 12px', borderRadius: 4, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 38 }}>
        <span className="label-eyebrow" style={{ fontSize: 8 }}>{d.toLocaleDateString('en-US', { month: 'short' })}</span>
        <span className="disp" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</span>
      </div>
      <button
        onClick={() => onOpenPlayer?.(winnerId)}
        style={{ textAlign: 'left', padding: 0, background: 'none', border: 0, cursor: 'pointer' }}
      >
        <div className="disp" style={{ fontSize: 13, lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--accent)' }}>{winnerDisplay}</span>
          <span style={{ color: 'var(--text-3)' }}> def </span>
          <span style={{ color: 'var(--text)' }}>{loserDisplay}</span>
          {is2v2 && (
            <span className="label-eyebrow" style={{ fontSize: 8, padding: '1px 4px', background: 'rgba(255,255,255,0.06)', borderRadius: 2, border: '1px solid var(--border)' }}>
              2V2
            </span>
          )}
        </div>
        <div className="num" style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
          {aWon ? m.score_a : m.score_b}–{aWon ? m.score_b : m.score_a} {m.season ? `· Season ${m.season}` : ''}
        </div>
      </button>
      <Delta value={winnerDelta} />
    </div>
  );
}
