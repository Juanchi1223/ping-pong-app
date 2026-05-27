const MAP = { wall: '🏰', fire: '🔥', cold: '❄️' };

export default function Badge({ kind, size = 12 }) {
  return <span style={{ fontSize: size, lineHeight: 1 }}>{MAP[kind] ?? null}</span>;
}
