export default function ScoreStepper({ value, onChange, isWinner }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 }}>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{
          width: 30, height: 30, borderRadius: 4, background: 'var(--elevated)', color: 'var(--text-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, flexShrink: 0, border: 0, cursor: 'pointer',
        }}
        aria-label="Decrease"
      >−</button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onFocus={e => e.target.select()}
        onChange={e => {
          const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
          onChange(digits === '' ? 0 : Number(digits));
        }}
        className="score-input"
        style={{
          color: isWinner ? 'var(--accent)' : 'var(--text)',
          borderColor: isWinner ? 'var(--accent)' : undefined,
        }}
        onClick={e => e.stopPropagation()}
      />
      <button
        onClick={() => onChange(value + 1)}
        style={{
          width: 30, height: 30, borderRadius: 4, background: 'var(--elevated)', color: 'var(--text-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, flexShrink: 0, border: 0, cursor: 'pointer',
        }}
        aria-label="Increase"
      >+</button>
    </div>
  );
}
