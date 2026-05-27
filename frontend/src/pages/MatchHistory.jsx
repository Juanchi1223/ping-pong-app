import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import PageHeader from '../components/ui/PageHeader';
import StatGrid from '../components/ui/StatGrid';
import MatchRow from '../components/ui/MatchRow';
import Pager from '../components/common/Pager';
import EmptyState from '../components/common/EmptyState';
import { PageLoader, PageError } from '../components/common/Loader';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 8;

export default function MatchHistory() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState('date');
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    api.getMatches()
      .then(setMatches)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { setPage(0); }, [sort]);

  const sorted = useMemo(() => {
    if (sort === 'points') return [...matches].sort((a, b) => (b.score_a + b.score_b) - (a.score_a + a.score_b));
    return matches;
  }, [matches, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageMs = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const summaryStats = useMemo(() => {
    if (!matches.length) return null;
    const winsMap = {};
    let totalPts = 0;
    for (const m of matches) {
      const winner = m.score_a > m.score_b ? m.player_a_name : m.player_b_name;
      winsMap[winner] = (winsMap[winner] ?? 0) + 1;
      totalPts += m.score_a + m.score_b;
    }
    const topPlayer = Object.entries(winsMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    return [
      { label: 'TOTAL',     value: matches.length },
      { label: 'AVG PTS',   value: (totalPts / matches.length).toFixed(1) },
      { label: 'MOST WINS', value: topPlayer },
    ];
  }, [matches]);

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader eyebrow="MATCHES" title="Match log" sub={`${matches.length} total matches`} />

      <div className="scrollarea" style={{ flex: 1, padding: '14px 16px 20px' }}>
        {summaryStats && <StatGrid items={summaryStats} cols={3} />}

        {matches.length === 0 ? (
          <div style={{ marginTop: 16 }}>
            <EmptyState message="No matches played yet." />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 4, marginTop: 14, padding: 3, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, width: 'fit-content' }}>
              {[{ k: 'date', l: 'RECENT' }, { k: 'points', l: 'HIGHEST' }].map(o => (
                <button
                  key={o.k}
                  onClick={() => setSort(o.k)}
                  className="label-eyebrow"
                  style={{
                    padding: '6px 10px', borderRadius: 3,
                    background: sort === o.k ? 'var(--accent)' : 'transparent',
                    color: sort === o.k ? '#0a0a0d' : 'var(--text-2)',
                    border: 0, cursor: 'pointer',
                  }}
                >
                  {o.l}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {pageMs.map(m => (
                <MatchRow
                  key={m.id}
                  match={m}
                  mode="history"
                  onOpenPlayer={id => navigate(`/players/${id}`)}
                />
              ))}
            </div>
            <Pager page={page} pageCount={pageCount} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
