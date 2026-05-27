export default function StatGrid({ items = [], cols = 3 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 }}>
      {items.map((s, i) => (
        <div key={i} className="card-row" style={{ padding: '10px 12px', borderRadius: 4 }}>
          <div className="label-eyebrow" style={{ fontSize: 8.5 }}>{s.label}</div>
          <div className="num" style={{ fontSize: 18, fontWeight: 600, color: s.color ?? 'var(--text)', marginTop: 2 }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
