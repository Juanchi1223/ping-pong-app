export default function LiveIndicator({ on = true }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 8px', border: '1px solid var(--border-2)', borderRadius: 3,
    }}>
      <div
        className={on ? 'pulse' : ''}
        style={{ width: 6, height: 6, borderRadius: '50%', background: on ? 'var(--win)' : 'var(--text-3)' }}
      />
      <span className="label-eyebrow" style={{ fontSize: 9.5, letterSpacing: '0.18em' }}>
        {on ? 'LIVE' : 'OFFLINE'}
      </span>
    </div>
  );
}
