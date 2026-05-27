export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 3,
        border: '1px solid var(--border)', background: 'none', cursor: 'pointer',
      }}
    >
      <div style={{
        width: 28, height: 14, borderRadius: 999,
        background: checked ? 'var(--accent)' : 'var(--elevated)',
        position: 'relative', transition: 'background .15s',
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 2, left: checked ? 16 : 2,
          transition: 'left .15s',
        }} />
      </div>
      {label && <span className="label-eyebrow">{label}</span>}
    </button>
  );
}
