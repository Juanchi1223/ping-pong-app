const BADGE_CONFIG = {
  wall: { icon: '🏰', name: 'EL MURO',    sub: 'Best point diff',   bg: 'linear-gradient(170deg, rgba(255,200,87,0.10), var(--surface) 60%)' },
  fire: { icon: '🔥', name: 'ON FIRE',    sub: 'Win streak',         bg: 'linear-gradient(170deg, rgba(255,61,84,0.12), var(--surface) 60%)' },
  cold: { icon: '❄️', name: 'COLD SPELL', sub: 'Loss streak',        bg: 'linear-gradient(170deg, rgba(180,200,255,0.08), var(--surface) 60%)' },
};

export default function BadgeStrip({ badges = {} }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '12px 16px 0' }}>
      {Object.entries(BADGE_CONFIG).map(([k, cfg]) => {
        const b = badges[k];
        return (
          <div key={k} className="card-row" style={{
            padding: '10px 10px 12px', borderRadius: 4,
            position: 'relative', overflow: 'hidden', background: cfg.bg,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>{cfg.icon}</span>
              <span className="label-eyebrow" style={{ fontSize: 9, color: 'var(--text)' }}>{cfg.name}</span>
            </div>
            {b?.player ? (
              <>
                <div className="disp" style={{ fontSize: 14, lineHeight: 1.1, marginBottom: 2 }}>
                  {b.player.name.split(' ')[0]}
                </div>
                <div className="num" style={{ fontSize: 10.5, color: 'var(--text-2)' }}>{b.stat}</div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>—</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
