import Avatar from '../common/Avatar';
import RankNumber from '../common/RankNumber';
import Badge from '../common/Badge';

function streakStr(p) {
  if (p.current_win_streak > 0) return { v: `W${p.current_win_streak}`, c: 'var(--win)' };
  if (p.current_loss_streak > 0) return { v: `L${p.current_loss_streak}`, c: 'var(--loss)' };
  return null;
}

function RankingRowMobile({ player: p, rank, badges = {}, onOpenPlayer, animDelay }) {
  const streak = streakStr(p);
  const hasBadges = [
    badges.wall === p.id && 'wall',
    badges.fire === p.id && 'fire',
    badges.cold === p.id && 'cold',
  ].filter(Boolean);

  const topRank = rank <= 3 ? rank : null;
  const goldBg = {
    1: 'linear-gradient(90deg, rgba(255,200,87,0.06), transparent 60%)',
    2: 'linear-gradient(90deg, rgba(205,209,222,0.06), transparent 60%)',
    3: 'linear-gradient(90deg, rgba(224,144,92,0.06), transparent 60%)',
  };

  return (
    <button
      onClick={() => onOpenPlayer?.(p.id)}
      className="card-row pressable table-row-anim"
      style={{
        padding: '10px 12px', borderRadius: 4,
        display: 'grid', gridTemplateColumns: '28px 1fr auto auto',
        gap: 12, alignItems: 'center', textAlign: 'left',
        animationDelay: `${animDelay}ms`,
        background: topRank ? goldBg[topRank] : 'var(--surface)',
        cursor: 'pointer', width: '100%',
      }}
    >
      <RankNumber rank={rank} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar name={p.name} size={32} rank={topRank} />
        <div style={{ minWidth: 0 }}>
          <div className="disp" style={{ fontSize: 14, lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            {hasBadges.map(k => <Badge key={k} kind={k} size={11} />)}
          </div>
          <div className="label-eyebrow" style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 1 }}>{p.department}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="num" style={{ fontSize: 16, lineHeight: 1, fontWeight: 600 }}>{p.mmr}</div>
        <div className="num" style={{ fontSize: 10.5, color: 'var(--text-2)', marginTop: 2 }}>{p.wins}–{p.losses}</div>
      </div>
      <div style={{ width: 22, textAlign: 'right' }}>
        {streak
          ? <span className="num" style={{ fontSize: 11, fontWeight: 600, color: streak.c }}>{streak.v}</span>
          : <span style={{ color: 'var(--text-3)' }}>·</span>}
      </div>
    </button>
  );
}

const DESKTOP_COLS = '60px minmax(0, 2fr) 110px 90px 60px 60px 80px 80px 60px';

function RankingTableDesktop({ players, badges = {}, onOpenPlayer }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}>
      <div className="label-eyebrow" style={{
        display: 'grid', gridTemplateColumns: DESKTOP_COLS,
        padding: '12px 18px', borderBottom: '1px solid var(--border)',
        alignItems: 'center', gap: 12,
      }}>
        <span>RANK</span><span>PLAYER</span><span>DEPT</span>
        <span style={{ textAlign: 'right' }}>MMR</span>
        <span style={{ textAlign: 'right' }}>W</span>
        <span style={{ textAlign: 'right' }}>L</span>
        <span style={{ textAlign: 'right' }}>WIN %</span>
        <span style={{ textAlign: 'right' }}>DIFF</span>
        <span style={{ textAlign: 'right' }}>STK</span>
      </div>
      {players.map((p, i) => {
        const rank = i + 1;
        const topRank = rank <= 3 ? rank : null;
        const streak = streakStr(p);
        const d = p.diff ?? (p.points_scored - p.points_conceded);
        const wp = p.win_pct ?? (p.wins + p.losses > 0 ? Math.round(p.wins / (p.wins + p.losses) * 100) : 0);
        const hasBadges = [
          badges.wall === p.id && 'wall',
          badges.fire === p.id && 'fire',
          badges.cold === p.id && 'cold',
        ].filter(Boolean);
        const goldBg = {
          1: 'linear-gradient(90deg, rgba(255,200,87,0.05), transparent 30%)',
          2: 'linear-gradient(90deg, rgba(205,209,222,0.05), transparent 30%)',
          3: 'linear-gradient(90deg, rgba(224,144,92,0.05), transparent 30%)',
        };
        return (
          <button
            key={p.id}
            onClick={() => onOpenPlayer?.(p.id)}
            style={{
              display: 'grid', gridTemplateColumns: DESKTOP_COLS,
              padding: '14px 18px',
              borderBottom: i === players.length - 1 ? 'none' : '1px solid var(--border)',
              alignItems: 'center', gap: 12, textAlign: 'left', width: '100%',
              background: topRank ? goldBg[topRank] : 'transparent',
              border: 0, cursor: 'pointer',
              transition: 'background .15s',
            }}
            onMouseEnter={e => { if (!topRank) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = topRank ? goldBg[topRank] : 'transparent'; }}
          >
            <RankNumber rank={rank} size="lg" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={p.name} size={36} rank={topRank} />
              <div>
                <div className="disp" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {p.name}
                  {hasBadges.map(k => <Badge key={k} kind={k} size={13} />)}
                </div>
              </div>
            </div>
            <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{p.department}</span>
            <span className="num" style={{ textAlign: 'right', fontSize: 18, fontWeight: 600 }}>{p.mmr}</span>
            <span className="num" style={{ textAlign: 'right', color: 'var(--win)' }}>{p.wins}</span>
            <span className="num" style={{ textAlign: 'right', color: 'var(--loss)' }}>{p.losses}</span>
            <span className="num" style={{ textAlign: 'right', color: 'var(--text-2)' }}>{wp}%</span>
            <span className="num" style={{ textAlign: 'right', color: d >= 0 ? 'var(--win)' : 'var(--loss)' }}>
              {d >= 0 ? '+' : ''}{d}
            </span>
            <span className="num" style={{ textAlign: 'right', color: streak ? streak.c : 'var(--text-3)', fontWeight: 600 }}>
              {streak ? streak.v : '—'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function RankingTable({ players = [], variant = 'mobile', podium, badges = {}, onOpenPlayer }) {
  if (variant === 'desktop') {
    return <RankingTableDesktop players={players} badges={badges} onOpenPlayer={onOpenPlayer} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 16px 16px' }}>
      {players.map((p, i) => (
        <RankingRowMobile
          key={p.id}
          player={p}
          rank={(podium ? 4 : 1) + i}
          badges={badges}
          onOpenPlayer={onOpenPlayer}
          animDelay={i * 30}
        />
      ))}
    </div>
  );
}
