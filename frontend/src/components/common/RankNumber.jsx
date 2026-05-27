const TROPHY = { 1: 'var(--gold)', 2: 'var(--silver)', 3: 'var(--bronze)' };

export default function RankNumber({ rank, size = 'md' }) {
  const px = size === 'lg' ? 32 : size === 'sm' ? 14 : 22;
  return (
    <span className="disp-ex" style={{
      fontSize: px,
      color: TROPHY[rank] ?? 'var(--text-3)',
      fontWeight: 800,
      lineHeight: 1,
      letterSpacing: -0.02,
    }}>
      {rank}
    </span>
  );
}
