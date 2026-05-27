export default function PageHeader({ title, eyebrow, sub, right }) {
  return (
    <div style={{
      padding: '14px 16px 12px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
      position: 'relative', zIndex: 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow && <div className="label-eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>}
          <div className="disp-ex" style={{ fontSize: 28, lineHeight: 0.95, textTransform: 'uppercase' }}>{title}</div>
          {sub && <div style={{ marginTop: 6, color: 'var(--text-2)', fontSize: 12 }}>{sub}</div>}
        </div>
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
    </div>
  );
}
