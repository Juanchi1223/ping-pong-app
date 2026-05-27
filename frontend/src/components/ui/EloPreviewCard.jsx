import Delta from '../common/Delta';

export default function EloPreviewCard({ a, b, deltaA, deltaB }) {
  return (
    <div style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}>
      <div className="label-eyebrow" style={{ marginBottom: 8 }}>LIVE ELO PREVIEW · K=32</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
        <span style={{ color: 'var(--text)' }}>{a.name.split(' ')[0]}</span>
        <span className="num" style={{ color: 'var(--text-2)' }}>{a.mmr}</span>
        <Delta value={deltaA} />
        <span className="num" style={{ fontWeight: 600 }}>{a.mmr + (deltaA ?? 0)}</span>
      </div>
      <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
        <span style={{ color: 'var(--text)' }}>{b.name.split(' ')[0]}</span>
        <span className="num" style={{ color: 'var(--text-2)' }}>{b.mmr}</span>
        <Delta value={deltaB} />
        <span className="num" style={{ fontWeight: 600 }}>{b.mmr + (deltaB ?? 0)}</span>
      </div>
    </div>
  );
}
