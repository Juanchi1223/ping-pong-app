import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function MatchHistory() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    api.getMatches()
      .then(setMatches)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (matches.length === 0) return null;

    const winsMap = {};
    let totalPoints = 0;

    for (const m of matches) {
      const winner = m.score_a > m.score_b ? m.player_a_name : m.player_b_name;
      winsMap[winner] = (winsMap[winner] || 0) + 1;
      totalPoints += m.score_a + m.score_b;
    }

    let topPlayer = null;
    let topWins = 0;
    for (const [name, wins] of Object.entries(winsMap)) {
      if (wins > topWins) { topPlayer = name; topWins = wins; }
    }

    return {
      total: matches.length,
      topPlayer,
      topWins,
      avgPoints: (totalPoints / matches.length).toFixed(1),
    };
  }, [matches]);

  const sortedMatches = useMemo(() => {
    if (sortBy === 'points') {
      return [...matches].sort((a, b) => (b.score_a + b.score_b) - (a.score_a + a.score_b));
    }
    return matches;
  }, [matches, sortBy]);

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} />;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="font-display text-3xl md:text-4xl text-white tracking-wide">Match History</h1>
        <p className="text-white/35 text-sm font-body mt-1">
          {matches.length} match{matches.length !== 1 ? 'es' : ''} played
        </p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <StatCard
            icon="🏓"
            label="Total Matches"
            value={stats.total}
          />
          <StatCard
            icon="👑"
            label="Most Wins"
            value={stats.topPlayer}
            detail={`${stats.topWins} win${stats.topWins !== 1 ? 's' : ''}`}
          />
          <StatCard
            icon="📊"
            label="Avg Points / Match"
            value={stats.avgPoints}
          />
        </div>
      )}

      {/* Match list */}
      {matches.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Sort controls */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl md:text-2xl text-white tracking-wide">All Matches</h2>
            <div className="flex gap-1">
              <SortButton active={sortBy === 'date'} onClick={() => setSortBy('date')}>Date</SortButton>
              <SortButton active={sortBy === 'points'} onClick={() => setSortBy('points')}>Points</SortButton>
            </div>
          </div>

          <div className="card overflow-hidden overflow-x-auto">
            <table className="w-full min-w-0">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-3 md:px-5 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">Date</th>
                  <th className="text-left px-3 md:px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">Winner</th>
                  <th className="text-center px-3 md:px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">Score</th>
                  <th className="text-left px-3 md:px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">Loser</th>
                  <th className="hidden md:table-cell text-right px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">MMR Δ</th>
                </tr>
              </thead>
              <tbody>
                {sortedMatches.map((m, i) => {
                  const aWon = m.score_a > m.score_b;
                  const winner = aWon ? m.player_a_name : m.player_b_name;
                  const loser = aWon ? m.player_b_name : m.player_a_name;
                  const winScore = aWon ? m.score_a : m.score_b;
                  const loseScore = aWon ? m.score_b : m.score_a;
                  const winnerDelta = aWon ? m.mmr_delta_a : m.mmr_delta_b;

                  return (
                    <tr
                      key={m.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors table-row-anim"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <td className="px-3 md:px-5 py-3.5">
                        <span className="font-mono text-xs text-white/40">
                          {new Date(m.played_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-3.5">
                        <span className="font-body font-medium text-accent text-sm">{winner}</span>
                      </td>
                      <td className="px-3 md:px-4 py-3.5 text-center">
                        <span className="font-mono text-sm">
                          <span className="text-accent">{winScore}</span>
                          <span className="text-white/25 mx-1">–</span>
                          <span className="text-loss/70">{loseScore}</span>
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-3.5">
                        <span className="font-body text-white/40 text-sm">{loser}</span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3.5 text-right">
                        <span className="font-mono text-xs text-accent/70">+{winnerDelta}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, detail }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-white/25 text-[10px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <div className="font-mono text-xl text-white/90">{value}</div>
      {detail && <div className="font-mono text-xs text-accent mt-0.5">{detail}</div>}
    </div>
  );
}

function SortButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-150 ${
        active
          ? 'bg-accent/[0.1] text-accent border border-accent/20'
          : 'text-white/35 hover:text-white/55 hover:bg-white/[0.04]'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="card py-20 flex flex-col items-center gap-4">
      <div className="text-5xl opacity-30">🏓</div>
      <div className="text-white/30 font-body text-sm">No matches played yet.</div>
      <Link to="/register" className="btn-primary mt-2">Register Match</Link>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="h-8 w-48 bg-white/[0.06] rounded animate-pulse mb-6 md:mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white/[0.04] rounded-xl animate-pulse" />)}
      </div>
      <div className="card h-64 animate-pulse" />
    </div>
  );
}

function PageError({ message }) {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="card p-6 border-loss/20 bg-loss/[0.05]">
        <div className="text-loss text-sm font-mono">{message}</div>
      </div>
    </div>
  );
}
