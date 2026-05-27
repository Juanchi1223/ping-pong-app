export default function H2HBar({ w1 = 0, w2 = 0, label1 = '', label2 = '', pts1, pts2 }) {
  const total = w1 + w2;
  const pct1 = total ? Math.round((w1 / total) * 100) : 50;

  return (
    <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}>
      <div className="label-eyebrow" style={{ marginBottom: 10, textAlign: 'center' }}>
        {total} HEAD-TO-HEAD {total === 1 ? 'MATCH' : 'MATCHES'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="num" style={{ fontSize: 28, fontWeight: 700, minWidth: 32, color: w1 >= w2 ? 'var(--accent)' : 'var(--text-2)' }}>{w1}</div>
        <div style={{ flex: 1, height: 10, background: 'var(--elevated)', borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: pct1 + '%', background: 'var(--accent)', transition: 'width .4s' }} />
          <div style={{ flex: 1, background: 'var(--text-3)' }} />
        </div>
        <div className="num" style={{ fontSize: 28, fontWeight: 700, minWidth: 32, textAlign: 'right', color: w2 > w1 ? 'var(--accent)' : 'var(--text-2)' }}>{w2}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span className="label-eyebrow" style={{ color: 'var(--accent)' }}>{label1.toUpperCase()} · {pct1}%</span>
        <span className="label-eyebrow" style={{ color: 'var(--text-3)' }}>{100 - pct1}% · {label2.toUpperCase()}</span>
      </div>
      {(pts1 != null && pts2 != null) && (
        <>
          <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="label-eyebrow" style={{ fontSize: 8.5 }}>PTS SCORED</span>
              <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>{pts1}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>{pts2}</span>
              <span className="label-eyebrow" style={{ fontSize: 8.5 }}>PTS SCORED</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
