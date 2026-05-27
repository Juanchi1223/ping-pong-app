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
  const isA = m.player_a_id === perspectiveId;

  if (mode === 'profile') {
    const myScore  = isA ? m.score_a : m.score_b;
    const oppScore = isA ? m.score_b : m.score_a;
    const won = myScore > oppScore;
    const delta = isA ? m.mmr_delta_a : m.mmr_delta_b;
    const oppId   = isA ? m.player_b_id : m.player_a_id;
    const oppName = isA ? m.player_b_name : m.player_a_name;
    const isDeleting = deletingId === m.id;

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
          <Link to={`/players/${oppId}`} style={{ textDecoration: 'none' }}>
            <div className="disp" style={{ fontSize: 13, lineHeight: 1.1, color: 'var(--text)' }}>vs {oppName}</div>
          </Link>
          <div className="label-eyebrow" style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 1 }}>{fmtDate(m.played_at)}</div>
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
    const p1IsA = m.player_a_id === perspectiveId;
    const myScore  = p1IsA ? m.score_a : m.score_b;
    const oppScore = p1IsA ? m.score_b : m.score_a;
    const myDelta  = p1IsA ? m.mmr_delta_a : m.mmr_delta_b;
    const oppDelta = p1IsA ? m.mmr_delta_b : m.mmr_delta_a;

    return (
      <div className="card-row" style={{ padding: '10px 12px', borderRadius: 4, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
        <div style={{ textAlign: 'right' }}>
          <div className="num" style={{ fontSize: 16, fontWeight: 600, color: myScore > oppScore ? 'var(--accent)' : 'var(--text-3)' }}>{myScore}</div>
          <Delta value={myDelta} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="label-eyebrow" style={{ fontSize: 8.5 }}>{fmtDate(m.played_at)}</span>
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
  const winnerName = aWon ? m.player_a_name : m.player_b_name;
  const winnerId   = aWon ? m.player_a_id : m.player_b_id;
  const loserName  = aWon ? m.player_b_name : m.player_a_name;
  const winnerDelta = aWon ? m.mmr_delta_a : m.mmr_delta_b;
  const d = new Date(m.played_at);

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
        <div className="disp" style={{ fontSize: 13, lineHeight: 1.1 }}>
          <span style={{ color: 'var(--accent)' }}>{winnerName}</span>
          <span style={{ color: 'var(--text-3)' }}> def </span>
          <span style={{ color: 'var(--text)' }}>{loserName}</span>
        </div>
        <div className="num" style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
          {aWon ? m.score_a : m.score_b}–{aWon ? m.score_b : m.score_a}
        </div>
      </button>
      <Delta value={winnerDelta} />
    </div>
  );
}
