import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getPlayers()
      .then(setPlayers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const bestDiff = players.find(p => p.badges?.bestDiff);
  const onFire = players.find(p => p.badges?.onFire);
  const badStreak = players.find(p => p.badges?.badStreak);

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} />;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="font-display text-3xl md:text-4xl text-white tracking-wide">Rankings</h1>
        <p className="text-white/35 text-sm font-body mt-1">
          {players.length} active player{players.length !== 1 ? 's' : ''} · Sorted by MMR
        </p>
      </div>

      {/* Badge cards */}
      {(bestDiff || onFire || badStreak) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <BadgeCard
            icon="🏰"
            title="El Muro"
            subtitle="Best Differential"
            player={bestDiff}
            stat={bestDiff ? `+${bestDiff.diff} pts` : null}
            color="accent"
          />
          <BadgeCard
            icon="🔥"
            title="On Fire"
            subtitle="Win Streak"
            player={onFire}
            stat={onFire ? `${onFire.current_win_streak} in a row` : null}
            color="fire"
          />
          <BadgeCard
            icon="❄️"
            title="Cold Spell"
            subtitle="Loss Streak"
            player={badStreak}
            stat={badStreak ? `${badStreak.current_loss_streak} in a row` : null}
            color="loss"
          />
        </div>
      )}

      {/* Ranking table */}
      {players.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-0">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-3 md:px-5 py-3 text-white/30 text-xs font-mono uppercase tracking-widest w-10 md:w-12">#</th>
                <th className="text-left px-3 md:px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">Player</th>
                <th className="text-right px-3 md:px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">MMR</th>
                <th className="text-right px-3 md:px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">W</th>
                <th className="text-right px-3 md:px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">L</th>
                <th className="hidden md:table-cell text-right px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">W%</th>
                <th className="hidden md:table-cell text-right px-4 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">Diff</th>
                <th className="text-right px-3 md:px-5 py-3 text-white/30 text-xs font-mono uppercase tracking-widest">Streak</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, i) => (
                <tr
                  key={player.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group table-row-anim"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {/* Rank */}
                  <td className="px-3 md:px-5 py-3.5">
                    <span className={`rank-num text-lg md:text-xl ${i === 0 ? 'text-accent' : i === 1 ? 'text-white/50' : i === 2 ? 'text-fire/70' : 'text-white/25'}`}>
                      {player.rank}
                    </span>
                  </td>

                  {/* Player name + badges */}
                  <td className="px-3 md:px-4 py-3.5">
                    <div className="flex items-center gap-1.5 md:gap-2.5">
                      <Link
                        to={`/players/${player.id}`}
                        className="font-body font-medium text-white/85 hover:text-accent transition-colors text-sm group-hover:text-white truncate max-w-[100px] md:max-w-none"
                      >
                        {player.name}
                      </Link>
                      <div className="flex gap-1 flex-shrink-0">
                        {player.badges?.bestDiff && <MicroBadge label="🏰" title="El Muro – Best Differential" color="accent" />}
                        {player.badges?.onFire && <MicroBadge label="🔥" title="On Fire – Win Streak" color="fire" />}
                        {player.badges?.badStreak && <MicroBadge label="❄️" title="Cold Spell – Loss Streak" color="loss" />}
                      </div>
                    </div>
                  </td>

                  {/* MMR */}
                  <td className="px-3 md:px-4 py-3.5 text-right">
                    <span className="mmr-display text-white/90 text-sm">{player.mmr}</span>
                  </td>

                  {/* Wins */}
                  <td className="px-3 md:px-4 py-3.5 text-right">
                    <span className="font-mono text-accent/80 text-sm">{player.wins}</span>
                  </td>

                  {/* Losses */}
                  <td className="px-3 md:px-4 py-3.5 text-right">
                    <span className="font-mono text-loss/70 text-sm">{player.losses}</span>
                  </td>

                  {/* Win % — hidden on mobile */}
                  <td className="hidden md:table-cell px-4 py-3.5 text-right">
                    <span className="font-mono text-white/45 text-sm">{player.win_pct}%</span>
                  </td>

                  {/* Diff — hidden on mobile */}
                  <td className="hidden md:table-cell px-4 py-3.5 text-right">
                    <span className={`font-mono text-sm ${player.diff >= 0 ? 'text-accent/70' : 'text-loss/70'}`}>
                      {player.diff >= 0 ? '+' : ''}{player.diff}
                    </span>
                  </td>

                  {/* Streak */}
                  <td className="px-3 md:px-5 py-3.5 text-right">
                    <StreakBadge wins={player.current_win_streak} losses={player.current_loss_streak} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BadgeCard({ icon, title, subtitle, player, stat, color }) {
  const colorMap = {
    accent: { border: 'border-accent/20', bg: 'bg-accent/[0.05]', text: 'text-accent', pulse: 'badge-pulse' },
    fire: { border: 'border-fire/20', bg: 'bg-fire/[0.05]', text: 'text-fire', pulse: 'badge-fire-pulse' },
    loss: { border: 'border-loss/20', bg: 'bg-loss/[0.05]', text: 'text-loss', pulse: 'badge-loss-pulse' },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 ${player ? c.pulse : 'opacity-30'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <div>
          <div className={`text-xs font-mono font-medium uppercase tracking-widest ${c.text}`}>{title}</div>
          <div className="text-white/25 text-[10px] font-body">{subtitle}</div>
        </div>
      </div>
      {player ? (
        <>
          <Link to={`/players/${player.id}`} className={`font-body font-semibold text-base text-white hover:${c.text} transition-colors`}>
            {player.name}
          </Link>
          <div className={`font-mono text-xs mt-0.5 ${c.text}`}>{stat}</div>
        </>
      ) : (
        <div className="text-white/20 text-sm font-body">No data yet</div>
      )}
    </div>
  );
}

function MicroBadge({ label, title, color }) {
  const colors = { accent: 'bg-accent/10 border-accent/20', fire: 'bg-fire/10 border-fire/20', loss: 'bg-loss/10 border-loss/20' };
  return (
    <span title={title} className={`inline-flex items-center justify-center w-5 h-5 rounded border text-[10px] ${colors[color]}`}>
      {label}
    </span>
  );
}

function StreakBadge({ wins, losses }) {
  if (wins >= 2) {
    return <span className="font-mono text-xs text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded">{wins}W</span>;
  }
  if (losses >= 2) {
    return <span className="font-mono text-xs text-loss bg-loss/10 border border-loss/20 px-2 py-0.5 rounded">{losses}L</span>;
  }
  return <span className="text-white/20 text-xs font-mono">—</span>;
}

function EmptyState() {
  return (
    <div className="card py-20 flex flex-col items-center gap-4">
      <div className="text-5xl opacity-30">🏓</div>
      <div className="text-white/30 font-body text-sm">No players yet. Add some from the Players page.</div>
      <Link to="/players" className="btn-primary mt-2">Add Players</Link>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="h-8 w-40 bg-white/[0.06] rounded animate-pulse mb-6 md:mb-8" />
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
