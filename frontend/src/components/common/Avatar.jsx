export default function Avatar({ name = '', size = 32, rank }) {
  const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const c0 = name.charCodeAt(0) || 0;
  const c1 = name.charCodeAt(1) || 0;
  const hue = (c0 * 47 + c1 * 13) % 360;

  const rankColors = { 1: 'var(--gold)', 2: 'var(--silver)', 3: 'var(--bronze)' };
  const borderColor = rank && rankColors[rank] ? rankColors[rank] : 'rgba(255,255,255,0.06)';

  return (
    <div style={{
      width: size, height: size, borderRadius: 4, flexShrink: 0,
      background: `linear-gradient(135deg, oklch(0.42 0.08 ${hue}), oklch(0.28 0.05 ${hue + 30}))`,
      color: 'rgba(255,255,255,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Saira Condensed', sans-serif", fontWeight: 700,
      fontSize: size * 0.42, letterSpacing: 0.4,
      border: `1px solid ${borderColor}`,
      position: 'relative',
    }}>
      {initials}
    </div>
  );
}
