import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function HeadToHead() {
  const [players, setPlayers] = useState([]);
  const [p1Id, setP1Id] = useState('');
  const [p2Id, setP2Id] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getPlayers().then(setPlayers);
  }, []);

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
  const total = data ? data.matches.length : 0;
  const p1WinPct = total > 0 ? Math.round((data.p1wins / total) * 100) : 50;
  const p2WinPct = total > 0 ? Math.round((data.p2wins / total) * 100) : 50;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-white tracking-wide">Head 2 Head</h1>
        <p className="text-white/35 text-sm font-body mt-1">Compare two players' direct match history</p>
      </div>

      {/* Player selectors */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-end">
          <div>
            <label className="label">Player 1</label>
            <div className="relative">
              <select className="select pr-8" value={p1Id} onChange={e => setP1Id(e.target.value)}>
                <option value="">Select player...</option>
                {players.filter(p => p.id != p2Id).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            </div>
          </div>
          <div className="vs-divider pb-6">VS</div>
          <div>
            <label className="label">Player 2</label>
            <div className="relative">
              <select className="select pr-8" value={p2Id} onChange={e => setP2Id(e.target.value)}>
                <option value="">Select player...</option>
                {players.filter(p => p.id != p1Id).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="h-36 bg-white/[0.04] rounded-xl animate-pulse" />
          <div className="h-48 bg-white/[0.04] rounded-xl animate-pulse" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card p-4 border-loss/20 bg-loss/[0.05]">
          <p className="text-loss text-xs font-mono">{error}</p>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-5">
          {/* Stats comparison */}
          <div className="card p-5">
            {/* Names & overall wins */}
            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center mb-5">
              <div>
                <Link to={`/players/${p1?.id}`} className="font-display text-2xl text-white hover:text-accent transition-colors tracking-wide block truncate">
                  {p1?.name}
                </Link>
                <div className="text-white/30 text-xs font-mono">MMR {p1?.mmr}</div>
              </div>
              <div className="text-white/20 text-xs font-mono uppercase tracking-widest text-center">
                {total} {total === 1 ? 'match' : 'matches'}
              </div>
              <div className="text-right">
                <Link to={`/players/${p2?.id}`} className="font-display text-2xl text-white hover:text-accent transition-colors tracking-wide block truncate">
                  {p2?.name}
                </Link>
                <div className="text-white/30 text-xs font-mono text-right">MMR {p2?.mmr}</div>
              </div>
            </div>

            {total === 0 ? (
              <div className="text-center py-4 text-white/25 text-sm font-body">No matches between these players yet</div>
            ) : (
              <>
                {/* Win bar */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className={data.p1wins > data.p2wins ? 'text-accent' : 'text-white/40'}>{data.p1wins}W</span>
                    <span className="text-white/25">Wins</span>
                    <span className={data.p2wins > data.p1wins ? 'text-accent' : 'text-white/40'}>{data.p2wins}W</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.05]">
                    <div
                      className="bg-accent transition-all duration-700"
                      style={{ width: `${p1WinPct}%` }}
                    />
                    <div
                      className="bg-purple transition-all duration-700"
                      style={{ width: `${p2WinPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-white/25">
                    <span>{p1WinPct}%</span>
                    <span>{p2WinPct}%</span>
                  </div>
                </div>

                {/* Points */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/[0.06]">
                  <div className="text-center">
                    <div className="mmr-display text-xl text-accent/80">{data.p1PointsScored}</div>
                    <div className="text-white/25 text-[10px] font-mono">P1 Points</div>
                  </div>
                  <div className="text-center">
                    <div className="mmr-display text-xl text-white/20">—</div>
                    <div className="text-white/25 text-[10px] font-mono">Direct Pts</div>
                  </div>
                  <div className="text-center">
                    <div className="mmr-display text-xl text-purple/80">{data.p2PointsScored}</div>
                    <div className="text-white/25 text-[10px] font-mono">P2 Points</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Match history */}
          {data.matches.length > 0 && (
            <div>
              <h2 className="font-display text-2xl text-white tracking-wide mb-3">Match History</h2>
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-5 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">Date</th>
                      <th className="text-center px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">Score</th>
                      <th className="text-center px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">Winner</th>
                      <th className="text-right px-5 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">MMR Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.matches.map((m, i) => {
                      const p1IsA = m.player_a_id == p1Id;
                      const p1Score = p1IsA ? m.score_a : m.score_b;
                      const p2Score = p1IsA ? m.score_b : m.score_a;
                      const p1Won = p1Score > p2Score;
                      const p1Delta = p1IsA ? m.mmr_delta_a : m.mmr_delta_b;
                      const p2Delta = p1IsA ? m.mmr_delta_b : m.mmr_delta_a;

                      return (
                        <tr
                          key={m.id}
                          className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors table-row-anim"
                          style={{ animationDelay: `${i * 25}ms` }}
                        >
                          <td className="px-5 py-3.5 text-white/30 text-xs font-mono">
                            {new Date(m.played_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono text-sm text-white/60">
                            <span className={p1Won ? 'text-accent' : 'text-white/40'}>{p1Score}</span>
                            <span className="text-white/20"> – </span>
                            <span className={!p1Won ? 'text-purple' : 'text-white/40'}>{p2Score}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                              p1Won
                                ? 'text-accent bg-accent/10 border-accent/20'
                                : 'text-purple bg-purple/10 border-purple/20'
                            }`}>
                              {p1Won ? p1?.name : p2?.name}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="text-right space-y-0.5">
                              <div className={`font-mono text-xs ${p1Delta > 0 ? 'text-accent' : 'text-loss'}`}>
                                {p1?.name?.split(' ')[0]}: {p1Delta > 0 ? '+' : ''}{p1Delta}
                              </div>
                              <div className={`font-mono text-xs ${p2Delta > 0 ? 'text-accent' : 'text-loss'}`}>
                                {p2?.name?.split(' ')[0]}: {p2Delta > 0 ? '+' : ''}{p2Delta}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty prompt */}
      {!p1Id && !p2Id && (
        <div className="card py-16 flex flex-col items-center gap-3">
          <div className="text-4xl opacity-30">⚔️</div>
          <div className="text-white/30 text-sm font-body">Select two players to compare</div>
        </div>
      )}
    </div>
  );
}

function ChevronDown({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
