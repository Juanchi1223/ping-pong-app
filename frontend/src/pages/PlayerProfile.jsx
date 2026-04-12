import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function PlayerProfile() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getPlayer(id), api.getPlayerMatches(id)])
      .then(([p, m]) => { setPlayer(p); setMatches(m); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (error || !player) return <PageError message={error || 'Player not found'} />;

  const diff = player.points_scored - player.points_conceded;
  const totalGames = player.wins + player.losses;
  const winPct = totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-white/30 text-xs font-mono mb-6">
        <Link to="/players" className="hover:text-white/60 transition-colors">Players</Link>
        <span>/</span>
        <span className="text-white/60">{player.name}</span>
      </div>

      {/* Player header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-4xl text-white tracking-wide">{player.name}</h1>
            <div className="text-white/30 text-xs font-mono mt-1">
              Member since {new Date(player.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="text-right">
            <div className="mmr-display text-4xl text-accent">{player.mmr}</div>
            <div className="text-white/30 text-[10px] font-mono uppercase tracking-widest">MMR</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-5 gap-4">
          <StatCell label="Wins" value={player.wins} color="accent" />
          <StatCell label="Losses" value={player.losses} color="loss" />
          <StatCell label="Win %" value={`${winPct}%`} />
          <StatCell label="Diff" value={`${diff >= 0 ? '+' : ''}${diff}`} color={diff >= 0 ? 'accent' : 'loss'} />
          <StatCell label="Games" value={totalGames} />
        </div>

        {/* Streak indicator */}
        {(player.current_win_streak >= 2 || player.current_loss_streak >= 2) && (
          <div className="mt-5 pt-5 border-t border-white/[0.06] flex items-center gap-3">
            {player.current_win_streak >= 2 && (
              <div className="flex items-center gap-2 text-accent">
                <span className="text-lg">🔥</span>
                <span className="font-mono text-sm font-medium">{player.current_win_streak} win streak</span>
              </div>
            )}
            {player.current_loss_streak >= 2 && (
              <div className="flex items-center gap-2 text-loss">
                <span className="text-lg">❄️</span>
                <span className="font-mono text-sm font-medium">{player.current_loss_streak} loss streak</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Match history */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-white tracking-wide">Match History</h2>
          <span className="text-white/30 text-xs font-mono">{matches.length} matches</span>
        </div>

        {matches.length === 0 ? (
          <div className="card py-12 flex flex-col items-center gap-3">
            <div className="text-3xl opacity-30">📋</div>
            <div className="text-white/30 text-sm font-body">No matches played yet</div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-5 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">Date</th>
                  <th className="text-left px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">Opponent</th>
                  <th className="text-center px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">Score</th>
                  <th className="text-center px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">Result</th>
                  <th className="text-right px-5 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">MMR Δ</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => {
                  const isA = m.player_a_id == id;
                  const myScore = isA ? m.score_a : m.score_b;
                  const oppScore = isA ? m.score_b : m.score_a;
                  const myDelta = isA ? m.mmr_delta_a : m.mmr_delta_b;
                  const won = myScore > oppScore;
                  const oppName = isA ? m.player_b_name : m.player_a_name;
                  const oppId = isA ? m.player_b_id : m.player_a_id;

                  return (
                    <tr
                      key={m.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors table-row-anim"
                      style={{ animationDelay: `${i * 25}ms` }}
                    >
                      <td className="px-5 py-3.5 text-white/30 text-xs font-mono">
                        {new Date(m.played_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link to={`/players/${oppId}`} className="text-sm text-white/70 hover:text-accent transition-colors font-body">
                          {oppName}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono text-sm text-white/60">{myScore} – {oppScore}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {won
                          ? <span className="text-xs font-mono text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded">WIN</span>
                          : <span className="text-xs font-mono text-loss bg-loss/10 border border-loss/20 px-2 py-0.5 rounded">LOSS</span>
                        }
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`font-mono text-sm font-medium ${myDelta > 0 ? 'text-accent' : 'text-loss'}`}>
                          {myDelta > 0 ? '+' : ''}{myDelta}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCell({ label, value, color }) {
  const colorMap = { accent: 'text-accent', loss: 'text-loss' };
  return (
    <div className="bg-raised rounded-lg px-3 py-3">
      <div className={`mmr-display text-xl ${color ? colorMap[color] : 'text-white/80'}`}>{value}</div>
      <div className="text-white/25 text-[10px] font-mono uppercase tracking-widest mt-0.5">{label}</div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="h-32 bg-white/[0.04] rounded-xl animate-pulse mb-6" />
      <div className="h-64 bg-white/[0.04] rounded-xl animate-pulse" />
    </div>
  );
}

function PageError({ message }) {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="card p-6 border-loss/20 bg-loss/[0.05]">
        <div className="text-loss text-sm font-mono">{message}</div>
        <Link to="/players" className="btn-ghost mt-4 inline-block text-xs">← Back to Players</Link>
      </div>
    </div>
  );
}
