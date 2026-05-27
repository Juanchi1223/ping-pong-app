import { useState, useEffect } from 'react';
import { api } from '../api';
import PageHeader from '../components/ui/PageHeader';
import H2HBar from '../components/ui/H2HBar';
import StatGrid from '../components/ui/StatGrid';
import PlayerSelect from '../components/ui/PlayerSelect';
import MatchRow from '../components/ui/MatchRow';
import Pager from '../components/common/Pager';
import EmptyState from '../components/common/EmptyState';

const PAGE_SIZE = 8;

export default function HeadToHead() {
  const [players, setPlayers] = useState([]);
  const [p1Id, setP1Id] = useState(null);
  const [p2Id, setP2Id] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);

  useEffect(() => { api.getPlayers().then(setPlayers); }, []);
  useEffect(() => { setPage(0); }, [p1Id, p2Id]);

  useEffect(() => {
    if (!p1Id || !p2Id || p1Id === p2Id) { setData(null); return; }
    setLoading(true);
    setError(null);
    api.getH2H(p1Id, p2Id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [p1Id, p2Id]);

  const p1 = data?.player1;
  const p2 = data?.player2;
  const matches = data?.matches ?? [];
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const pageMs = matches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const pointStats = data ? [
    { label: `${p1?.name.split(' ')[0] ?? 'P1'} POINTS`, value: data.p1PointsScored },
    { label: `${p2?.name.split(' ')[0] ?? 'P2'} POINTS`, value: data.p2PointsScored },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader eyebrow="VERSUS" title="Head to head" />

      <div className="scrollarea" style={{ flex: 1, padding: '14px 16px 20px' }}>
        {/* Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
          <PlayerSelect players={players} value={p1Id} onChange={setP1Id} exclude={p2Id} placeholder="Player 1…" />
          <div className="disp-ex" style={{ fontSize: 18, color: 'var(--accent)', textAlign: 'center' }}>VS</div>
          <PlayerSelect players={players} value={p2Id} onChange={setP2Id} exclude={p1Id} placeholder="Player 2…" />
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            <div className="skel" style={{ height: 100, borderRadius: 4 }} />
            <div className="skel" style={{ height: 60, borderRadius: 4 }} />
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(251,113,133,0.08)', border: '1px solid var(--loss)', borderRadius: 4, color: 'var(--loss)', fontSize: 12.5 }}>
            ⚠ {error}
          </div>
        )}

        {data && !loading && (
          <>
            <div style={{ marginTop: 14 }}>
              <H2HBar
                w1={data.p1wins}
                w2={data.p2wins}
                label1={p1?.name.split(' ')[0] ?? ''}
                label2={p2?.name.split(' ')[0] ?? ''}
                pts1={data.p1PointsScored}
                pts2={data.p2PointsScored}
              />
            </div>

            {matches.length === 0 ? (
              <div style={{ marginTop: 14 }}>
                <EmptyState message="No matches yet between these two." />
              </div>
            ) : (
              <>
                <div style={{ marginTop: 18, marginBottom: 8 }}>
                  <div className="label-eyebrow">MATCH LOG</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {pageMs.map(m => (
                    <MatchRow key={m.id} match={m} perspectiveId={p1Id} mode="h2h" />
                  ))}
                </div>
                <Pager page={page} pageCount={pageCount} onPage={setPage} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
