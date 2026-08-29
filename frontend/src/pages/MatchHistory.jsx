import { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [seasonFilter, setSeasonFilter] = useState('all'); // 'all' | '2' | '1'
  const [modeFilter, setModeFilter] = useState('all'); // 'all' | '1v1' | '2v2'
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  const loadMatches = useCallback(() => {
    setLoading(true);
    const params = {};
    if (seasonFilter !== 'all') params.season = seasonFilter;
    if (modeFilter !== 'all') params.mode = modeFilter;

    api.getMatches(params)
      .then(setMatches)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [seasonFilter, modeFilter]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    setPage(0);
  }, [sort, seasonFilter, modeFilter]);

  const sorted = useMemo(() => {
    if (sort === 'points') {
      return [...matches].sort((a, b) => (b.score_a + b.score_b) - (a.score_a + a.score_b));
    }
    return matches;
  }, [matches, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageMs = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const summaryStats = useMemo(() => {
    if (!matches.length) return null;
    const winsMap = {};
    let totalPts = 0;
    let doublesCount = 0;

    for (const m of matches) {
      const is2v2 = Boolean(m.player_a2_id || m.player_b2_id) || m.match_type === '2v2' || m.mode === '2v2';
      if (is2v2) doublesCount++;


      const aWon = m.score_a > m.score_b;
      const winner = is2v2
        ? (aWon ? `${m.player_a_name} & ${m.player_a2_name}` : `${m.player_b_name} & ${m.player_b2_name}`)
        : (aWon ? m.player_a_name : m.player_b_name);

      if (winner) winsMap[winner] = (winsMap[winner] ?? 0) + 1;
      totalPts += m.score_a + m.score_b;
    }

    const topWinner = Object.entries(winsMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    return [
      { label: 'TOTAL MATCHES', value: matches.length },
      { label: 'AVG PTS / MATCH', value: (totalPts / matches.length).toFixed(1) },
      { label: '2V2 DOUBLES', value: doublesCount },
      { label: 'TOP WINNER', value: topWinner },
    ];
  }, [matches]);

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        eyebrow="MATCHES"
        title="Match log"
        sub={`${matches.length} matches recorded`}
      />

      <div className="scrollarea" style={{ flex: 1, padding: '14px 16px 20px' }}>
        {summaryStats && <StatGrid items={summaryStats} cols={4} />}

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, alignItems: 'center' }}>
          {/* Season filter */}
          <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}>
            {[
              { k: 'all', l: 'ALL SEASONS' },
              { k: '2', l: 'SEASON 2' },
              { k: '1', l: 'SEASON 1' },
            ].map(o => (
              <button
                key={o.k}
                onClick={() => setSeasonFilter(o.k)}
                className="label-eyebrow"
                style={{
                  padding: '5px 8px', borderRadius: 3,
                  background: seasonFilter === o.k ? 'var(--accent)' : 'transparent',
                  color: seasonFilter === o.k ? '#0a0a0d' : 'var(--text-2)',
                  border: 0, cursor: 'pointer',
                }}
              >
                {o.l}
              </button>
            ))}
          </div>

          {/* Mode filter */}
          <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}>
            {[
              { k: 'all', l: 'ALL MODES' },
              { k: '1v1', l: '1V1' },
              { k: '2v2', l: '2V2' },
            ].map(o => (
              <button
                key={o.k}
                onClick={() => setModeFilter(o.k)}
                className="label-eyebrow"
                style={{
                  padding: '5px 8px', borderRadius: 3,
                  background: modeFilter === o.k ? 'var(--accent)' : 'transparent',
                  color: modeFilter === o.k ? '#0a0a0d' : 'var(--text-2)',
                  border: 0, cursor: 'pointer',
                }}
              >
                {o.l}
              </button>
            ))}
          </div>

          {/* Sort order */}
          <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}>
            {[
              { k: 'date', l: 'RECENT' },
              { k: 'points', l: 'HIGHEST PTS' },
            ].map(o => (
              <button
                key={o.k}
                onClick={() => setSort(o.k)}
                className="label-eyebrow"
                style={{
                  padding: '5px 8px', borderRadius: 3,
                  background: sort === o.k ? 'var(--accent)' : 'transparent',
                  color: sort === o.k ? '#0a0a0d' : 'var(--text-2)',
                  border: 0, cursor: 'pointer',
                }}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {matches.length === 0 ? (
          <div style={{ marginTop: 16 }}>
            <EmptyState message="No matches match the selected filters." />
          </div>
        ) : (
          <>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
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
