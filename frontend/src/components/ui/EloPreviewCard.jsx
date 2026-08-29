import Delta from '../common/Delta';

export default function EloPreviewCard({
  mode = '1v1',
  a, b,
  teamA, teamB,
  teamAvgA, teamAvgB,
  deltaA, deltaB,
}) {
  if (mode === '2v2' && teamA && teamB) {
    const [pA1, pA2] = teamA;
    const [pB1, pB2] = teamB;

    return (
      <div style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="label-eyebrow">2V2 TEAM ELO PREVIEW · K=32</div>
          <div className="label-eyebrow" style={{ color: 'var(--text-3)' }}>AVG MMR EXPECTATION</div>
        </div>

        {/* Team A */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span className="disp" style={{ fontSize: 13, color: 'var(--accent)' }}>TEAM A (AVG {teamAvgA})</span>
            <Delta value={deltaA} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 6, borderLeft: '2px solid var(--accent)' }}>
            {pA1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)' }}>
                <span>{pA1.name.split(' ')[0]}</span>
                <span className="num">{pA1.mmr} → <strong style={{ color: 'var(--text)' }}>{pA1.mmr + (deltaA ?? 0)}</strong></span>
              </div>
            )}
            {pA2 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)' }}>
                <span>{pA2.name.split(' ')[0]}</span>
                <span className="num">{pA2.mmr} → <strong style={{ color: 'var(--text)' }}>{pA2.mmr + (deltaA ?? 0)}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

        {/* Team B */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span className="disp" style={{ fontSize: 13, color: 'var(--text)' }}>TEAM B (AVG {teamAvgB})</span>
            <Delta value={deltaB} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 6, borderLeft: '2px solid var(--border)' }}>
            {pB1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)' }}>
                <span>{pB1.name.split(' ')[0]}</span>
                <span className="num">{pB1.mmr} → <strong style={{ color: 'var(--text)' }}>{pB1.mmr + (deltaB ?? 0)}</strong></span>
              </div>
            )}
            {pB2 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)' }}>
                <span>{pB2.name.split(' ')[0]}</span>
                <span className="num">{pB2.mmr} → <strong style={{ color: 'var(--text)' }}>{pB2.mmr + (deltaB ?? 0)}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 1v1 Mode
  return (
    <div style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}>
      <div className="label-eyebrow" style={{ marginBottom: 8 }}>LIVE ELO PREVIEW · K=32</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
        <span style={{ color: 'var(--text)' }}>{a?.name.split(' ')[0]}</span>
        <span className="num" style={{ color: 'var(--text-2)' }}>{a?.mmr}</span>
        <Delta value={deltaA} />
        <span className="num" style={{ fontWeight: 600 }}>{(a?.mmr ?? 0) + (deltaA ?? 0)}</span>
      </div>
      <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
        <span style={{ color: 'var(--text)' }}>{b?.name.split(' ')[0]}</span>
        <span className="num" style={{ color: 'var(--text-2)' }}>{b?.mmr}</span>
        <Delta value={deltaB} />
        <span className="num" style={{ fontWeight: 600 }}>{(b?.mmr ?? 0) + (deltaB ?? 0)}</span>
      </div>
    </div>
  );
}
