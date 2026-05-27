export default function Delta({ value, large = false }) {
  if (value === 0 || value == null) {
    return <span className="num" style={{ color: 'var(--text-3)' }}>—</span>;
  }
  const pos = value > 0;
  return (
    <span className="num" style={{
      color: pos ? 'var(--win)' : 'var(--loss)',
      fontWeight: 600,
      fontSize: large ? 18 : 12.5,
      fontFeatureSettings: '"tnum"',
    }}>
      {pos ? '+' : ''}{value}
    </span>
  );
}
