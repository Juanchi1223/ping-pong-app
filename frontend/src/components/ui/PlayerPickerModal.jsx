import Avatar from '../common/Avatar';
import { Icons } from '../common/Icons';

export default function PlayerPickerModal({ players = [], exclude, onPick, onClose }) {
  const excludeList = Array.isArray(exclude)
    ? exclude.map(Number)
    : [exclude].filter(Boolean).map(Number);

  const list = players
    .filter(p => p.active !== false && !excludeList.includes(Number(p.id)))
    .sort((a, b) => b.mmr - a.mmr);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(8,8,13,0.92)',
      zIndex: 50, backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        <span className="disp-ex" style={{ fontSize: 18, textTransform: 'uppercase' }}>Choose player</span>
        <button onClick={onClose} style={{ color: 'var(--text-2)', background: 'none', border: 0, cursor: 'pointer' }}>
          <Icons.close />
        </button>
      </div>
      <div className="scrollarea" style={{ flex: 1, padding: '8px 16px 16px' }}>
        {list.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>
            No available players to select.
          </div>
        ) : (
          list.map(p => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className="card-row pressable"
              style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
            >
              <Avatar name={p.name} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="disp" style={{ fontSize: 14, lineHeight: 1.1 }}>{p.name}</div>
                <div className="label-eyebrow" style={{ fontSize: 9, color: 'var(--text-3)' }}>{p.department}</div>
              </div>
              <div className="num" style={{ fontSize: 15, fontWeight: 600 }}>{p.mmr}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
