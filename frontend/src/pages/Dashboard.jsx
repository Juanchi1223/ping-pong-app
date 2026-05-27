import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useRealtimeRankings } from '../hooks/useRealtimeRankings';
import PageHeader from '../components/ui/PageHeader';
import BadgeStrip from '../components/ui/BadgeStrip';
import Podium from '../components/ui/Podium';
import RankingTable from '../components/ui/RankingTable';
import LiveIndicator from '../components/common/LiveIndicator';
import EmptyState from '../components/common/EmptyState';
import { PageLoader, PageError } from '../components/common/Loader';

function deriveBadges(players) {
  const bestDiff = players.find(p => p.badges?.bestDiff);
  const onFire   = players.find(p => p.badges?.onFire);
  const badStreak = players.find(p => p.badges?.badStreak);
  return {
    wall: bestDiff ? { player: bestDiff, stat: `+${bestDiff.diff} pts` } : null,
    fire: onFire   ? { player: onFire,   stat: `${onFire.current_win_streak} consecutive` } : null,
    cold: badStreak ? { player: badStreak, stat: `${badStreak.current_loss_streak} consecutive` } : null,
  };
}

function buildBadgesMap(players) {
  const out = {};
  players.forEach(p => {
    if (p.badges?.bestDiff) out.wall = p.id;
    if (p.badges?.onFire)   out.fire = p.id;
    if (p.badges?.badStreak) out.cold = p.id;
  });
  return out;
}

export default function Dashboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getPlayers()
      .then(setPlayers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const { data: liveRankings, connected } = useRealtimeRankings();
  useEffect(() => { if (liveRankings) setPlayers(liveRankings); }, [liveRankings]);

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} />;

  if (players.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <EmptyState message="No players yet. Add some from the Players page." />
      </div>
    );
  }

  const badges = deriveBadges(players);
  const badgesMap = buildBadgesMap(players);
  const top3 = players.slice(0, 3);
  const tail = players.slice(3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        eyebrow="LEADERBOARD · SEASON 1"
        title="PingPongZS"
        sub={`${players.length} active players · sorted by MMR`}
        right={<LiveIndicator on={connected} />}
      />

      <div className="scrollarea" style={{ flex: 1 }}>
        <BadgeStrip badges={badges} />

        {/* Desktop table */}
        <div className="hidden md:block" style={{ padding: '16px 24px 24px' }}>
          <RankingTable
            players={players}
            variant="desktop"
            badges={badgesMap}
            onOpenPlayer={id => navigate(`/players/${id}`)}
          />
        </div>

        {/* Mobile: podium + challengers */}
        <div className="md:hidden">
          <Podium top3={top3} onPick={id => navigate(`/players/${id}`)} />

          <div style={{ padding: '12px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="label-eyebrow">CHALLENGERS</div>
            <div className="label-eyebrow" style={{ color: 'var(--text-3)' }}>MMR · W-L · STK</div>
          </div>

          <RankingTable
            players={tail}
            variant="mobile"
            podium
            badges={badgesMap}
            onOpenPlayer={id => navigate(`/players/${id}`)}
          />
        </div>
      </div>
    </div>
  );
}
