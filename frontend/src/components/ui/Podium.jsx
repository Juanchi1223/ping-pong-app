import Avatar from '../common/Avatar';

export default function Podium({ top3 = [], onPick }) {
  if (top3.length < 3) return null;
  const [first, second, third] = top3;
  const cols = [
    { p: second, h: 56, rank: 2, c: 'var(--silver)' },
    { p: first,  h: 76, rank: 1, c: 'var(--gold)' },
    { p: third,  h: 40, rank: 3, c: 'var(--bronze)' },
  ];
  return (
    <div style={{ padding: '12px 16px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, minHeight: 180 }}>
        {cols.map((col) => (
          <button
            key={col.rank}
            onClick={() => onPick?.(col.p.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, padding: 0, background: 'none', border: 0, cursor: 'pointer' }}
          >
            <Avatar name={col.p.name} size={col.rank === 1 ? 44 : 36} rank={col.rank} />
            <div className="disp" style={{ fontSize: col.rank === 1 ? 14 : 12, lineHeight: 1, color: 'var(--text)' }}>
              {col.p.name.split(' ')[0]}
            </div>
            <div className="num" style={{ fontSize: col.rank === 1 ? 18 : 14, color: col.c, fontWeight: 600, lineHeight: 1 }}>
              {col.p.mmr}
            </div>
            <div style={{
              width: '100%', height: col.h,
              background: `linear-gradient(180deg, ${col.c}33, transparent)`,
              borderTop: `2px solid ${col.c}`,
              position: 'relative', marginTop: 4,
            }}>
              <span className="disp-ex" style={{
                position: 'absolute', top: 4, left: 0, right: 0, textAlign: 'center',
                fontSize: col.rank === 1 ? 28 : 22, color: col.c, lineHeight: 1,
              }}>
                {col.rank}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
